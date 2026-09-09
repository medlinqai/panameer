import { LineBasis } from "@prisma/client";
import { rateBreakdown } from "@/lib/display";

/**
 * THE TRANSACTION SPINE'S RULES (`P1-J4-E388`).
 *
 * Work Request → Work Order → Settlement Request → Payment / Payout.
 *
 * ⚠⚠ THE RULES LIVE HERE, NOT IN THE ROUTES, so `check:transaction-spine` can
 * test the BEHAVIOUR rather than grep for a shape. Every function below is one
 * of the brief's "assert" rules, and each has a mutation test behind it.
 *
 * ⚠ R1 BUILDS THE COLUMNS; R2 BUILDS THE CONNECTION. Nothing here parses or
 * generates cXML, opens a punchout session or reconciles ERS. A nullable column
 * is honest; a stub that pretends to talk to an ERP is the `E034` shape.
 *
 * ── ⚠⚠ PAYMENT IS PUSHED, NEVER PULLED. CONSIDERED AND REJECTED ────────────
 *      (`P1-ALL-E404` WS-5, Scott 2026-09-09)
 *
 * ⚠ RECORDED HERE BECAUSE SOMEBODY WILL PROPOSE IT AGAIN, and the reasoning is
 * better than the conclusion. Scott raised direct-debit style pulling and
 * reversed it himself inside a single message:
 *
 *   *"Payment pulling also has another issue...was that settlement request
 *   approved in the ERP/Panameer? So the buyer will always need to transmit
 *   payment to us."*
 *
 * ⚠⚠ THE OBJECTION IS THE BUYER'S CONTROLS, NOT PANAMEER'S PLUMBING. Under ERS
 * the buyer's ERP creates the invoice from Panameer's receipt and pays it on the
 * buyer's own AP run. A pull would BYPASS THAT APPROVAL — and no enterprise AP
 * department authorises a vendor to debit them on the vendor's say-so. **The
 * push is not a limitation of the design; it IS the design**, and the whole ERP
 * differentiator depends on transacting inside the buyer's system of record
 * rather than around it.
 *
 * ⚠ AND IT KEEPS PANAMEER FURTHER FROM MONEY TRANSMISSION. Pulling funds means
 * HOLDING them while a settlement resolves, which is the escrow-shaped activity
 * Scott has ruled out twice — *"I am NOT a money transmitter no more than a
 * staffing company gets paid, deducts its fee and pays the provider."* Rejecting
 * the pull removes a reason to hold anything.
 *
 * ⚠⚠ NO CODE, NO SCHEMA, NO SCREEN, AND NO STORED AUTHORISATION. There is
 * nothing to retain, which is why `lib/retention.ts` records the pull
 * authorisation as MOOT rather than as a rule with no value.
 *
 * ⚠ IT TOUCHES THE OPEN AGENT-VERSUS-PRINCIPAL QUESTION (`P1-ALL-E396`) and does
 * not settle it: whether the provider's contract is with the buyer or with
 * Panameer is still counsel's first question. This only records that the money
 * moves one way.
 */

export class SpineError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = "SpineError";
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   WS-1 · THE LINE SHAPE
   ═════════════════════════════════════════════════════════════════════════ */

export type LineShape = {
  basis: LineBasis;
  uom?: string | null;
  quantity?: number | null;
  unit_price_cents?: number | null;
  amount_cents?: number | null;
};

/**
 * ⚠⚠ RATE AND AMOUNT ARE MUTUALLY EXCLUSIVE SHAPES, AND BOTH DIRECTIONS ARE
 * CHECKED. Half of this rule is the one that gets forgotten: it is easy to
 * assert that a RATE line HAS a quantity and never notice an AMOUNT line that
 * also carries one. A line carrying both prices can be settled twice — once per
 * shape — and the second draw looks legitimate on its own.
 *
 * The carve-out is Oracle's, not Panameer's: cXML requires a quantity on every
 * line *"except for amount-based service lines."*
 */
export function assertLineShape(line: LineShape): void {
  if (line.basis === "RATE") {
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

/**
 * ⚠⚠ EXACTLY ONE SUBJECT — NEITHER BOTH NOR NEITHER. One table owns the
 * `SupplierPartID` namespace over two subjects, so the discriminator has to be
 * enforced in code: a prefix convention enforces nothing and is not a foreign
 * key, and a part with no subject is an identifier the ERP will store forever
 * pointing at nothing.
 */
export function assertSupplierPartSubject(part: {
  kind: "PROVIDER" | "PACKAGE";
  provider_profile_id?: string | null;
  package_id?: string | null;
}): void {
  const hasProvider = !!part.provider_profile_id;
  const hasPackage = !!part.package_id;
  if (hasProvider && hasPackage)
    throw new SpineError("A supplier part names one subject, not two", "PART_TWO_SUBJECTS");
  if (!hasProvider && !hasPackage)
    throw new SpineError("A supplier part must name a subject", "PART_NO_SUBJECT");
  if (part.kind === "PROVIDER" && !hasProvider)
    throw new SpineError("kind=PROVIDER but no provider profile", "PART_KIND_MISMATCH");
  if (part.kind === "PACKAGE" && !hasPackage)
    throw new SpineError("kind=PACKAGE but no package", "PART_KIND_MISMATCH");
}

/**
 * `Package.pricing_type` → `LineBasis`.
 *
 * ⚠ `RECURRING` LOSES ITS `billing_period` IN THIS MAPPING, AND THAT IS REPORTED
 * RATHER THAN PAPERED OVER: a recurring package becomes an AMOUNT line that
 * draws once, so the recurrence has no carrier on the line. No carrier is
 * invented here — inventing one would be a settlement-method flag by another
 * name, which this brief forbids.
 */
export function basisForPricingType(t: "HOURLY" | "FIXED" | "RECURRING"): LineBasis {
  return t === "HOURLY" ? "RATE" : "AMOUNT";
}

export type RequestLineForCompleteness = {
  provider_person_id?: string | null;
  basis: LineBasis;
  unit_price_cents?: number | null;
  amount_cents?: number | null;
};

/**
 * ⚠⚠ COMPLETE MEANS **EVERY** LINE IS ASSIGNED AND PRICED.
 *
 * A partially-sourced request that returns a punchout cart sends the ERP a
 * requisition it will APPROVE AS IF IT WERE WHOLE — and the unsourced line is
 * then an approved commitment against nobody. If a requester wants to proceed
 * with two of three, they split the third onto its own work request.
 */
export function workRequestIsComplete(lines: RequestLineForCompleteness[]): boolean {
  if (lines.length === 0) return false;
  return lines.every(
    (l) =>
      !!l.provider_person_id &&
      (l.basis === "RATE" ? l.unit_price_cents != null : l.amount_cents != null)
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   WS-2 · THE FAN-OUT
   ═════════════════════════════════════════════════════════════════════════ */

export type FanOutLine = { provider_person_id: string | null | undefined };

/**
 * ⚠⚠ GROUP BY PROVIDER. ONE WORK ORDER PER PROVIDER.
 *
 * A work request with lines for three providers becomes THREE work orders; the
 * same provider on three lines becomes ONE order with three lines. Two providers
 * cannot share a work order — they accept separately, they are paid separately,
 * and `provider_person_id` is REQUIRED on the order.
 *
 * ⚠⚠ AND THE BUYER'S ERP SEES ONE SUPPLIER — PANAMEER — SO ONE PO FANS OUT INTO
 * N WORK ORDERS. That is why `WorkOrder.external_ref` has NO unique constraint:
 * a unique index would reject the second provider on a two-provider PO and look
 * like duplicate detection working correctly.
 *
 * ⚠⚠ ONE FUNCTION, SO BOTH PATHS CANNOT DIVERGE. The web path ("Requester clicks
 * CREATE WORK ORDER") and the inbound-PO path call THIS. If they grouped
 * differently the same work request would mean different things depending on
 * whether an ERP was involved — and nothing on either side would show it.
 * `check:transaction-spine` asserts both paths produce identical grouping.
 */
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

/* ═══════════════════════════════════════════════════════════════════════════
   WS-4 · THE FEE
   ═════════════════════════════════════════════════════════════════════════ */

/**
 * ⚠⚠ COMPUTE THE FEE AND SUBTRACT. NEVER COMPUTE THE NET DIRECTLY.
 *
 * `net + fee` must equal `gross` TO THE CENT, ALWAYS. Computing both
 * independently — `net = round(gross * (10000 - bps) / 10000)` — guarantees that
 * eventually it will not: at 14.9% on $99.99, the two roundings disagree by a
 * cent and the books never balance again.
 *
 * ⚠⚠ IT REUSES `rateBreakdown()` RATHER THAN RE-IMPLEMENTING IT. That function
 * (`lib/display.ts`) already does exactly this arithmetic for the provider
 * onboarding screen — *"`fee` rounds to the nearest cent; `youGet` is the
 * remainder, so the three figures always reconcile exactly"*. A second copy
 * would be a second source of truth for the number a provider is paid, and the
 * two would drift. The fee shown at onboarding and the fee taken at payout are
 * now provably the same function.
 */
export function feeSplit(
  grossCents: number,
  feeBps: number
): { gross_cents: number; fee_cents: number; net_cents: number } {
  const { fee, youGet } = rateBreakdown(grossCents, feeBps);
  return { gross_cents: grossCents, fee_cents: fee ?? 0, net_cents: youGet ?? grossCents };
}

/** ⚠ The invariant every payout and payout line is checked against. */
export function feeReconciles(row: {
  gross_cents: number;
  fee_cents: number;
  net_cents: number;
}): boolean {
  return row.net_cents + row.fee_cents === row.gross_cents;
}

/* ═══════════════════════════════════════════════════════════════════════════
   WS-3 · THE FIVE SETTLEMENT RULES
   ═════════════════════════════════════════════════════════════════════════ */

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
  /** ⚠ Present ONLY so rule 2 can refuse it. It is never read as a price. */
  unit_price_cents?: number | null;
  amount_cents?: number | null;
};

/**
 * ⚠⚠ RULE 2, AS CODE RATHER THAN AS A COMMENT: THE PRICE IS COPIED FROM THE
 * ORDER LINE AND THE CALLER'S PRICE IS **REFUSED**, NOT IGNORED.
 *
 * Ignoring it would be quieter and worse — a caller who believes they set a rate
 * and silently did not is how a wrong number reaches production believing itself
 * reviewed. This is the ONLY place a settlement line's price is assigned.
 */
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

/**
 * The five rules, together, because they are only meaningful together — a draw
 * can satisfy four and still be wrong.
 *
 *   1  basis matches the order line
 *   2  the price is COPIED (delegated to `priceSettlementLine`)
 *   3  RATE cannot exceed ordered quantity; AMOUNT draws ONCE, IN FULL
 *   4  `not_to_exceed_cents` caps the WHOLE order
 *   5  the period sits INSIDE the order's period
 *  ⚠  and settlements only against a RELEASED order
 */
export function assertSettlementDraw(input: {
  order: OrderForSettlement;
  periodStart: Date;
  periodEnd: Date;
  lines: { draft: DraftSettlementLine; orderLine: OrderLineForDraw }[];
  /** Cents already settled against this ORDER, for rule 4. */
  alreadySettledCents: number;
}): void {
  /* ⚠ RELEASED, not ACCEPTED. Two-sided activation means the provider accepting
     is only half — drawing against an order the buyer has not released bills for
     work nobody authorised to start. */
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
