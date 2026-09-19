/**
 * ── ⚠⚠ THE FOUR SERVICE-PRODUCT CATEGORIES — THE CLOSED LIST ───────────────
 *
 * ⚠⚠⚠ THE LIST IS SCOTT'S AND IT IS CLOSED: *"The categories are Scott's and
 * the list is closed: Pre-Project Consultation · Training · Testing ·
 * Mentoring. DO NOT ADD TO IT — he names things."*
 *
 * ⚠ The matching enum lives in `schema.prisma` (`ServiceProductCategory`), so a
 * fifth category takes a `db push` — a decision, not a typo. **These two must
 * agree; change neither alone.**
 *
 * ── ⚠⚠ WHY THIS FILE EXISTS SEPARATELY FROM `experience-attestation.ts` ────
 *
 * ⚠⚠ IT HOLDS NO IMPORTS ON PURPOSE. The capture UI is a CLIENT component and
 * needs the labels; `experience-attestation.ts` imports `prisma`, and importing
 * it from the client dragged `@prisma/adapter-pg` and `pg` into the browser
 * bundle and **failed the build**. ⚠ Measured 2026-09-19, `E563` WS-B.
 * ⚠ **Keep this module free of server imports** or that returns.
 */

export const ATTESTATION_CATEGORIES = [
  { value: "PRE_PROJECT_CONSULTATION", label: "Pre-Project Consultation" },
  { value: "TRAINING", label: "Training" },
  { value: "TESTING", label: "Testing" },
  { value: "MENTORING", label: "Mentoring" },
] as const;

export type AttestationCategory = (typeof ATTESTATION_CATEGORIES)[number]["value"];

/**
 * ⚠⚠ THE THRESHOLD IS DERIVED FROM THE CLAIM, NEVER STORED BESIDE IT.
 * `years >= 3` is computed from the one column that holds the number, so there
 * is no second field that can disagree with it. ⚠ A stored boolean next to a
 * stored number is two facts about one thing, and they drift.
 */
export const ATTESTATION_THRESHOLD_YEARS = 3;

export function meetsThreshold(years: number): boolean {
  return years >= ATTESTATION_THRESHOLD_YEARS;
}

/** ⚠ A claim is a whole number of years, 0–60. Shared so the client's own
 *  pre-validation and the server's refusal cannot disagree about the range. */
export const MAX_ATTESTED_YEARS = 60;
