/**
 * WHAT A SERVICE PRODUCT IS, AND WHICH OF ITS FIELDS ARE MEANINGFUL
 * (brief_solution_types WS1–WS3).
 *
 * ── ⚠ TWO STORED FIELDS, SIX DERIVED LABELS ──────────────────────────────────
 *
 * Scott named six buyer-facing types: AI Agents · Consultation · Monthly Retainer ·
 * Packaged Deployment · Mentoring · Support. THREE OF THE SIX ARE ONE PRODUCT
 * WEARING THREE LABELS — Consultation, Monthly Retainer and Mentoring are all an
 * expert's time, differing by billing and by where they are sold. Six enum members
 * would mean the first buyer wanting a RETAINED MENTOR, or a ONE-OFF SUPPORT CALL,
 * cannot express it without a schema change.
 *
 * So `kind` says WHAT YOU BUY and `pricing_type` says HOW IT BILLS, and the six
 * labels are derived when a surface needs them.
 *
 * ⚠ THE LABELS ARE DELIBERATELY NOT IN HERE. `brief_solution_types` puts them out
 * of scope as a display concern, and nothing on any surface needs them yet. Adding a
 * `kind -> label` map now would be the first thing `check:solution-types` refuses.
 *
 * ── ⚠ THIS FILE DECIDES NO PRICE AND NO RAIL ─────────────────────────────────
 *
 * There is deliberately no `priceFor()` and no `railFor()`. The rule below is an
 * INTEGRITY constraint — which columns may hold a value for which kind — and nothing
 * more. `check:solution-types` asserts that no component, page or lib maps `kind` to
 * a price, a rail or a label; this file has to pass that assertion too.
 *
 * ── ⚠ THE RAIL IS DERIVABLE AND IS NOT DERIVED HERE ──────────────────────────
 *
 * Card is capped at **~$500 per BUYER per rolling window** (`decisions-01.md`,
 * 2026-08-20). ⚠ Per buyer per window, NOT per transaction — four $499 purchases
 * defeat a per-transaction cap. From that, the shape falls out:
 *
 *   DEPLOYABLE at $450/mo, Mentoring, Support  ->  card: self-serve, recurring
 *   DELIVERABLE at $18,000                     ->  ACH or wire: invoice, ageing,
 *                                                  collections
 *   HOURS                                      ->  crosses the line as hours
 *                                                  accumulate
 *
 * ⚠ NO ROUTING IS BUILT. Payments are stubbed; a rail selector written now would be
 * guessing at an integration that does not exist. Written down so the derivation is
 * not re-discovered.
 *
 * ── ⚠ THE THIRD MONEY SHAPE, RECORDED SO IT IS NOT MISSED ────────────────────
 *
 * `decisions-01.md` names two money shapes — a pre-paid `Entitlement` and a
 * post-paid receivable/payable — and files "agent runs" under entitlement.
 * ⚠ `$450/mo · cancel anytime` IS NEITHER: IT RENEWS. A recurring subscription is a
 * THIRD shape and the ledger does not have it yet.
 *
 * ⚠ AND THE CARD-ABLE ONES SHARE A PROPERTY WORTH NOTING: for a `DEPLOYABLE` sold by
 * the same house that operates it there is NO PROVIDER TO PAY — a receivable with no
 * payable leg, no settlement request, no ageing. The simplest money in the product.
 * ⚠ BUT NOT ALWAYS TRUE ANY MORE: Scott dissolved `P1-J2-E007` on 2026-08-21, so an
 * agent is an EXPERT'S product with a `provider_profile_id`. When the expert is not
 * Panameer, a `DEPLOYABLE` DOES have a payable leg. Reported, not modelled.
 */

/** Mirrors `enum PackageKind` in schema.prisma. ⚠ Not `EXPERT`. Not `DEPLOYMENT`. */
export const PACKAGE_KINDS = ["DEPLOYABLE", "HOURS", "DELIVERABLE"] as const;
export type PackageKind = (typeof PACKAGE_KINDS)[number];

/** Mirrors `enum PackagePricingType`. */
export const PRICING_TYPES = ["FIXED", "HOURLY", "TM", "RECURRING"] as const;
export type PricingType = (typeof PRICING_TYPES)[number];

/** Mirrors `enum BillingPeriod`. */
export const BILLING_PERIODS = ["MONTHLY", "ANNUAL"] as const;
export type BillingPeriod = (typeof BILLING_PERIODS)[number];

/**
 * WHICH PRICING SHAPES EACH KIND MAY TAKE.
 *
 * ⚠ `DEPLOYABLE` HAS EXACTLY ONE. An agent that runs until cancelled cannot be a
 * lump sum or a timesheet; if it could, `RECURRING` would not have needed adding.
 */
export const PRICING_FOR_KIND: Record<PackageKind, readonly PricingType[]> = {
  DEPLOYABLE: ["RECURRING"],
  HOURS: ["HOURLY", "RECURRING"],
  DELIVERABLE: ["FIXED"],
};

/**
 * The shape of a row this rule can judge. Deliberately structural rather than the
 * Prisma type, so the harness can hand it a literal and the caller does not have to
 * select every column of `Package`.
 */
export type SolutionRow = {
  kind: PackageKind;
  pricing_type: PricingType;
  billing_period: BillingPeriod | null;
  duration_weeks: number | null;
  /** Row counts, not the rows. */
  milestones: number;
  deliverables: number;
};

/**
 * EVERY WAY A ROW CAN CONTRADICT ITS OWN KIND, as a list of reasons.
 *
 * ── ⚠ `must` IS ENFORCED; `expected` IS NOT — AND THAT IS THE BRIEF'S OWN WORD ──
 *
 * `brief_solution_types` WS3 writes `must be null` / `must be none` for `DEPLOYABLE`
 * and `expected` for `DELIVERABLE`. Only the musts are invariants. Enforcing the
 * *expecteds* would fail two rows that existed before this column did — a draft AI
 * health check and an agent — the moment they took the `DELIVERABLE` default, on a
 * brief whose own instruction is that every existing row must keep behaving exactly
 * as it does today. A guard that fires on data the same brief created is a guard
 * nobody can keep green.
 *
 * ── ⚠ THE `billing_period` RULE IS ONE BIDIRECTIONAL INVARIANT ────────────────
 *
 * The WS3 table states it three times — required for `DEPLOYABLE`, required for
 * `HOURS` if `RECURRING`, must be null for `DELIVERABLE`. All three collapse to:
 * a period is present EXACTLY WHEN the pricing is `RECURRING`. Stated once, it
 * cannot be satisfied in one row of the table and broken in another.
 */
export function solutionViolations(r: SolutionRow): string[] {
  const bad: string[] = [];

  const allowed = PRICING_FOR_KIND[r.kind];
  if (!allowed.includes(r.pricing_type)) {
    bad.push(`${r.kind} may not be priced ${r.pricing_type} (allowed: ${allowed.join(", ")})`);
  }

  /* ⚠ BOTH DIRECTIONS. A FIXED package carrying a period is as wrong as a RECURRING
     one without it — the first is a number nobody will read, the second is $450 with
     no answer to "per what". */
  if (r.pricing_type === "RECURRING" && r.billing_period === null) {
    bad.push("RECURRING needs a billing_period — $450 is not $450/mo");
  }
  if (r.pricing_type !== "RECURRING" && r.billing_period !== null) {
    bad.push(`${r.pricing_type} must not carry a billing_period (${r.billing_period})`);
  }

  /* ⚠ THE DELIVERY CONSTRUCTS. An agent has coverage and setup, not a duration and a
     list of things delivered once. A milestone on a thing that never ends has nothing
     to be a percentage of the completion of. */
  if (r.kind === "DEPLOYABLE") {
    if (r.duration_weeks !== null) {
      bad.push(`DEPLOYABLE must not have duration_weeks (${r.duration_weeks}) — it runs until cancelled`);
    }
    if (r.milestones > 0) {
      bad.push(`DEPLOYABLE must have no milestones (${r.milestones}) — nothing completes`);
    }
    if (r.deliverables > 0) {
      bad.push(`DEPLOYABLE must have no deliverables (${r.deliverables}) — it runs, it does not deliver a list`);
    }
  }

  return bad;
}
