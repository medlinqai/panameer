/**
 * HOW A MISSING EMPLOYER RENDERS — one helper, one string (`P1-J1.4-E373`).
 *
 * SCOTT, 2026-09-04: *"I was a contractor for 20+ years… Legally I HAVE to have
 * a company (aka employer), but it could just be a one person LLC…so no one
 * tends to mention it."*
 *
 * ⚠⚠ SO `null` IS THE HONEST ANSWER AND `Independent` IS HOW IT READS. Before
 * `E373` the column was `String` and required, so the extractor had to put
 * SOMETHING there — and what it put was the job title. 36 of 250 rows, surfacing
 * as *"You were both at Founder & Principal Consultant"* on 38 of 91 live
 * colleague suggestions.
 *
 * ⚠ ONE HELPER, NOT A STRING REPEATED ACROSS SURFACES. `Employer.name` renders
 * on the profile, the employers list, search, the résumé review and every
 * colleague-overlap reason. Six copies of `?? "Independent"` is six chances to
 * drift, and the one that drifts is the one nobody looks at.
 *
 * ⚠⚠ AND IT IS NOT A GUESS ABOUT A STRING. This helper only ever asks "is this
 * null?". It never inspects the CONTENT of a name to decide whether it looks
 * like a company — `E374` banned that for rendering (*"any filter for 'does this
 * look like a job title' is fragile and would suppress real employers"*) and
 * `E373` extends the ban to writes.
 */

/** ⚠ CC-AUTHORED. Scott can overrule this one word in one place. */
export const NO_EMPLOYER_LABEL = "Independent";

/**
 * The employer name to show, or `Independent` when the résumé named none.
 *
 * ⚠ EMPTY STRING COUNTS AS ABSENT. Rows written before the column was nullable
 * could carry `""`, and an empty label renders as a gap rather than as a fact.
 */
export function employerDisplayName(name: string | null | undefined): string {
  const trimmed = (name ?? "").trim();
  return trimmed === "" ? NO_EMPLOYER_LABEL : trimmed;
}

/** `true` when there is a real company name to show. */
export function hasEmployerName(name: string | null | undefined): boolean {
  return (name ?? "").trim() !== "";
}
