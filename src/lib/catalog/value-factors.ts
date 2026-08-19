/**
 * WHAT A PRODUCT'S VALUE ESTIMATE IS ALLOWED TO REFERENCE.
 *
 * ── ⚠ THE CONSTRAINT IS THE DESIGN, NOT A VALIDATION DETAIL ───────────────────
 *
 * Scott, 2026-08-19: "I or the creator will need to estimate its value (saves a 50,000
 * lawsuit or saves 12% on each contract)... that something has to be one of the things we
 * are capturing in the assessment."
 *
 * So a `PackageValueFactor.basis` may only name a variable `AssessmentWizard` actually
 * collects. A factor that multiplies something nobody was asked produces a number with
 * nothing underneath it — and it would look exactly as authoritative as a real one on the
 * report.
 *
 * `BASIS_REQUIRES` below is the mapping, and `check:catalog-value` reads the WIZARD SOURCE
 * and fails if any of these field names is not collected there. Adding an enum member
 * without adding the question is therefore a build error rather than a silent hole.
 *
 * ⚠ NOTHING IN THIS FILE COMPUTES A VALUE. There is deliberately no `estimate()` here.
 * Whether these factors replace, feed, or reconcile against the top-down `DOLLAR_WEIGHTS`
 * model in `lib/assessment/scoring.ts` is an open decision and was explicitly out of scope
 * for the brief that added them. The unit helper is here because the unit rule must live in
 * exactly one place; the arithmetic is not, because the arithmetic is not decided.
 */

/** Mirrors `enum ValueFactorBasis` in schema.prisma. */
export const VALUE_FACTOR_BASES = [
  "SUPPLIER_SPEND",
  "CONTRACT_SPEND",
  "PURCHASING_HEADCOUNT",
  "REVENUE",
  "EBITDA",
  "FLAT",
] as const;

export type ValueFactorBasis = (typeof VALUE_FACTOR_BASES)[number];

/**
 * basis -> the `AssessmentWizard` state variables it needs.
 *
 * ⚠ `CONTRACT_SPEND` NEEDS TWO, and that is the point of it being its own basis rather
 * than a note on SUPPLIER_SPEND: contract spend is the supplier spend multiplied by the
 * answer to "roughly what share of that is on negotiated contracts or catalogs?". A
 * product that recovers a share of CONTRACTED spend is not the same as one that recovers a
 * share of ALL spend, and the assessment collects both halves.
 *
 * ⚠ `FLAT` REQUIRES NOTHING, on purpose — risk avoidance does not scale with the buyer, so
 * it references no captured variable. That is why the array is empty rather than absent:
 * an empty list is a claim ("needs nothing"), a missing key would be an oversight.
 */
export const BASIS_REQUIRES: Record<ValueFactorBasis, readonly string[]> = {
  SUPPLIER_SPEND: ["spendBand"],
  CONTRACT_SPEND: ["spendBand", "costLeverBand"],
  PURCHASING_HEADCOUNT: ["headcountBand"],
  REVENUE: ["revenueBand"],
  EBITDA: ["ebitdaBand"],
  FLAT: [],
};

/**
 * The unit of `PackageValueFactor.rate`, decided by the basis and written down ONCE.
 *
 * Basis points for every proportional basis; CENTS for `FLAT`. One integer column carries
 * both, so this is the only place that ambiguity is resolved — do not re-derive it at a
 * call site, and do not add a second rate column without deleting this helper.
 */
export const factorUnit = (basis: ValueFactorBasis): "bps" | "cents" =>
  basis === "FLAT" ? "cents" : "bps";

/** True for a basis whose rate scales with something the buyer told us. */
export const isProportional = (basis: ValueFactorBasis) => basis !== "FLAT";
