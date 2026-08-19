/**
 * WHAT KIND OF SECTION IS THIS — derived from the title, defensively
 * (brief_learn_app_shell WS1).
 *
 * ── WHY THIS IS WORTH A FILE ─────────────────────────────────────────────────
 *
 * The catalog repeats a four-part rhythm across nearly every course — overview,
 * then create one, then find one, then change one — and 170 sections is far too
 * many to read as a wall of identical subheadings. An icon per kind is what
 * makes a 28-lesson course scannable.
 *
 * ── ⚠ THE TITLES ARE INCONSISTENT, MEASURED FROM THE LIVE DB ─────────────────
 *
 * 38 distinct titles across 170 rows. The four stems and their real spellings:
 *
 *   overview  "1. Course Overview" ×31 · "0. Overview" ×9 · "Learning Path
 *             Overview" ×7 · "2. Functional Area Overview" ×6 · "2. Project
 *             Overview" · "2. Careers Overview"
 *   create    "2. Create New" ×16 · "2. Create new" ×14
 *   find      "3. Find Existing" ×15 · "3. Find existing" ×7
 *   change    "4. Change Existing" ×13 · "4. Change existing" ×2
 *
 * Note "Create New" and "Create new" are two separate rows in the same catalog.
 * So: strip a leading `N.`, trim, lowercase, then match the STEM — not the
 * whole string, which would need 38 cases and gain a 39th next import.
 *
 * ── ⚠ UNMATCHED IS NEUTRAL, NEVER A GUESS ────────────────────────────────────
 *
 * "1. Learn about" ×10 is the interesting one. It reads like an overview and it
 * is NOT mapped to overview, because "learn" is not "overview" and a lesson
 * group labelled with the wrong verb is worse than one labelled with none. Same
 * for "3. Applications", "5. Related Careers", "4. Popular Integrations" and the
 * other 20-odd one-offs: they get the neutral mark.
 */

export type SectionKind = "overview" | "create" | "find" | "change" | "other";

/** `"2. Create new"` → `"create new"`. Leading `N.` / `N)` / bare `N` + space. */
export function normalizeSectionTitle(title: string): string {
  return title
    .replace(/^\s*\d+\s*[.)]?\s*/, "")
    .trim()
    .toLowerCase();
}

export function sectionKind(title: string): SectionKind {
  const t = normalizeSectionTitle(title);
  /*
    ORDER MATTERS, and only for one pair: "find existing" and "change existing"
    both contain "existing", so the VERB has to be what is matched, never the
    noun. Matching on "existing" would give both the same icon.
  */
  if (/\bcreate\b/.test(t)) return "create";
  if (/\bfind\b/.test(t)) return "find";
  if (/\bchange\b/.test(t)) return "change";
  if (/\boverview\b/.test(t)) return "overview";
  return "other";
}
