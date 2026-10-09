import { assertCanSign } from "@/lib/your-path";
import { TransactionType, WorkOrderOrigin } from "@prisma/client";
import { defaultTerms, type LineTerms } from "@/lib/billing-terms";
import { prisma } from "@/lib/prisma";
import {
  resolveCommissionBps,
  sourcingKindForLine,
} from "@/lib/application-commissions";
import { SourcingError } from "@/lib/sourcing";
import { assertTransactionLineShape, pricedByQuantity } from "@/lib/transaction-spine";
import { notify } from "@/lib/notifications";
import { queueConfirmation } from "@/lib/erp/outbound";
import { snapshotMilestones } from "@/lib/order-milestones";
import type { Viewer } from "@/lib/access";

export type OrderFromRequisition = {
  workRequestId: string;
  externalRef?: string | null;
  /** The buyer's statement of work (run 13). */
  sowText?: string | null;
};

export type BuiltOrder = {
  id: string;
  orderNumber: string;
  origin: WorkOrderOrigin;
  lineCount: number;
  valueCents: number;
};

async function ownPerson(viewer: Viewer) {
  const person = await prisma.person.findUnique({
    where: { user_id: viewer.userId },
    select: { id: true },
  });
  if (!person) throw new SourcingError("No person for this account.", "NOT_FOUND");
  return person;
}

async function buildWorkOrder(
  viewer: Viewer,
  input: OrderFromRequisition,
  origin: WorkOrderOrigin
): Promise<BuiltOrder> {
  const me = await ownPerson(viewer);

  const wr = await prisma.workRequest.findUnique({
    where: { id: input.workRequestId },
    select: {
      id: true,
      buyer_person_id: true,
      p_account_id: true,
      status: true,
      currency: true,
      sole_sourced: true,
      lines: {
        where: { status: "ASSIGNED" },
        orderBy: { line_number: "asc" },
        select: {
          id: true,
          line_number: true,
          transaction_type: true,
          description: true,
          unspsc_code: true,
          uom: true,
          quantity: true,
          unit_price_cents: true,
          amount_cents: true,
          supplier_part_id: true,
          service_product_id: true,
          provider_service_id: true,
          provider_person_id: true,
          service_start: true,
          service_end: true,
          work_order_id: true,
        },
      },
    },
  });
  if (!wr) throw new SourcingError("That work request isn't available.", "NOT_FOUND");
  const assignedTo = wr.lines.find((l) => l.provider_person_id)?.provider_person_id;
  if (assignedTo) await assertCanSign(me.id, wr.buyer_person_id, assignedTo);
  if (wr.buyer_person_id !== me.id) {
    throw new SourcingError("Only the buyer can order this work.", "NOT_BUYER");
  }
  if (wr.status === "CANCELLED") {
    throw new SourcingError("This work request was cancelled.", "CANCELLED");
  }

  if (wr.status === "ORDERED" || wr.lines.some((l) => l.work_order_id != null)) {
    throw new SourcingError(
      "A work order has already been created from this work request.",
      "ALREADY_ORDERED"
    );
  }

  const lines = wr.lines;
  if (lines.length === 0) {
    throw new SourcingError(
      "Select a provider before creating the work order.",
      "NOTHING_ASSIGNED"
    );
  }

  const providerIds = [...new Set(lines.map((l) => l.provider_person_id).filter(Boolean))];
  if (providerIds.length === 0) {
    throw new SourcingError("No provider is on this work request.", "NO_PROVIDER");
  }
  if (providerIds.length > 1) {
    throw new SourcingError(
      "This work request names more than one provider, so it can't become a single work order.",
      "MANY_PROVIDERS"
    );
  }
  const providerPersonId = providerIds[0]!;

  const lineFees = new Map<string, number>();
  for (const l of lines) {
    const kind = sourcingKindForLine({
      soleSourced: wr.sole_sourced,
      supplierPartId: l.supplier_part_id,
      serviceProductId: l.service_product_id,
    });
    const resolved = await resolveCommissionBps(kind, l.transaction_type);
    lineFees.set(l.id, resolved.bps);
  }
  const lineTerms = await snapshotTerms(lines, providerPersonId);
  const distinct = [...new Set(lineFees.values())];
  const feeBps = distinct.length === 1 ? distinct[0]! : null;

  const starts = lines.map((l) => l.service_start).filter((d): d is Date => d != null);
  const ends = lines.map((l) => l.service_end).filter((d): d is Date => d != null);
  const periodStart = starts.length ? new Date(Math.min(...starts.map((d) => d.getTime()))) : null;
  const periodEnd = ends.length ? new Date(Math.max(...ends.map((d) => d.getTime()))) : null;

  let valueCents = 0;
  for (const l of lines) {
    assertTransactionLineShape({
      transaction_type: l.transaction_type,
      uom: l.uom,
      quantity: l.quantity == null ? null : Number(l.quantity),
      unit_price_cents: l.unit_price_cents,
      amount_cents: l.amount_cents,
    });
    valueCents += pricedByQuantity(l.transaction_type)
      ? Math.round(Number(l.quantity ?? 0) * (l.unit_price_cents ?? 0))
      : l.amount_cents ?? 0;
  }

  const orderNumber = `WO-${Date.now().toString(36).toUpperCase()}-${wr.id.slice(0, 4)}`;

  // THE ORDER, ITS LINES AND THE REQUISITION'S STATUS MOVE IN ONE
  const built = await prisma.$transaction(async (tx) => {
    const order = await tx.workOrder.create({
      data: {
        order_number: orderNumber,
        /* THE ONE FIELD THAT DIFFERS BETWEEN THE DOORS. */
        origin,
        work_request_id: wr.id,
        buyer_person_id: wr.buyer_person_id,
        p_account_id: wr.p_account_id,
        provider_person_id: providerPersonId,
        currency: wr.currency,
        // out of `ISSUED` (`canAcceptNow`), and there is no screen that issues a
        status: "ISSUED",
        period_start: periodStart,
        period_end: periodEnd,
        fee_bps: feeBps,
        // THE CAP, WHICH NOTHING HAS EVER WRITTEN WS-F)
        not_to_exceed_cents: valueCents,
        /* Recorded, never branched on. */
        external_ref: input.externalRef?.trim() || null,
        sow_text: input.sowText?.trim().slice(0, 20000) || null,
        lines: {
          create: lines.map((l) => ({
            line_number: l.line_number,
            // THE ORDER LINE POINTS BACK AT THE REQUISITION LINE IT CAME
            work_request_line_id: l.id,
            // COPIED, FIELD FOR FIELD, INCLUDING THE KIND (ruling 44).
            transaction_type: l.transaction_type,
            // THE STAMP. Resolved above, written here, never looked up
            fee_bps: lineFees.get(l.id)!,
            description: l.description,
            unspsc_code: l.unspsc_code,
            uom: l.uom,
            quantity: l.quantity,
            unit_price_cents: l.unit_price_cents,
            amount_cents: l.amount_cents,
            supplier_part_id: l.supplier_part_id,
            service_product_id: l.service_product_id,
            service_start: l.service_start,
            service_end: l.service_end,
            ...lineTerms.get(l.id)!,
          })),
        },
      },
      select: { id: true, order_number: true, origin: true },
    });

    // RULING 17'S OTHER HALF: creating the order moves the request's status
    await tx.workRequest.update({ where: { id: wr.id }, data: { status: "ORDERED" } });
    await tx.workRequestLine.updateMany({
      where: { work_request_id: wr.id, status: "ASSIGNED" },
      /* Scott's WR_LINE line status: *"Sourced = used to create a WO."* */
      data: { status: "ORDERED", work_order_id: order.id },
    });

    return order;
  });

  await snapshotMilestones(built.id);
  // THE PROVIDER IS TOLD, THROUGH THE EVENT THAT ALREADY EXISTS
  await notify({
    event: "work.order_offered",
    personId: providerPersonId,
    entityType: "work_order",
    entityId: built.id,
    dedupeKey: `work.order_offered:${built.id}`,
    vars: { orderId: built.id, requestTitle: "" },
  });

  return {
    id: built.id,
    orderNumber: built.order_number,
    origin: built.origin,
    lineCount: lines.length,
    valueCents,
  };
}

/** O-E004: each line's billing terms, copied from its provider service or service product (else the provider's matching service, else defaults). */
export async function snapshotTerms(
  lines: { id: string; transaction_type: TransactionType; service_product_id: string | null; provider_service_id: string | null }[],
  providerPersonId: string
): Promise<Map<string, LineTerms & { provider_service_id: string | null }>> {
  const productIds = lines.map((l) => l.service_product_id).filter((x): x is string => !!x);
  const products = new Map((await prisma.serviceProduct.findMany({ where: { id: { in: productIds } }, select: { id: true, payment_terms: true, payment_trigger: true } })).map((p) => [p.id, p]));
  const profile = await prisma.providerProfile.findUnique({ where: { person_id: providerPersonId }, select: { id: true } });
  const named = lines.map((l) => l.provider_service_id).filter((x): x is string => !!x);
  const services = await prisma.providerService.findMany({
    where: { OR: [{ id: { in: named } }, ...(profile ? [{ provider_profile_id: profile.id, active: true }] : [])] },
    orderBy: { sort_order: "asc" },
  });
  const out = new Map<string, LineTerms & { provider_service_id: string | null }>();
  for (const l of lines) {
    if (l.service_product_id) {
      const p = products.get(l.service_product_id);
      const d = defaultTerms(l.transaction_type, true);
      out.set(l.id, { provider_service_id: null, billing_cycle: null, payment_terms: p?.payment_terms ?? d.payment_terms, payment_trigger: p?.payment_trigger ?? d.payment_trigger });
      continue;
    }
    const svc = services.find((s) => s.id === l.provider_service_id) ?? services.find((s) => s.service_type === l.transaction_type);
    out.set(l.id, svc ? { provider_service_id: svc.id, billing_cycle: svc.billing_cycle, payment_terms: svc.payment_terms, payment_trigger: svc.payment_trigger } : { provider_service_id: null, ...defaultTerms(l.transaction_type, false) });
  }
  return out;
}

/** DOOR 1 — THE BUYER PRESSES HIRE. Panameer generated these terms, so it */
export async function hire(
  viewer: Viewer,
  input: { workRequestId: string; sowText?: string | null }
): Promise<BuiltOrder> {
  return buildWorkOrder(viewer, { workRequestId: input.workRequestId, sowText: input.sowText }, "INDIRECT");
}

/** DOOR 2 — THE ERP RETURNS A PO. The terms were approved in the buyer's */
export async function acceptPurchaseOrder(
  viewer: Viewer,
  input: { workRequestId: string; poNumber: string }
): Promise<BuiltOrder> {
  if (!input.poNumber.trim()) {
    throw new SourcingError("A purchase order needs its number.", "NO_PO_NUMBER");
  }
  return buildWorkOrder(
    viewer,
    { workRequestId: input.workRequestId, externalRef: input.poNumber },
    "DIRECT"
  );
}

/** THE PROVIDER DECLINES THE WORK ORDER — RULING 16 */
export async function declineWorkOrder(
  viewer: Viewer,
  orderId: string,
  reason?: string | null
): Promise<void> {
  const me = await ownPerson(viewer);

  const order = await prisma.workOrder.findFirst({
    where: { id: orderId, provider_person_id: me.id },
    select: { id: true, status: true, work_request_id: true, erp_connection_id: true },
  });
  if (!order) throw new SourcingError("That work order isn't yours.", "NOT_FOUND");
  // ONLY BEFORE ACCEPTING. Once a provider has accepted the terms the order is
  if (order.status !== "ISSUED") {
    throw new SourcingError(
      "This work order can no longer be declined.",
      "NOT_DECLINABLE"
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.workOrder.update({
      where: { id: order.id },
      data: { status: "CANCELLED" },
    });
    if (order.work_request_id) {
      /* The declining provider's own proposal records the refusal. */
      await tx.proposal.updateMany({
        where: {
          work_request_id: order.work_request_id,
          provider_person_id: me.id,
        },
        data: {
          status: "DECLINED",
          declined_at: new Date(),
          decline_reason: reason?.trim() || null,
        },
      });
      // AND EVERYONE ELSE IS BACK IN CONTENTION. `WITHDRAWN` and `DECLINED`
      await tx.proposal.updateMany({
        where: {
          work_request_id: order.work_request_id,
          provider_person_id: { not: me.id },
          status: { in: ["NOT_SELECTED", "AWARDED", "SHORTLISTED"] },
        },
        data: { status: "SUBMITTED" },
      });
      await tx.workRequestLine.updateMany({
        where: { work_request_id: order.work_request_id },
        data: { provider_person_id: null, status: "SOURCING", work_order_id: null },
      });
      await tx.workRequest.update({
        where: { id: order.work_request_id },
        data: { status: "POSTED" },
      });
    }
  });

  // X-E005: an ERP order's rejection goes back to the ERP as a ConfirmationRequest.
  if (order.erp_connection_id) await queueConfirmation(order.id, "reject", reason?.trim() || null);
  // The provider's own worklist item goes — they answered it. Resolved
  await prisma.notification
    .updateMany({
      where: { dedupe_key: `work.order_offered:${order.id}`, resolved_at: null },
      data: { resolved_at: new Date() },
    })
    .catch(() => {});
}
