/**
 * ── ⚠⚠⚠ OUTSIDE PRODUCTION, MAIL GOES NOWHERE UNLESS NAMED HERE (`E607`) ──
 *
 * ⚠ **`EMAIL_FROM` has been set in Vercel PRODUCTION AND PREVIEW since
 * 2026-07-23, `MAIL_CAPTURE` is a local-only variable that is not in Vercel at
 * all, and previews share the ONE production database.** So any branch deploy
 * could reach any real address, from July 23 onward, with nothing in front of
 * it. That is measured, not suspected.
 *
 * ── ⚠⚠ WHY AN ALLOW-LIST AND NOT A BLOCK-LIST ────────────────────────────
 *
 * ⚠ A block-list has to predict who must not be written to; an allow-list has
 * to be told who may. ⚠⚠ **THE DEFAULT IS THEREFORE EMPTY AND SILENT**, and
 * adding an address is a deliberate act in a commit somebody reviews — not a
 * fallback that fires when a variable is unset.
 *
 * ── ⚠⚠⚠ IT IS A CONSTANT, NOT AN ENVIRONMENT VARIABLE, AND THAT IS THE POINT ─
 *
 * ⚠ `MAIL_CAPTURE` is the cautionary tale: a real rail that has never applied
 * to preview or production **because it is a per-machine variable nobody is
 * reminded about.** ⚠⚠ A RAIL THAT LIVES IN THE CODE CANNOT BE LEFT OFF — the
 * same argument `undeliverable-domains.ts` already makes, and this file is
 * deliberately its twin.
 *
 * ⚠ ONE ADDRESS PER LINE, lower-cased, so adding one is a one-line diff.
 */
export const NON_PRODUCTION_ALLOWLIST: readonly string[] = [
  /* ⚠⚠ EMPTY BY DEFAULT AND MEANT TO STAY THAT WAY. Add an address only to
     test a specific flow on a preview, and take it out again. */
];

/**
 * ⚠ `true` when this recipient may be written to from a non-production
 * environment. ⚠⚠ THE COMPARISON IS ON THE WHOLE ADDRESS, NOT THE DOMAIN — a
 * domain entry would re-open the hole for every colleague at that company.
 */
export function allowedOutsideProduction(email: string): boolean {
  return NON_PRODUCTION_ALLOWLIST.includes(email.trim().toLowerCase());
}
