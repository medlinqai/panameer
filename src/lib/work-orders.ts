import { WorkOrderOrigin } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { SourcingError } from "@/lib/sourcing";
import { assertTransactionLineShape, pricedByQuantity } from "@/lib/transaction-spine";
import { DEFAULT_SERVICE_FEE_BPS } from "@/lib/display";
import { notify } from "@/lib/notifications";
import type { Viewer } from "@/lib/access";

/**
 * ── ⚠⚠⚠ THE WORK ORDER IS BUILT (`P2-A8-E621` WS-D) ─────────────────────
 *
 * ⚠⚠ **`workOrder.create` DID NOT EXIST ANYWHERE IN `src/` BEFORE THIS FILE.**
 * That was the measured fact behind three dashes and behind `orders.ts` being a
 * file whose accept and release code **could never run** — it could only
 * `updateMany` an order that nothing ever built.
 *
 * ── ⚠⚠⚠ TWO DOORS, ONE EVENT (WS-D item 1) ──────────────────────────────
 *
 * ⚠ The ERP returns a PO, or the buyer presses HIRE. ⚠⚠ **NOTHING DOWNSTREAM MAY
 * KNOW WHICH FIRED**, and the way that is guaranteed here is structural rather
 * than promised: both doors call `buildWorkOrder` and **neither passes anything
 * the other does not.** ⚠⚠⚠ The ONE field that differs is `origin`, which is
 * `E388`'s own doctrine and is about what Panameer may ASSERT versus merely
 * RECORD — *"Panameer can assert the terms of an order it generated; it can only
 * record the existence of one it did not."* ⚠ `check:work-orders` asserts that no
 * rule, status, price or date reads it.
 *
 * ── ⚠⚠⚠ GENERATED, NEVER AUTHORED (WS-D item 2) ─────────────────────────
 *
 * ⚠⚠ **"A field a human types is a bug in this step."** Every value on the order
 * and its lines is copied from the requisition, the provider's profile, or the
 * clock. ⚠ The only inputs either door accepts are WHICH request and, for the ERP
 * door, the PO's own reference — and that reference is recorded, never used to
 * decide anything.
 *
 * ── ⚠⚠ NO MONEY (ruling 25) ─────────────────────────────────────────────
 * ⚠ `fee_bps` is SNAPSHOTTED from the provider's profile, and that is a rate
 * stated on a contract — **nothing multiplies it, no cut is computed, no
 * `Payment` row is created and `PAID` is never written.** ⚠⚠ The snapshot is
 * `display.ts`'s own stated purpose: *"so an in-flight engagement finishes at the
 * rate it was agreed at."*
 */

/** What a caller may say. ⚠ Notice how little that is — see "generated, never authored". */
export type OrderFromRequisition = {
  workRequestId: string;
  /** ⚠ The ERP door only: the PO's reference, recorded and never branched on. */
  externalRef?: string | null;
};

export type BuiltOrder = {
  id: string;
  orderNumber: string;
  /** ⚠ For the report and the gate — never read by a rule. */
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

/**
 * ⚠⚠⚠ THE SHARED BODY. **BOTH DOORS END HERE.**
 *
 * ⚠ It is not exported: a third caller has to be added deliberately, next to
 * these two, where a reviewer sees what door it is.
 */
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
          provider_person_id: true,
          service_start: true,
          service_end: true,
          work_order_id: true,
        },
      },
    },
  });
  if (!wr) throw new SourcingError("That work request isn't available.", "NOT_FOUND");
  if (wr.buyer_person_id !== me.id) {
    throw new SourcingError("Only the buyer can order this work.", "NOT_BUYER");
  }
  if (wr.status === "CANCELLED") {
    throw new SourcingError("This work request was cancelled.", "CANCELLED");
  }

  /* ⚠⚠ ONE ORDER PER REQUEST. ⚠⚠⚠ RULING 17: *"creating it moves the work
     request's status"* — so `ORDERED` is the fact that says an order exists, and
     a second press must not build a second contract. The LINE's `work_order_id`
     is checked too, because the status is a summary and the line is the fact. */
  if (wr.status === "ORDERED" || wr.lines.some((l) => l.work_order_id != null)) {
    throw new SourcingError(
      "A work order has already been created from this work request.",
      "ALREADY_ORDERED"
    );
  }

  const lines = wr.lines;
  if (lines.length === 0) {
    /* ⚠ No assigned line means nobody was selected. ⚠⚠ A refusal, because an
       order with no lines is a contract with no subject. */
    throw new SourcingError(
      "Select a provider before creating the work order.",
      "NOTHING_ASSIGNED"
    );
  }

  /*
    ⚠⚠⚠ ONE PROVIDER PER ORDER, AND THIS IS A REAL CONSTRAINT RATHER THAN AN
    ASSUMPTION. `WorkOrder.provider_person_id` is a single NOT NULL column, so an
    order names exactly one provider — and a requisition whose lines name two
    people cannot become one work order. ⚠ Refused loudly rather than silently
    taking the first line's provider, which would quietly drop somebody.
  */
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

  /*
    ── ⚠⚠ THE FEE IS SNAPSHOTTED, NOT LOOKED UP LATER ──────────────────────
    ⚠ `display.ts` states the reason in its own docblock: existing providers are
    grandfathered on purpose, and `WorkOrder.fee_bps` exists *"so an in-flight
    engagement finishes at the rate it was agreed at."* ⚠⚠ Reading the profile at
    settlement time instead would re-price a live engagement whenever the default
    moved. ⚠ A provider with no profile falls back to the ONE TypeScript copy of
    the default, which `check:service-fee` pins to the schema's `@default`.
  */
  const profile = await prisma.providerProfile.findFirst({
    where: { person_id: providerPersonId },
    select: { service_fee_bps: true },
  });
  const feeBps = profile?.service_fee_bps ?? DEFAULT_SERVICE_FEE_BPS;

  /* ⚠ The period is the span the requisition lines actually cover — derived, not
     typed. ⚠⚠ `null` where no line carries a date, rather than today's date,
     which would be a fact nobody stated. */
  const starts = lines.map((l) => l.service_start).filter((d): d is Date => d != null);
  const ends = lines.map((l) => l.service_end).filter((d): d is Date => d != null);
  const periodStart = starts.length ? new Date(Math.min(...starts.map((d) => d.getTime()))) : null;
  const periodEnd = ends.length ? new Date(Math.max(...ends.map((d) => d.getTime()))) : null;

  /*
    ⚠⚠⚠ EVERY LINE IS CHECKED BEFORE ANY ROW IS WRITTEN, THROUGH THE SPINE'S OWN
    RULE — and through its `TransactionType` door, so **no translation happens
    between approval and the order** (ruling 44). ⚠ A line that fails here means
    the requisition was incomplete, and half an order is worse than none.
  */
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
        /* ⚠ Recorded, never branched on. */
        external_ref: input.externalRef?.trim() || null,
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
  input: { workRequestId: string }
): Promise<BuiltOrder> {
  return buildWorkOrder(viewer, { workRequestId: input.workRequestId }, "INDIRECT");
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
      await tx.providerBid.updateMany({
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
      await tx.providerBid.updateMany({
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
