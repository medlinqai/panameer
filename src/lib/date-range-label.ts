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
 *   no start + end         → "? – 2021"
 *   no start + current     → "? – Present"
 *   nothing                → ""
 *
 * ⚠ "Started 2019" is option 1 of three Scott offered (his stated preference):
 * *"the only one that reads like a sentence rather than a missing value."*
 * ⚠ HE CONFIRMS OR CHANGES IT — this is the one line to edit.
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
  if (e) return `${s ?? "?"} – ${e}`;
  if (isCurrent) return `${s ?? "?"} – Present`;
  return s ? `Started ${s}` : "";
}
