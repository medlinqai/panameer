import { assertCanSign } from "@/lib/your-path";
import { WorkOrderOrigin } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  resolveCommissionBps,
  sourcingKindForLine,
} from "@/lib/application-commissions";
import { SourcingError } from "@/lib/sourcing";
import { assertTransactionLineShape, pricedByQuantity } from "@/lib/transaction-spine";
import { notify } from "@/lib/notifications";
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

  /*
    ⚠⚠⚠ THE ORDER, ITS LINES AND THE REQUISITION'S STATUS MOVE IN ONE
    TRANSACTION. ⚠ Without it a crash between the two leaves an order nobody can
    find from the request, or a request marked `ORDERED` with no order — and the
    second would block every retry.
  */
  const built = await prisma.$transaction(async (tx) => {
    const order = await tx.workOrder.create({
      data: {
        order_number: orderNumber,
        /* ⚠⚠ THE ONE FIELD THAT DIFFERS BETWEEN THE DOORS. */
        origin,
        work_request_id: wr.id,
        buyer_person_id: wr.buyer_person_id,
        p_account_id: wr.p_account_id,
        provider_person_id: providerPersonId,
        currency: wr.currency,
        /*
          ⚠⚠⚠ `ISSUED`, NOT `DRAFT`. The provider's acceptance is only reachable
          out of `ISSUED` (`canAcceptNow`), and there is no screen that issues a
          draft — a `DRAFT` order would be a contract nobody could act on, which
          is the door-onto-a-wall shape `E579` names.
        */
        status: "ISSUED",
        period_start: periodStart,
        period_end: periodEnd,
        fee_bps: feeBps,
        /*
          ── ⚠⚠⚠ THE CAP, WHICH NOTHING HAS EVER WRITTEN (`P2-A8-E684` WS-F) ──

          ⚠⚠ **MEASURED BEFORE WRITING IT: `not_to_exceed_cents` HAD ZERO
          WRITERS IN `src/`** — every order ever created carries `null` — while
          `transaction-spine.ts:495` **already enforces it whenever it is set**:
          a draw that would take the settled total past this cap is refused.
          ⚠⚠⚠ So the enforcement existed and the number it enforces did not,
          which means **no order has ever had a ceiling.** The schema says the
          field *"caps the WHOLE order"*; this is the line that makes that true.

          ⚠⚠ **IT IS THE ORDER'S OWN TOTAL, NOT A NEW NUMBER.** `valueCents` is
          summed from the lines that were just copied, so the cap says *"no more
          than what was ordered"* — a restatement of the order, never an
          estimate, a forecast or a budget somebody would have to defend.
          ⚠ **NO FEE ARITHMETIC AND NO CUT.** `fee_bps` is written beside this
          and is neither multiplied nor divided here — `check:work-chain` §6
          fails the build on `fee_bps`/`feeBps` arithmetic anywhere in `src/`,
          and it passed before this change and after it.
          ⚠⚠ **IT MOVES NO MONEY.** No `Payment` row, no `PAID`, nothing
          settled — a ceiling is a refusal, not a transfer.
        */
        not_to_exceed_cents: valueCents,
        /* ⚠ Recorded, never branched on. */
        external_ref: input.externalRef?.trim() || null,
        sow_text: input.sowText?.trim().slice(0, 20000) || null,
        lines: {
          create: lines.map((l) => ({
            line_number: l.line_number,
            /* ⚠⚠ THE ORDER LINE POINTS BACK AT THE REQUISITION LINE IT CAME
               FROM, which is what makes `termChanges` able to say what moved. */
            work_request_line_id: l.id,
            /* ⚠⚠⚠ COPIED, FIELD FOR FIELD, INCLUDING THE KIND (ruling 44).
               ⚠ `basis` is NOT written — it is retired and nullable, and writing
               it would mean deriving it, which is the deleted bridge. */
            transaction_type: l.transaction_type,
            /* ⚠⚠⚠ THE STAMP. Resolved above, written here, never looked up
               again — ruling `97b`. */
            fee_bps: lineFees.get(l.id)!,
            description: l.description,
            unspsc_code: l.unspsc_code,
            uom: l.uom,
            quantity: l.quantity,
            unit_price_cents: l.unit_price_cents,
            amount_cents: l.amount_cents,
            supplier_part_id: l.supplier_part_id,
            service_start: l.service_start,
            service_end: l.service_end,
          })),
        },
      },
      select: { id: true, order_number: true, origin: true },
    });

    /* ⚠⚠ RULING 17'S OTHER HALF: creating the order moves the request's status,
       and that is what makes the selection irreversible from here. */
    await tx.workRequest.update({ where: { id: wr.id }, data: { status: "ORDERED" } });
    await tx.workRequestLine.updateMany({
      where: { work_request_id: wr.id, status: "ASSIGNED" },
      /* ⚠ Scott's WR_LINE line status: *"Sourced = used to create a WO."* */
      data: { status: "ORDERED", work_order_id: order.id },
    });

    return order;
  });

  /*
    ── ⚠⚠ THE PROVIDER IS TOLD, THROUGH THE EVENT THAT ALREADY EXISTS ──────
    ⚠ `work.order_offered` is registered and, until now, uncalled — its own
    comment says it was registered in advance so *"this brief"* would have one
    line to call rather than inventing an event. ⚠⚠ Ruling 37: call it.
    ⚠⚠⚠ IT IS A WORKLIST ITEM: the provider owes an acceptance, and `notify`
    catches its own failures and never rethrows, so a notification outage cannot
    turn a created work order into an error the buyer sees.
  */
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

/**
 * ⚠⚠ DOOR 1 — **THE BUYER PRESSES HIRE.** Panameer generated these terms, so it
 * can assert them: `origin = INDIRECT`.
 */
export async function hire(
  viewer: Viewer,
  input: { workRequestId: string; sowText?: string | null }
): Promise<BuiltOrder> {
  return buildWorkOrder(viewer, { workRequestId: input.workRequestId, sowText: input.sowText }, "INDIRECT");
}

/**
 * ⚠⚠ DOOR 2 — **THE ERP RETURNS A PO.** The terms were approved in the buyer's
 * own system, so Panameer records the order's existence rather than asserting its
 * terms: `origin = DIRECT`.
 *
 * ⚠⚠⚠ THIS IS NOT AN INTEGRATION AND MUST NOT GROW INTO ONE. WS-D's scope is the
 * EVENT, not the transport — **no cXML, no webhook, no queue** (explicitly out of
 * scope). ⚠ This is the function such a transport would call, and it takes a PO
 * reference as a plain string because that is all a PO gives us that we keep.
 */
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

/**
 * ── ⚠⚠⚠ THE PROVIDER DECLINES THE WORK ORDER — RULING 16 ────────────────
 *
 * ⚠ WS-D item 5 said this was undecided and told me to report the options rather
 * than pick one. ⚠⚠ **SCOTT RULED IT AFTERWARDS (ruling 16): a declined work
 * order goes back to the buyer to pick somebody else.** So the stop is closed and
 * this is that ruling, not a choice of mine.
 *
 * ⚠⚠ WHAT THAT MEANS IN THE MODELS, AND ALL OF IT ALREADY EXISTS:
 * · the ORDER is `CANCELLED` — recorded, never deleted;
 * · the declining provider's proposal is `DECLINED`, with `declined_at`;
 * · **every other proposal goes back to `SUBMITTED`**, because the buyer is
 *   choosing again and a `NOT_SELECTED` row would present last time's answer;
 * · the work request returns to `POSTED` and its line loses the provider.
 *
 * ⚠⚠⚠ THE DECLINING PROVIDER IS NOT PUT BACK IN THE POOL. They said no to these
 * terms; offering them again on the buyer's next click would ask the same
 * question twice. ⚠ Their proposal keeps `DECLINED` and stays on the record.
 */
export async function declineWorkOrder(
  viewer: Viewer,
  orderId: string,
  reason?: string | null
): Promise<void> {
  const me = await ownPerson(viewer);

  const order = await prisma.workOrder.findFirst({
    where: { id: orderId, provider_person_id: me.id },
    select: { id: true, status: true, work_request_id: true },
  });
  if (!order) throw new SourcingError("That work order isn't yours.", "NOT_FOUND");
  /* ⚠⚠ ONLY BEFORE ACCEPTING. Once a provider has accepted the terms the order is
     a contract in force, and walking away from that is a cancellation with
     consequences — a different act, and not this brief's. */
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
      /* ⚠ The declining provider's own proposal records the refusal. */
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
      /* ⚠⚠ AND EVERYONE ELSE IS BACK IN CONTENTION. ⚠ `WITHDRAWN` and `DECLINED`
         are left alone — those providers ended their own involvement. */
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

  /* ⚠ The provider's own worklist item goes — they answered it. ⚠⚠ Resolved,
     never deleted: the notification records that they were asked. */
  await prisma.notification
    .updateMany({
      where: { dedupe_key: `work.order_offered:${order.id}`, resolved_at: null },
      data: { resolved_at: new Date() },
    })
    .catch(() => {});
}
