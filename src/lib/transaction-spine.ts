import { LineBasis, TransactionType } from "@prisma/client";
import { rateBreakdown } from "@/lib/display";

export class SpineError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = "SpineError";
  }
}

export type LineShape = {
  basis: LineBasis;
  uom?: string | null;
  quantity?: number | null;
  unit_price_cents?: number | null;
  amount_cents?: number | null;
};

export function assertLineShape(line: LineShape): void {
  assertPricedShape(line.basis === "RATE", line);
}

function assertPricedShape(
  byQuantity: boolean,
  line: Omit<LineShape, "basis">
): void {
  if (byQuantity) {
    if (line.uom == null || line.uom === "")
      throw new SpineError("A RATE line needs a unit of measure", "RATE_NEEDS_UOM");
    if (line.quantity == null)
      throw new SpineError("A RATE line needs a quantity", "RATE_NEEDS_QUANTITY");
    if (line.unit_price_cents == null)
      throw new SpineError("A RATE line needs a unit price", "RATE_NEEDS_UNIT_PRICE");
    if (line.amount_cents != null)
      throw new SpineError(
        "A RATE line must not carry an amount — it would be settleable twice",
        "RATE_HAS_AMOUNT"
      );
    return;
  }
  if (line.amount_cents == null)
    throw new SpineError("An AMOUNT line needs an amount", "AMOUNT_NEEDS_AMOUNT");
  if (line.uom != null || line.quantity != null || line.unit_price_cents != null)
    throw new SpineError(
      "An AMOUNT line must not carry uom, quantity or unit price",
      "AMOUNT_HAS_RATE_FIELDS"
    );
}

export function assertTransactionLineShape(line: {
  transaction_type: TransactionType;
  uom?: string | null;
  quantity?: number | null;
  unit_price_cents?: number | null;
  amount_cents?: number | null;
}): void {
  assertPricedShape(pricedByQuantity(line.transaction_type), line);
}

export function assertSupplierPartSubject(part: {
  kind: "PROVIDER" | "PACKAGE";
  provider_profile_id?: string | null;
  service_product_id?: string | null;
}): void {
  const hasProvider = !!part.provider_profile_id;
  const hasServiceProduct = !!part.service_product_id;
  if (hasProvider && hasServiceProduct)
    throw new SpineError("A supplier part names one subject, not two", "PART_TWO_SUBJECTS");
  if (!hasProvider && !hasServiceProduct)
    throw new SpineError("A supplier part must name a subject", "PART_NO_SUBJECT");
  if (part.kind === "PROVIDER" && !hasProvider)
    throw new SpineError("kind=PROVIDER but no provider profile", "PART_KIND_MISMATCH");
  if (part.kind === "PACKAGE" && !hasServiceProduct)
    throw new SpineError("kind=SERVICE_PRODUCT but no service product", "PART_KIND_MISMATCH");
}

export function basisForPricingType(t: "HOURLY" | "FIXED" | "RECURRING"): LineBasis {
  return t === "HOURLY" ? "RATE" : "AMOUNT";
}

export function transactionTypeForPricingType(
  t: "HOURLY" | "FIXED" | "RECURRING"
): TransactionType {
  return t === "HOURLY" ? "SERVICE_BY_QTY" : "SERVICE_BY_AMT";
}

export function pricedByQuantity(t: TransactionType): boolean {
  return t === "PRODUCT_BY_QTY" || t === "SERVICE_BY_QTY";
}

export type RequestLineForCompleteness = {
  provider_person_id?: string | null;
  transaction_type: TransactionType;
  unit_price_cents?: number | null;
  amount_cents?: number | null;
};

export function workRequestIsComplete(lines: RequestLineForCompleteness[]): boolean {
  if (lines.length === 0) return false;
  return lines.every(
    (l) =>
      !!l.provider_person_id &&
      (pricedByQuantity(l.transaction_type) ? l.unit_price_cents != null : l.amount_cents != null)
  );
}

export type FanOutLine = { provider_person_id: string | null | undefined };

export function fanOutByProvider<T extends FanOutLine>(lines: T[]): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const line of lines) {
    if (!line.provider_person_id)
      throw new SpineError(
        "Every line needs a provider before a work order can be cut",
        "LINE_UNASSIGNED"
      );
    const list = groups.get(line.provider_person_id) ?? [];
    list.push(line);
    groups.set(line.provider_person_id, list);
  }
  return groups;
}

export function feeSplit(
  grossCents: number,
  feeBps: number
): { gross_cents: number; fee_cents: number; net_cents: number } {
  const { fee, youGet } = rateBreakdown(grossCents, feeBps);
  return { gross_cents: grossCents, fee_cents: fee ?? 0, net_cents: youGet ?? grossCents };
}

export function feeReconciles(row: {
  gross_cents: number;
  fee_cents: number;
  net_cents: number;
}): boolean {
  return row.net_cents + row.fee_cents === row.gross_cents;
}

export type OrderLineForDraw = {
  id: string;
  basis: LineBasis;
  uom?: string | null;
  quantity?: number | null;
  unit_price_cents?: number | null;
  amount_cents?: number | null;
  drawn_quantity?: number | null;
  drawn_amount_cents?: number | null;
};

export type OrderForSettlement = {
  status: string;
  period_start?: Date | null;
  period_end?: Date | null;
  not_to_exceed_cents?: number | null;
};

export type DraftSettlementLine = {
  work_order_line_id: string;
  basis: LineBasis;
  quantity?: number | null;
  unit_price_cents?: number | null;
  amount_cents?: number | null;
};

export function priceSettlementLine(
  draft: DraftSettlementLine,
  orderLine: OrderLineForDraw
): { unit_price_cents: number | null; amount_cents: number | null } {
  if (draft.unit_price_cents != null && draft.unit_price_cents !== orderLine.unit_price_cents)
    throw new SpineError(
      "A settlement line's price is copied from the work-order line, never supplied",
      "PRICE_NOT_COPIED"
    );
  return orderLine.basis === "RATE"
    ? { unit_price_cents: orderLine.unit_price_cents ?? null, amount_cents: null }
    : { unit_price_cents: null, amount_cents: orderLine.amount_cents ?? null };
}

export function assertSettlementDraw(input: {
  order: OrderForSettlement;
  periodStart: Date;
  periodEnd: Date;
  lines: { draft: DraftSettlementLine; orderLine: OrderLineForDraw }[];
  /** Cents already settled against this ORDER, for rule 4. */
  alreadySettledCents: number;
}): void {
  if (input.order.status !== "RELEASED")
    throw new SpineError(
      "A settlement may only be raised against a RELEASED work order",
      "ORDER_NOT_RELEASED"
    );

  /* ── RULE 5 — the period sits inside the order's ────────────────────────── */
  if (input.periodEnd < input.periodStart)
    throw new SpineError("The period ends before it starts", "PERIOD_INVERTED");
  if (input.order.period_start && input.periodStart < input.order.period_start)
    throw new SpineError("The period starts before the work order does", "PERIOD_BEFORE_ORDER");
  if (input.order.period_end && input.periodEnd > input.order.period_end)
    throw new SpineError("The period ends after the work order does", "PERIOD_AFTER_ORDER");

  let drawCents = 0;

  for (const { draft, orderLine } of input.lines) {
    /* ── RULE 1 — basis matches ───────────────────────────────────────────── */
    if (draft.basis !== orderLine.basis)
      throw new SpineError(
        "A settlement line's basis must match its work-order line — a timesheet cannot be filed against an amount line",
        "BASIS_MISMATCH"
      );

    /* ── RULE 2 — the price is copied, never typed ────────────────────────── */
    const priced = priceSettlementLine(draft, orderLine);

    /* ── RULE 3 — draw limits ─────────────────────────────────────────────── */
    if (orderLine.basis === "RATE") {
      const want = draft.quantity ?? 0;
      if (want <= 0) throw new SpineError("A RATE draw needs a quantity", "RATE_DRAW_EMPTY");
      const already = orderLine.drawn_quantity ?? 0;
      const ordered = orderLine.quantity ?? 0;
      if (already + want > ordered)
        throw new SpineError(
          `Drawing ${want} would exceed the ordered quantity (${already} of ${ordered} already drawn)`,
          "RATE_OVERDRAW"
        );
      drawCents += Math.round(want * (priced.unit_price_cents ?? 0));
    } else {
      /* ⚠⚠ AMOUNT DRAWS ONCE, IN FULL — the exact amount, and never twice. A
         partial draw on an AMOUNT line is a milestone that was never ordered;
         a second draw is the same money leaving twice. */
      if ((orderLine.drawn_amount_cents ?? 0) > 0)
        throw new SpineError("An AMOUNT line has already been drawn", "AMOUNT_ALREADY_DRAWN");
      if (draft.amount_cents != null && draft.amount_cents !== orderLine.amount_cents)
        throw new SpineError("An AMOUNT line draws in full, not in part", "AMOUNT_PARTIAL_DRAW");
      drawCents += priced.amount_cents ?? 0;
    }
  }

  /* ── RULE 4 — not-to-exceed caps the WHOLE order ──────────────────────────
     ⚠ Across every settlement against it, not just this one: a cap that only
     looked at the current draw would be cleared by filing two. */
  if (
    input.order.not_to_exceed_cents != null &&
    input.alreadySettledCents + drawCents > input.order.not_to_exceed_cents
  )
    throw new SpineError(
      `This draw would take the order past its not-to-exceed cap`,
      "NOT_TO_EXCEED"
    );
}

/* ═══════════════════════════════════════════════════════════════════════════
   WS-4 · ALLOCATION AND RELEASE
   ═════════════════════════════════════════════════════════════════════════ */

/**
 * ⚠⚠ `SUM(PaymentLine)` MUST NEVER EXCEED `Payment.amount_cents`.
 *
 * Over-allocating releases payouts against money that never arrived — Panameer
 * would be paying providers out of its own balance and the shortfall would only
 * surface at a bank reconciliation, long after the cash left.
 *
 * ⚠ PARTIAL ALLOCATION IS EXPLICITLY LEGAL: `<` is fine, only `>` is refused.
 * A payment covering three of four settlements pays those three, because
 * all-or-nothing matching holds three providers hostage to one disputed line.
 */
export function assertAllocation(paymentAmountCents: number, lineAmounts: number[]): void {
  const allocated = lineAmounts.reduce((n, a) => n + a, 0);
  if (lineAmounts.some((a) => a <= 0))
    throw new SpineError("An allocation line must be positive", "ALLOCATION_NOT_POSITIVE");
  if (allocated > paymentAmountCents)
    throw new SpineError(
      `Allocating ${allocated} exceeds the ${paymentAmountCents} received`,
      "OVER_ALLOCATED"
    );
}

export function paymentStatusFor(
  paymentAmountCents: number,
  lineAmounts: number[]
): "UNMATCHED" | "PARTIALLY_ALLOCATED" | "ALLOCATED" {
  const allocated = lineAmounts.reduce((n, a) => n + a, 0);
  if (allocated === 0) return "UNMATCHED";
  return allocated >= paymentAmountCents ? "ALLOCATED" : "PARTIALLY_ALLOCATED";
}

/**
 * ⚠⚠ A PAYOUT IS `RELEASABLE` ONLY WHEN **ITS OWN** SETTLEMENT IS ALLOCATED.
 *
 * Not when the payment arrives, and not when the PO is paid in full — PER
 * SETTLEMENT, so one stuck or disputed line never blocks the others.
 *
 * ⚠ AND NOT BEFORE. Paying a provider before the buyer pays makes Panameer the
 * lender, which is a different business with different capital requirements and
 * a different licence.
 */
export function payoutIsReleasable(input: {
  settlementAllocatedCents: number;
  settlementTotalCents: number;
}): boolean {
  return (
    input.settlementTotalCents > 0 &&
    input.settlementAllocatedCents >= input.settlementTotalCents
  );
}
