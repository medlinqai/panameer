/**
 * ── ⚠⚠ HOW A JOB'S DATES READ ON A PAGE — ONE RULE, ONE PLACE (`P2-J1.4-E549`) ──
 *
 * PURE: no prisma, no React — the profile page, the provider's own wizard list
 * and the colleague-validation screen all import it.
 *
 * ⚠⚠ "Present" IS PRINTED ONLY FOR A JOB THAT IS AFFIRMATIVELY CURRENT.
 * Before this, all three renderers printed "Present" whenever the end date was
 * missing — including an end the importer could not READ. Scott, 2026-09-17:
 * *"It prints 'Present' on the profile page for a job that is not current. That
 * is the overstatement, rendered, on the page I intend to sell on."*
 *
 *   start + end            → "2019 – 2021"
 *   start + current        → "2019 – Present"
 *   start, no end, NOT current → "Started 2019"   ⚠ states what is known, claims
 *                                                   nothing about the end
 *   no start + end         → "Ended 2021"
 *   no start + current     → "Ongoing"
 *   nothing                → ""
 *
 * ⚠ "Started 2019" — CONFIRMED by Scott, 2026-09-17.
 * ⚠⚠ AND THE MIRROR CASES ARE SENTENCES TOO (Scott, 2026-09-17): *"I am not
 * showing a buyer a question mark."* SUPERSEDED, quoted not deleted (`E164`):
 * `"? – 2021"` and `"? – Present"`.
 */
export function dateRangeLabel(
  start: string | null | undefined,
  end: string | null | undefined,
  isCurrent: boolean | null | undefined
): string {
  const y = (d: string | null | undefined) => (d ? d.slice(0, 4) : null);
  const s = y(start);
  const e = y(end);
  if (!s && !e && !isCurrent) return "";
  if (e) return s ? `${s} – ${e}` : `Ended ${e}`;
  if (isCurrent) return s ? `${s} – Present` : "Ongoing";
  return s ? `Started ${s}` : "";
}
