import { activeMsa } from "@/lib/agreements";
import { resolveOrderItems } from "@/lib/work-resolve";
import { assertLineAllowed, defaultPaymentEvent, styleForLine, styleForLines, StyleError } from "@/lib/work-order-styles";
import type { WorkOrderStyle } from "@prisma/client";
import { nextNumber, PREFIX } from "@/lib/numbering";
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
import { descriptionRequired, requisitionForJob } from "@/lib/requisition";
import { completenessFor, completenessMessage } from "@/lib/work-request-lines";

export type OrderFromRequisition = {
  workRequestId: string;
  externalRef?: string | null;
  /** The buyer's statement of work (run 13). */
  sowText?: string | null;
  /** The Job was sole-sourced (commission kind). */
  soleSourced?: boolean;
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

// JW-E005: Submit — complete check → SUBMITTED → APPROVED (automatic in R1) → one Work Order per seller → ORDERED.
export async function submitWorkRequest(
  viewer: Viewer,
  input: OrderFromRequisition & { description?: string | null },
  origin: WorkOrderOrigin = "INDIRECT"
): Promise<BuiltOrder[]> {
  const me = await ownPerson(viewer);
  const head = await prisma.workRequest.findUnique({ where: { id: input.workRequestId }, select: { buyer_person_id: true, p_account_id: true, status: true, description: true } });
  if (!head || head.buyer_person_id !== me.id) throw new SourcingError("That request isn't available.", "NOT_FOUND");
  if (!["INCOMPLETE", "RETURNED", "SUBMITTED", "APPROVED", "ASSIGNED", "DRAFT", "POSTED"].includes(head.status)) throw new SourcingError("This request can't be submitted now.", head.status === "ORDERED" ? "ALREADY_ORDERED" : "CANCELLED");
  const description = input.description !== undefined ? input.description?.trim() || null : head.description;
  if (!description && (await descriptionRequired(head.p_account_id))) throw new SourcingError("Add a description before you submit.", "NO_DESCRIPTION");
  const lines = await prisma.workRequestLine.findMany({ where: { work_request_id: input.workRequestId, work_order_id: null }, select: { line_number: true, description: true, provider_person_id: true, transaction_type: true, unit_price_cents: true, amount_cents: true } });
  const c = completenessFor(lines);
  if (!c.complete) throw new SourcingError(completenessMessage(c), "INCOMPLETE");
  const now = new Date();
  await prisma.workRequestLine.updateMany({ where: { work_request_id: input.workRequestId, work_order_id: null }, data: { status: "ASSIGNED" } });
  await prisma.workRequest.update({ where: { id: input.workRequestId }, data: { description, status: "SUBMITTED", submitted_at: now } });
  await approveWorkRequest(input.workRequestId);
  return buildWorkOrders(viewer, input, origin);
}

/** WA-E001: the approval hook. No approval rules yet, so a submitted Work Request is approved at once — routing goes here later. */
export async function approveWorkRequest(workRequestId: string) {
  await prisma.workRequest.update({ where: { id: workRequestId }, data: { status: "APPROVED", approved_at: new Date(), approval_note: "Auto-approved (no approval rules)", approval_status: "APPROVED", approval_channel: "PANAMEER" } });
}

async function buildWorkOrders(
  viewer: Viewer,
  input: OrderFromRequisition,
  origin: WorkOrderOrigin
): Promise<BuiltOrder[]> {
  const me = await ownPerson(viewer);

  const wr = await prisma.workRequest.findUnique({
    where: { id: input.workRequestId },
    select: {
      id: true,
      buyer_person_id: true,
      p_account_id: true,
      status: true,
      currency: true,
      description: true,
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
          payment_event: true,
          billing_cycle: true,
          overtime_allowed: true,
          overtime_multiplier: true,
          expenses_allowed: true,
          expenses_cap_cents: true,
        },
      },
    },
  });
  if (!wr) throw new SourcingError("That request isn't available.", "NOT_FOUND");
  const assignedTo = wr.lines.find((l) => l.provider_person_id)?.provider_person_id;
  if (assignedTo) await assertCanSign(me.id, wr.buyer_person_id, assignedTo);
  if (wr.buyer_person_id !== me.id) {
    throw new SourcingError("Only the buyer can order this work.", "NOT_BUYER");
  }
  if (wr.status === "CANCELLED") {
    throw new SourcingError("This request was cancelled.", "CANCELLED");
  }

  if (wr.status === "ORDERED" || wr.lines.some((l) => l.work_order_id != null)) {
    throw new SourcingError(
      "An order has already been created from this request.",
      "ALREADY_ORDERED"
    );
  }

  if (wr.lines.length === 0) {
    throw new SourcingError(
      "Select a provider before creating the order.",
      "NOTHING_ASSIGNED"
    );
  }

  const providerIds = [...new Set(wr.lines.map((l) => l.provider_person_id).filter((x): x is string => !!x))];
  if (providerIds.length === 0) {
    throw new SourcingError("No provider is on this request.", "NO_PROVIDER");
  }
  // WS-E002: one Work Order per seller per style (T&M · Fixed Price · Product · Retainer).
  const subs = new Set((await prisma.serviceProduct.findMany({ where: { id: { in: wr.lines.map((l) => l.service_product_id).filter((x): x is string => !!x) }, pricing_type: "RECURRING" }, select: { id: true } })).map((p) => p.id));
  const styleOf = (l: (typeof wr.lines)[number]) => styleForLine({ ...l, recurringProduct: !!l.service_product_id && subs.has(l.service_product_id) });
  const out: BuiltOrder[] = [];
  for (const providerPersonId of providerIds) {
    const mine = wr.lines.filter((l) => l.provider_person_id === providerPersonId);
    for (const style of [...new Set(mine.map(styleOf))]) {
      out.push(await buildOne({ ...wr, sole_sourced: input.soleSourced }, mine.filter((l) => styleOf(l) === style), providerPersonId, input, origin, style));
    }
  }
  await prisma.workRequest.update({ where: { id: wr.id }, data: { status: "ORDERED", style: styleForLines(wr.lines.map((l) => ({ ...l, recurringProduct: !!l.service_product_id && subs.has(l.service_product_id) }))) } });
  return out;
}

type ReqForOrder = { id: string; buyer_person_id: string; p_account_id: string; currency: string; description: string | null; sole_sourced?: boolean };
type ReqLine = Awaited<ReturnType<typeof prisma.workRequestLine.findMany<{ select: { id: true; line_number: true; transaction_type: true; description: true; unspsc_code: true; uom: true; quantity: true; unit_price_cents: true; amount_cents: true; supplier_part_id: true; service_product_id: true; provider_service_id: true; provider_person_id: true; service_start: true; service_end: true; work_order_id: true; payment_event: true; billing_cycle: true; overtime_allowed: true; overtime_multiplier: true; expenses_allowed: true; expenses_cap_cents: true } }>>>[number];

async function buildOne(wr: ReqForOrder, lines: ReqLine[], providerPersonId: string, input: OrderFromRequisition, origin: WorkOrderOrigin, style: WorkOrderStyle): Promise<BuiltOrder> {
  for (const l of lines) {
    try { assertLineAllowed(style, l); } catch (e) { if (e instanceof StyleError) throw new SourcingError(e.message, "STYLE_LINE"); throw e; }
  }

  const lineFees = new Map<string, number>();
  for (const l of lines) {
    const kind = sourcingKindForLine({
      soleSourced: !!wr.sole_sourced,
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

  const orderNumber = await nextNumber(PREFIX.WORK_ORDER, { pAccountId: wr.p_account_id });
  const msaId = (await activeMsa()).id;

  // THE ORDER, ITS LINES AND THE REQUISITION'S STATUS MOVE IN ONE
  const built = await prisma.$transaction(async (tx) => {
    const order = await tx.workOrder.create({
      data: {
        order_number: orderNumber,
        style,
        // MS-E002: every Work Order is a SOW under the Active MSA.
        agreement_id: msaId,
        /* THE ONE FIELD THAT DIFFERS BETWEEN THE DOORS. */
        origin,
        work_request_id: wr.id,
        buyer_person_id: wr.buyer_person_id,
        p_account_id: wr.p_account_id,
        provider_person_id: providerPersonId,
        currency: wr.currency,
        description: wr.description,
        erp_po_number: origin === "DIRECT" ? input.externalRef?.trim() || null : null,
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
            // HS-E005: the Terms the buyer confirmed win over the listing's.
            ...(l.payment_event ? { payment_event: l.payment_event } : {}),
            ...(l.billing_cycle ? { billing_cycle: l.billing_cycle } : {}),
            // WS-E003: a line type always settles on its Payment Event (Service – Rate → Timesheet, Fixed Price → Payment Request, Product → Acceptance).
            ...(!l.payment_event && !lineTerms.get(l.id)?.payment_event ? { payment_event: defaultPaymentEvent(l.transaction_type) } : {}),
            overtime_allowed: l.overtime_allowed,
            overtime_multiplier: l.overtime_multiplier,
            expenses_allowed: l.expenses_allowed,
            expenses_cap_cents: l.expenses_cap_cents,
          })),
        },
      },
      select: { id: true, order_number: true, origin: true },
    });

    await tx.workRequestLine.updateMany({
      where: { id: { in: lines.map((l) => l.id) } },
      /* Scott's WR_LINE line status: *"Sourced = used to create a WO."* */
      data: { status: "ORDERED", work_order_id: order.id },
    });

    return order;
  });

  await snapshotMilestones(built.id);
  // WA-E002: the buyer accepts first — only they hear now; the provider is asked once the buyer has accepted.
  const provider = await prisma.person.findUnique({ where: { id: providerPersonId }, select: { first_name: true, last_name: true } });
  await notify({
    event: "work.order_created",
    personId: wr.buyer_person_id,
    entityType: "work_order",
    entityId: built.id,
    dedupeKey: `work.order_created:${built.id}`,
    vars: { orderId: built.id, orderNumber: built.order_number, providerName: provider ? `${provider.first_name} ${provider.last_name}`.trim() : "the provider" },
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
  const products = new Map((await prisma.serviceProduct.findMany({ where: { id: { in: productIds } }, select: { id: true, payment_terms: true, payment_event: true } })).map((p) => [p.id, p]));
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
      out.set(l.id, { provider_service_id: null, billing_cycle: null, payment_terms: p?.payment_terms ?? d.payment_terms, payment_event: p?.payment_event ?? d.payment_event });
      continue;
    }
    const svc = services.find((s) => s.id === l.provider_service_id) ?? services.find((s) => s.service_type === l.transaction_type);
    out.set(l.id, svc ? { provider_service_id: svc.id, billing_cycle: svc.billing_cycle, payment_terms: svc.payment_terms, payment_event: svc.payment_event } : { provider_service_id: null, ...defaultTerms(l.transaction_type, false) });
  }
  return out;
}

/** DOOR 1 — Hire on a Job: its requisition is submitted; the Job is FILLED. `jobId` is the Job's id. */
export async function hire(
  viewer: Viewer,
  input: { jobId: string; sowText?: string | null; description?: string }
): Promise<BuiltOrder> {
  const req = await requisitionForJob(input.jobId);
  const job = await prisma.job.findUnique({ where: { id: input.jobId }, select: { sole_sourced: true } });
  const [order] = await submitWorkRequest(viewer, { workRequestId: req.id, sowText: input.sowText, soleSourced: job?.sole_sourced, description: input.description });
  await prisma.job.update({ where: { id: input.jobId }, data: { status: "FILLED" } });
  return order!;
}

/** DOOR 2 — THE ERP RETURNS A PO. The terms were approved in the buyer's */
export async function acceptPurchaseOrder(
  viewer: Viewer,
  input: { workRequestId: string; poNumber: string }
): Promise<BuiltOrder[]> {
  if (!input.poNumber.trim()) {
    throw new SourcingError("A purchase order needs its number.", "NO_PO_NUMBER");
  }
  return submitWorkRequest(viewer, { workRequestId: input.workRequestId, externalRef: input.poNumber }, "DIRECT");
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
  if (!order) throw new SourcingError("That order isn't yours.", "NOT_FOUND");
  // ONLY BEFORE ACCEPTING. Once a provider has accepted the terms the order is
  if (order.status !== "ISSUED") {
    throw new SourcingError(
      "This order can no longer be declined.",
      "NOT_DECLINABLE"
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.workOrder.update({
      where: { id: order.id },
      data: { status: "CANCELLED" },
    });
    const req = await tx.workRequest.findUnique({ where: { id: order.work_request_id }, select: { job_id: true } });
    // Lines on the declined order go back to the requisition; a Job's proposals reopen.
    await tx.workRequestLine.updateMany({
      where: { work_order_id: order.id },
      data: { provider_person_id: req?.job_id ? null : undefined, status: req?.job_id ? "SOURCING" : "DRAFT", work_order_id: null },
    });
    await tx.workRequest.update({ where: { id: order.work_request_id }, data: { status: "INCOMPLETE" } });
    if (req?.job_id) {
      /* The declining provider's own proposal records the refusal. */
      await tx.proposal.updateMany({
        where: {
          job_id: req.job_id,
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
          job_id: req.job_id,
          provider_person_id: { not: me.id },
          status: { in: ["NOT_SELECTED", "AWARDED", "SHORTLISTED"] },
        },
        data: { status: "SUBMITTED" },
      });
      await tx.job.update({ where: { id: req.job_id }, data: { status: "OPEN" } });
    }
  });

  // WA-E004: the buyer hears it, with the reason; the Job is open again.
  const head = await prisma.workOrder.findUnique({ where: { id: order.id }, select: { order_number: true, buyer_person_id: true, workRequest: { select: { job_id: true } } } });
  const who = await prisma.person.findUnique({ where: { id: me.id }, select: { first_name: true, last_name: true } });
  if (head) await notify({ event: "work.order_declined", personId: head.buyer_person_id, entityType: "work_order", entityId: order.id, dedupeKey: `work.order_declined:${order.id}`, vars: { orderNumber: head.order_number, providerName: who ? `${who.first_name} ${who.last_name}`.trim() : "The provider", reason: reason?.trim() ? `Reason: ${reason.trim()}` : "", jobId: head.workRequest.job_id ?? "" } });
  // X-E005: an ERP order's rejection goes back to the ERP as a ConfirmationRequest.
  if (order.erp_connection_id) await queueConfirmation(order.id, "reject", reason?.trim() || null);
  // The provider's own worklist item goes — they answered it. Resolved
  await prisma.notification
    .updateMany({
      where: { dedupe_key: `work.order_offered:${order.id}`, resolved_at: null },
      data: { resolved_at: new Date() },
    })
    .catch(() => {});
  await resolveOrderItems(orderId);
}
