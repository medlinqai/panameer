import { randomBytes } from "node:crypto";
import { LineBasis, SettlementStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { Viewer } from "@/lib/access";
import {
  assertSettlementDraw,
  priceSettlementLine,
  type DraftSettlementLine,
  type OrderLineForDraw,
} from "@/lib/transaction-spine";
import { getOrderDetail, listOrders, OrderError, type OrderParty } from "@/lib/orders";

/**
 * SETTLEMENTS — THE TIMESHEET, THE PAYMENT REQUEST, AND THE APPROVAL
 * (`P1-J4-E394`).
 *
 * ── ⚠⚠ ONE MODEL, TWO RENDERINGS. THAT IS THE WHOLE BRIEF ───────────────────
 *
 * `SettlementRequest` is ONE model (`E388`) and there is ONE create path
 * (`createSettlement`, behind ONE endpoint). The provider sees a different
 * SCREEN depending on the work-order line's `basis`, and **nothing in the data
 * model branches**:
 *
 *     RATE   → a day-by-day TIMESHEET GRID — one `SettlementLine` per service date
 *     AMOUNT → ONE ROW — the milestone and its figure, claimed in full
 *
 * ⚠⚠ THERE IS NO `settlement_type` COLUMN AND THERE MUST NEVER BE ONE. The basis
 * already says which shape a line takes; a second column saying the same thing is
 * a fact that can disagree with itself. `check:settle` asserts its absence, and
 * asserts there is exactly one create endpoint.
 *
 * ⚠ THE DIFFERENCE IS ROW COUNT, NOT SHAPE. Both renderings produce
 * `SettlementLine` rows against `work_order_line_id`; a timesheet produces five
 * of them and a milestone produces one. That is the entire branch.
 *
 * ── ⚠ WHERE THIS IS REACHED FROM ────────────────────────────────────────────
 *
 * `lib/nav.ts` records the decision and it is honoured: *"Timesheet and
 * fixed-firm-price billing both surface as Payment Requests generated from a Work
 * Order… A rail item for a thing that is a tab inside another thing taught the
 * wrong model of how work gets billed."* So the CREATE flow lives at
 * `/orders/[id]/settle` — inside the order — and `/finances/payment-requests` is
 * the provider's list of what they have raised.
 */

export class SettlementError extends Error {
  constructor(message: string, public code: "NOT_FOUND" | "FORBIDDEN" | "INVALID") {
    super(message);
    this.name = "SettlementError";
  }
}

/** ⚠ Same alphabet as the ITB and the ticket code — a person reads this back. */
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function newSettlementNumber(): string {
  const bytes = randomBytes(6);
  let out = "";
  for (const b of bytes) out += CODE_ALPHABET[b % CODE_ALPHABET.length];
  return `PR-${out}`;
}

/* ═══════════════════════════════════════════════════════════════════════════
   WHAT CAN BE SETTLED — AND WHAT TO SAY WHEN NOTHING CAN
   ═════════════════════════════════════════════════════════════════════════ */

export type SettleableOrder = {
  id: string;
  orderNumber: string;
  counterpartyName: string;
  periodStart: string | null;
  periodEnd: string | null;
  currency: string;
  valueCents: number;
  drawnCents: number;
};

/**
 * The RELEASED orders this provider can raise a settlement against.
 *
 * ⚠⚠ `RELEASED`, NOT `ACCEPTED` — `E388`'s own rule, and `E393` built the two
 * events that get there. *"Drawing against an order the buyer has not released
 * bills for work nobody authorised to start."*
 *
 * ⚠ IT READS `listOrders` — `E393`'s function — rather than querying work orders
 * again. The party derivation and the value/drawn arithmetic already live there,
 * and a second copy is the defect this stack has now avoided three times.
 */
export async function settleableOrdersFor(viewer: Viewer): Promise<SettleableOrder[]> {
  const orders = await listOrders(viewer);
  return orders
    .filter((o) => o.party === "PROVIDER" && o.status === "RELEASED")
    .map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      counterpartyName: o.counterpartyName,
      periodStart: o.periodStart,
      periodEnd: o.periodEnd,
      currency: o.currency,
      valueCents: o.valueCents,
      drawnCents: o.drawnCents,
    }));
}

export type SettleLineOption = {
  workOrderLineId: string;
  lineNumber: number;
  basis: LineBasis;
  description: string;
  uom: string | null;
  unitPriceCents: number | null;
  amountCents: number | null;
  /** ⚠ RATE only — what is left to draw. Straight from `E393`'s drawdown. */
  remainingQuantity: number | null;
  /** ⚠ AMOUNT only — an already-drawn line cannot appear again. */
  alreadyDrawn: boolean;
  /** False when there is nothing left to claim on this line. */
  claimable: boolean;
};

export type SettleForm = {
  orderId: string;
  orderNumber: string;
  currency: string;
  buyerName: string;
  /** ⚠ The period the settlement must sit inside — `E388` rule 5. */
  orderPeriodStart: string | null;
  orderPeriodEnd: string | null;
  notToExceedCents: number | null;
  alreadySettledCents: number;
  lines: SettleLineOption[];
};

/**
 * Everything the create screen needs, for one order.
 *
 * ⚠⚠ REMAINING COMES FROM `E393`'s `drawdownFor`, VIA `getOrderDetail`. THIS
 * FILE DOES NOT COMPUTE IT. The brief is explicit — *"a second computation of
 * remaining is exactly the two-implementations-that-agree-today defect this stack
 * has now avoided twice"* — and `drawdownFor` already exposed both halves
 * (`remainingQuantity` for RATE, `drawn` for AMOUNT), so it needed no extension.
 * `check:settle` asserts this file contains no arithmetic on `drawn_quantity`.
 *
 * ⚠ AND `getOrderDetail` IS ALSO THE PARTY CHECK. A viewer who is not a party to
 * the order gets NOT_FOUND from it, before any line is read.
 */
export async function settleFormFor(viewer: Viewer, orderId: string): Promise<SettleForm> {
  const o = await getOrderDetail(viewer, orderId);

  /* ⚠ ONLY THE PROVIDER RAISES A SETTLEMENT. A buyer reaching this URL is not
     shown a form they cannot submit — the party is the first test, as in `E393`. */
  if (o.party !== "PROVIDER")
    throw new SettlementError("Only the provider on this order can raise a payment request", "FORBIDDEN");
  if (o.status !== "RELEASED")
    throw new SettlementError(
      "A payment request can only be raised against a released work order",
      "INVALID"
    );

  const alreadySettledCents = await settledCentsFor(orderId);

  return {
    orderId: o.id,
    orderNumber: o.orderNumber,
    currency: o.currency,
    buyerName: o.buyerName,
    orderPeriodStart: o.periodStart,
    orderPeriodEnd: o.periodEnd,
    notToExceedCents: o.notToExceedCents,
    alreadySettledCents,
    lines: o.lines.map((l) => {
      const d = l.drawdown;
      return {
        workOrderLineId: l.id,
        lineNumber: l.lineNumber,
        basis: l.basis,
        description: l.description,
        uom: l.uom,
        unitPriceCents: l.unitPriceCents,
        amountCents: l.amountCents,
        remainingQuantity: d.basis === "RATE" ? d.remainingQuantity : null,
        alreadyDrawn: d.basis === "AMOUNT" ? d.drawn : false,
        /* ⚠ A RATE line with nothing left, or an AMOUNT line already drawn, is
           shown but not claimable — hiding it would make a provider wonder where
           their line went. */
        claimable: d.basis === "RATE" ? d.remainingQuantity > 0 : !d.drawn,
      };
    }),
  };
}

/** Cents already settled against this order, for `E388`'s rule 4 (not-to-exceed). */
async function settledCentsFor(orderId: string): Promise<number> {
  const rows = await prisma.settlementLine.findMany({
    where: {
      settlementRequest: {
        work_order_id: orderId,
        /* ⚠ A REJECTED SETTLEMENT DOES NOT CONSUME THE CAP. It was refused, so
           the money was never owed; counting it would shrink the order's
           remaining budget every time a buyer sent something back. */
        status: { in: ["DRAFT", "SUBMITTED", "APPROVED", "PAID"] },
      },
    },
    select: { basis: true, quantity: true, unit_price_cents: true, amount_cents: true },
  });
  let cents = 0;
  for (const r of rows)
    cents +=
      r.basis === "RATE"
        ? Math.round(Number(r.quantity ?? 0) * (r.unit_price_cents ?? 0))
        : r.amount_cents ?? 0;
  return cents;
}

/* ═══════════════════════════════════════════════════════════════════════════
   THE ONE CREATE PATH
   ═════════════════════════════════════════════════════════════════════════ */

export type SettleLineInput = {
  workOrderLineId: string;
  /** ⚠ RATE only — the day. A timesheet row IS a service date plus hours. */
  serviceDate?: string | null;
  /** ⚠ RATE only — hours (or whatever the line's UOM is). */
  quantity?: number | null;
  note?: string | null;
};

export type SettleInput = {
  periodStart: string;
  periodEnd: string;
  lines: SettleLineInput[];
};

/**
 * ⚠⚠ THE ONE CREATE PATH, SERVING BOTH RENDERINGS.
 *
 * A timesheet arrives as many `lines` naming one `workOrderLineId`; a milestone
 * arrives as one line naming an AMOUNT order line and no quantity. **Nothing
 * below asks which kind it is** — the order line's `basis` decides everything,
 * and there is no `type` parameter, no branch on a request field and no second
 * endpoint.
 *
 * ── ⚠⚠ AND ONE THING THE CALLER MUST DO THAT `E388` DOES NOT ────────────────
 *
 * **`assertSettlementDraw`'s rule 3 does not ACCUMULATE within a batch.** It
 * reads `orderLine.drawn_quantity` fresh for every draft, so five timesheet rows
 * of 40 hours each against a 100-hour line pass individually and overdraw by
 * 100. **MEASURED, not theorised** — the timesheet grid is the FIRST caller that
 * can produce two drafts against one order line, so nothing could reach it
 * before today.
 *
 * ⚠ SO THE ROWS ARE AGGREGATED PER ORDER LINE BEFORE THE RULE RUNS, and the
 * per-day rows are persisted afterwards. The assertion sees the total, which is
 * what rule 3 is about; the provider still gets their day-by-day grid.
 * ⚠⚠ THIS IS A CALLER-SIDE FIX FOR A SHARED-FUNCTION FOOTGUN AND IT IS REPORTED
 * AS SUCH. `E388`'s function is unchanged — a UI brief does not quietly edit an
 * asserted rule — and `check:settle` asserts the aggregation so this path cannot
 * regress.
 */
export async function createSettlement(
  viewer: Viewer,
  orderId: string,
  input: SettleInput
): Promise<SettlementDetail> {
  const o = await getOrderDetail(viewer, orderId);
  if (o.party !== "PROVIDER")
    throw new SettlementError("Only the provider on this order can raise a payment request", "FORBIDDEN");

  if (!input.periodStart || !input.periodEnd)
    throw new SettlementError("A payment request needs a period", "INVALID");
  const periodStart = new Date(input.periodStart);
  const periodEnd = new Date(input.periodEnd);

  const rows = (input.lines ?? []).filter((l) => l.workOrderLineId);
  if (rows.length === 0)
    throw new SettlementError("Add at least one line to this payment request", "INVALID");

  const orderLineById = new Map(o.lines.map((l) => [l.id, l]));
  for (const r of rows)
    if (!orderLineById.has(r.workOrderLineId))
      throw new SettlementError("That line is not on this work order", "NOT_FOUND");

  /* ⚠⚠ THE AGGREGATION — see the docblock. One draft per ORDER LINE, carrying
     the summed quantity, so rule 3 sees the whole draw. */
  const byOrderLine = new Map<string, { quantity: number; count: number }>();
  for (const r of rows) {
    const cur = byOrderLine.get(r.workOrderLineId) ?? { quantity: 0, count: 0 };
    cur.quantity += Number(r.quantity ?? 0);
    cur.count += 1;
    byOrderLine.set(r.workOrderLineId, cur);
  }

  const drafts: { draft: DraftSettlementLine; orderLine: OrderLineForDraw }[] = [];
  for (const [workOrderLineId, agg] of byOrderLine) {
    const ol = orderLineById.get(workOrderLineId)!;
    const orderLine: OrderLineForDraw = {
      id: ol.id,
      basis: ol.basis,
      uom: ol.uom,
      quantity: ol.quantity,
      unit_price_cents: ol.unitPriceCents,
      amount_cents: ol.amountCents,
      drawn_quantity: ol.drawdown.basis === "RATE" ? ol.drawdown.drawnQuantity : 0,
      drawn_amount_cents: ol.drawdown.drawnCents,
    };
    /* ⚠ AN AMOUNT LINE MAY NOT BE SPLIT ACROSS ROWS — it claims once, in full,
       so more than one row against it is a milestone being invoiced twice. */
    if (ol.basis === "AMOUNT" && agg.count > 1)
      throw new SettlementError(
        "A fixed-amount line is claimed in full, on one row — it cannot be split",
        "INVALID"
      );
    drafts.push({
      draft: {
        work_order_line_id: workOrderLineId,
        basis: ol.basis,
        /* ⚠⚠ NO PRICE IS SUPPLIED. `priceSettlementLine` REFUSES a supplied one,
           and that refusal is the point: the rate is the order's, not the
           claimant's. */
        quantity: ol.basis === "RATE" ? agg.quantity : null,
      },
      orderLine,
    });
  }

  /* ⚠⚠ THE SPINE'S FIVE RULES, RUN AS ONE. Nothing above re-implements them —
     `ORDER_NOT_RELEASED`, the period bounds, the draw limits and the
     not-to-exceed cap all come back from here with their own codes. */
  assertSettlementDraw({
    order: {
      status: o.status,
      period_start: o.periodStart ? new Date(o.periodStart) : null,
      period_end: o.periodEnd ? new Date(o.periodEnd) : null,
      not_to_exceed_cents: o.notToExceedCents,
    },
    periodStart,
    periodEnd,
    lines: drafts,
    alreadySettledCents: await settledCentsFor(orderId),
  });

  /* ⚠ THE PERSISTED ROWS ARE THE PROVIDER'S OWN — one per timesheet day, one for
     a milestone. Priced by `priceSettlementLine`, the ONLY place a settlement
     line's price is assigned. */
  const created = await prisma.settlementRequest.create({
    data: {
      settlement_number: newSettlementNumber(),
      work_order_id: o.id,
      provider_person_id: await providerPersonIdOf(o.id),
      period_start: periodStart,
      period_end: periodEnd,
      currency: o.currency,
      status: "SUBMITTED",
      submitted_at: new Date(),
      lines: {
        create: rows.map((r, i) => {
          const ol = orderLineById.get(r.workOrderLineId)!;
          const priced = priceSettlementLine(
            {
              work_order_line_id: r.workOrderLineId,
              basis: ol.basis,
              quantity: ol.basis === "RATE" ? Number(r.quantity ?? 0) : null,
            },
            {
              id: ol.id,
              basis: ol.basis,
              uom: ol.uom,
              quantity: ol.quantity,
              unit_price_cents: ol.unitPriceCents,
              amount_cents: ol.amountCents,
            }
          );
          return {
            line_number: i + 1,
            work_order_line_id: r.workOrderLineId,
            basis: ol.basis,
            description: ol.description,
            uom: ol.basis === "RATE" ? ol.uom : null,
            /* ⚠ THE QUANTITY IS THE PROVIDER'S CLAIM; THE PRICE IS THE ORDER'S.
               `priceSettlementLine` returns only the two price columns, and that
               is the boundary exactly where it belongs — how many hours you
               worked is yours to state, what an hour is worth is not. */
            quantity: ol.basis === "RATE" ? Number(r.quantity ?? 0) : null,
            unit_price_cents: priced.unit_price_cents ?? null,
            amount_cents: priced.amount_cents ?? null,
            service_date: r.serviceDate ? new Date(r.serviceDate) : null,
            note: r.note?.trim() || null,
          };
        }),
      },
    },
    select: { id: true },
  });

  /* ⚠⚠ THE DRAW IS TAKEN AT SUBMIT, NOT AT APPROVAL, AND THE REVERSE IS AT
     REJECTION. `WorkOrderLine.drawn_*` is what rule 3 reads, so if it only moved
     on approval two settlements submitted the same afternoon would each see zero
     drawn and both pass. `rejectSettlement` gives it back — see there. */
  for (const [workOrderLineId, agg] of byOrderLine) {
    const ol = orderLineById.get(workOrderLineId)!;
    if (ol.basis === "RATE") {
      await prisma.workOrderLine.update({
        where: { id: workOrderLineId },
        data: {
          drawn_quantity: { increment: agg.quantity },
          drawn_amount_cents: { increment: Math.round(agg.quantity * (ol.unitPriceCents ?? 0)) },
        },
      });
    } else {
      await prisma.workOrderLine.update({
        where: { id: workOrderLineId },
        data: { drawn_amount_cents: ol.amountCents ?? 0, status: "DRAWN" },
      });
    }
  }

  return getSettlement(viewer, created.id);
}

async function providerPersonIdOf(orderId: string): Promise<string> {
  const o = await prisma.workOrder.findUnique({
    where: { id: orderId },
    select: { provider_person_id: true },
  });
  if (!o) throw new SettlementError("Work order not found", "NOT_FOUND");
  return o.provider_person_id;
}

/* ═══════════════════════════════════════════════════════════════════════════
   READ — BOTH SCOPES, THE `E393` WAY
   ═════════════════════════════════════════════════════════════════════════ */

export type SettlementAction = "APPROVE" | "REJECT";

/**
 * ⚠⚠ THE PARTY RULE, AND IT IS `E393`'s, NOT A SECOND ONE.
 *
 * **A provider raises a settlement; a buyer approves or rejects it; neither
 * action may render for the wrong party.** `E393` proved this with
 * `availableActions(order, party)` plus a component taking no party prop and
 * reading no session — `components/orders/OrderActivation.tsx`. This is the same
 * shape for the same reason, and `SettlementActions.tsx` is the same kind of
 * component.
 *
 * ⚠ THE PARTY IS TESTED FIRST AND EVERY BRANCH RETURNS EARLY, ending in `[]`.
 * A provider has no action here at all: they have already acted by submitting.
 * ⚠ AND THE TWO ARRIVE TOGETHER because they are one decision with two answers —
 * a buyer looking at a submitted request either accepts the work or says why not.
 */
export function settlementActions(
  settlement: { status: SettlementStatus },
  party: OrderParty
): SettlementAction[] {
  if (party === "BUYER") return settlement.status === "SUBMITTED" ? ["APPROVE", "REJECT"] : [];
  return [];
}

export type SettlementLineView = {
  id: string;
  lineNumber: number;
  basis: LineBasis;
  description: string | null;
  uom: string | null;
  quantity: number | null;
  unitPriceCents: number | null;
  amountCents: number | null;
  serviceDate: string | null;
  note: string | null;
  valueCents: number;
};

export type SettlementDetail = {
  id: string;
  settlementNumber: string;
  status: SettlementStatus;
  party: OrderParty;
  orderId: string;
  orderNumber: string;
  buyerName: string;
  providerName: string;
  counterpartyName: string;
  currency: string;
  periodStart: string;
  periodEnd: string;
  submittedAt: string | null;
  decidedAt: string | null;
  decisionNote: string | null;
  lines: SettlementLineView[];
  totalCents: number;
  /** ⚠ RATE if any line is a timesheet — decides which rendering the reader gets. */
  hasTimesheet: boolean;
  actions: SettlementAction[];
};

/** ⚠ ONE definition of a settlement line's value, read by the detail and the list. */
function lineValue(l: {
  basis: LineBasis;
  quantity?: unknown;
  unit_price_cents: number | null;
  amount_cents: number | null;
}): number {
  return l.basis === "RATE"
    ? Math.round(Number(l.quantity ?? 0) * (l.unit_price_cents ?? 0))
    : l.amount_cents ?? 0;
}

/**
 * One settlement, if the viewer is a party to its ORDER.
 *
 * ⚠ THE PARTY COMES FROM THE ORDER, NOT FROM THE SETTLEMENT. A settlement has a
 * `provider_person_id` and no buyer column, so asking it alone would answer "are
 * you the provider?" and nothing else. `getOrderDetail` answers both sides, and
 * it is already the party check.
 */
export async function getSettlement(viewer: Viewer, id: string): Promise<SettlementDetail> {
  const s = await prisma.settlementRequest.findUnique({
    where: { id },
    include: { lines: { orderBy: { line_number: "asc" } } },
  });
  if (!s) throw new SettlementError("Payment request not found", "NOT_FOUND");

  let order;
  try {
    order = await getOrderDetail(viewer, s.work_order_id);
  } catch (e) {
    /* ⚠ NOT A PARTY TO THE ORDER MEANS NOT FOUND, NOT FORBIDDEN — the same
       reasoning `/orders/[id]` follows: confirming an id exists is itself a leak. */
    if (e instanceof OrderError) throw new SettlementError("Payment request not found", "NOT_FOUND");
    throw e;
  }

  const lines: SettlementLineView[] = s.lines.map((l) => ({
    id: l.id,
    lineNumber: l.line_number,
    basis: l.basis,
    description: l.description,
    uom: l.uom,
    quantity: l.quantity == null ? null : Number(l.quantity),
    unitPriceCents: l.unit_price_cents,
    amountCents: l.amount_cents,
    serviceDate: l.service_date ? l.service_date.toISOString().slice(0, 10) : null,
    note: l.note,
    valueCents: lineValue(l),
  }));

  return {
    id: s.id,
    settlementNumber: s.settlement_number,
    status: s.status,
    party: order.party,
    orderId: order.id,
    orderNumber: order.orderNumber,
    buyerName: order.buyerName,
    providerName: order.providerName,
    counterpartyName: order.counterpartyName,
    currency: s.currency,
    periodStart: s.period_start.toISOString().slice(0, 10),
    periodEnd: s.period_end.toISOString().slice(0, 10),
    submittedAt: s.submitted_at ? s.submitted_at.toISOString() : null,
    decidedAt: s.decided_at ? s.decided_at.toISOString() : null,
    decisionNote: s.decision_note,
    lines,
    totalCents: lines.reduce((n, l) => n + l.valueCents, 0),
    hasTimesheet: lines.some((l) => l.basis === "RATE"),
    actions: settlementActions(s, order.party),
  };
}

export type SettlementRow = {
  id: string;
  settlementNumber: string;
  status: SettlementStatus;
  party: OrderParty;
  orderId: string;
  orderNumber: string;
  counterpartyName: string;
  currency: string;
  periodStart: string;
  periodEnd: string;
  totalCents: number;
  lineCount: number;
  submittedAt: string | null;
};

/**
 * Every settlement the viewer is a party to — **both scopes, one function**.
 *
 * ⚠ THE ORDERS ARE THE FENCE. `listOrders` already answers "which orders is this
 * person a party to", so this reads settlements against THAT set rather than
 * asking the settlement table who the buyer is — which it cannot answer.
 */
export async function listSettlements(viewer: Viewer): Promise<SettlementRow[]> {
  const orders = await listOrders(viewer);
  if (orders.length === 0) return [];
  const byOrder = new Map(orders.map((o) => [o.id, o]));

  const rows = await prisma.settlementRequest.findMany({
    where: { work_order_id: { in: orders.map((o) => o.id) } },
    orderBy: [{ created_at: "desc" }],
    include: { lines: true },
  });

  return rows.map((s) => {
    const o = byOrder.get(s.work_order_id)!;
    return {
      id: s.id,
      settlementNumber: s.settlement_number,
      status: s.status,
      party: o.party,
      orderId: o.id,
      orderNumber: o.orderNumber,
      counterpartyName: o.counterpartyName,
      currency: s.currency,
      periodStart: s.period_start.toISOString().slice(0, 10),
      periodEnd: s.period_end.toISOString().slice(0, 10),
      totalCents: s.lines.reduce((n, l) => n + lineValue(l), 0),
      lineCount: s.lines.length,
      submittedAt: s.submitted_at ? s.submitted_at.toISOString() : null,
    };
  });
}

/* ═══════════════════════════════════════════════════════════════════════════
   THE BUYER'S DECISION
   ═════════════════════════════════════════════════════════════════════════ */

/**
 * ⚠⚠ APPROVING A SETTLEMENT IS ACCEPTING THE WORK.
 *
 * *"ACCEPTANCE MUST BE DEFINED"* in Scott's journey doc, and this is where it is
 * defined: for a deliverable, there is no separate acceptance step, so the
 * approval IS it. The screen says so in a sentence, because **it is the
 * difference between paying an invoice and accepting a deliverable and the buyer
 * should know which they are doing.**
 */
export async function approveSettlement(viewer: Viewer, id: string): Promise<SettlementDetail> {
  const current = await getSettlement(viewer, id);
  if (!settlementActions({ status: current.status }, current.party).includes("APPROVE"))
    throw new SettlementError(
      current.party === "PROVIDER"
        ? "Only the buyer can approve a payment request"
        : "This payment request is not waiting for a decision",
      current.party === "PROVIDER" ? "FORBIDDEN" : "INVALID"
    );
  await prisma.settlementRequest.updateMany({
    where: { id, status: "SUBMITTED" },
    data: { status: "APPROVED", decided_at: new Date(), decided_by_person_id: await personIdOf(viewer) },
  });
  return getSettlement(viewer, id);
}

/**
 * ⚠⚠ A REJECTION WITHOUT A STATED REASON IS UNANSWERABLE (`E388`).
 *
 * The provider's only next move is to guess what to change. So the reason is
 * required HERE, at the boundary — the form marks it required too, but a required
 * field in a form is a convention and this is the rule.
 *
 * ⚠ AND THE DRAW IS GIVEN BACK. `createSettlement` takes the draw at SUBMIT so
 * two same-afternoon claims cannot both see zero drawn; a rejection means the
 * money was never owed, so the quantity returns to the line and the provider can
 * re-file. Without this, every rejection would silently shrink the order.
 */
export async function rejectSettlement(
  viewer: Viewer,
  id: string,
  reason: string
): Promise<SettlementDetail> {
  const current = await getSettlement(viewer, id);
  if (!settlementActions({ status: current.status }, current.party).includes("REJECT"))
    throw new SettlementError(
      current.party === "PROVIDER"
        ? "Only the buyer can reject a payment request"
        : "This payment request is not waiting for a decision",
      current.party === "PROVIDER" ? "FORBIDDEN" : "INVALID"
    );
  const note = (reason ?? "").trim();
  if (note.length < 3)
    throw new SettlementError(
      "A rejection needs a reason — without one the provider cannot answer it",
      "INVALID"
    );

  const done = await prisma.settlementRequest.updateMany({
    where: { id, status: "SUBMITTED" },
    data: {
      status: "REJECTED",
      decided_at: new Date(),
      decided_by_person_id: await personIdOf(viewer),
      decision_note: note,
    },
  });

  /* ⚠ ONLY IF THIS CALL IS THE ONE THAT REJECTED IT. Two buyers clicking at once
     must not return the draw twice. */
  if (done.count === 1) await returnTheDraw(id);
  return getSettlement(viewer, id);
}

/** Give back what a rejected settlement had drawn. */
async function returnTheDraw(settlementId: string): Promise<void> {
  const lines = await prisma.settlementLine.findMany({
    where: { settlement_request_id: settlementId },
    select: { work_order_line_id: true, basis: true, quantity: true, unit_price_cents: true },
  });
  const byLine = new Map<string, { quantity: number; cents: number; basis: LineBasis }>();
  for (const l of lines) {
    const cur = byLine.get(l.work_order_line_id) ?? { quantity: 0, cents: 0, basis: l.basis };
    cur.quantity += Number(l.quantity ?? 0);
    cur.cents += Math.round(Number(l.quantity ?? 0) * (l.unit_price_cents ?? 0));
    byLine.set(l.work_order_line_id, cur);
  }
  for (const [workOrderLineId, agg] of byLine) {
    if (agg.basis === "RATE") {
      await prisma.workOrderLine.update({
        where: { id: workOrderLineId },
        data: {
          drawn_quantity: { decrement: agg.quantity },
          drawn_amount_cents: { decrement: agg.cents },
        },
      });
    } else {
      /* ⚠ AN AMOUNT LINE GOES BACK TO ZERO AND OPEN — it draws once in full, so
         there is no partial to restore. */
      await prisma.workOrderLine.update({
        where: { id: workOrderLineId },
        data: { drawn_amount_cents: 0, status: "OPEN" },
      });
    }
  }
}

async function personIdOf(viewer: Viewer): Promise<string> {
  const p = await prisma.person.findFirst({
    where: { user_id: viewer.userId },
    select: { id: true },
  });
  if (!p) throw new SettlementError("This account has no person record", "NOT_FOUND");
  return p.id;
}
