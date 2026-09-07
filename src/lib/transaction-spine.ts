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
