/**
 * WHAT A SKILL CHIP SAYS — the disambiguation rule, in one place
 * (`P1-A1.3-E401` WS-3).
 *
 * ── ⚠⚠ THE DATA IS RIGHT AND THE CHIP WAS WRONG ────────────────────────────
 *
 * SCOTT saw two chips both reading **"Recruiting"** and reported them as *"two
 * of the same skills - misspelled."* ⚠ THEY ARE NEITHER MISSPELLED NOR
 * DUPLICATES: they are `Recruiting` under **Oracle Fusion Cloud** and
 * `Recruiting` under **Workday** — two different skills a provider must be able
 * to claim separately, sitting in the SAME role, so nothing on the chip told
 * them apart.
 *
 * ── ⚠ MEASURED, AND THE BRIEF'S HEADLINE FIGURE COUNTS SOMETHING ELSE ──────
 *
 * Against `prisma/seed-data/service-catalog.json`:
 *
 *     687 skill rows · 615 distinct names
 *      72 SURPLUS ROWS      <- the brief's "72 collisions"
 *      52 AMBIGUOUS NAMES   <- how many labels are actually not unique
 *     124 rows wear one     <- 18.0% of the catalog, not the brief's ~10%
 *
 * ⚠ `687 - 615 = 72` is the number of rows OVER the distinct count, so it is
 * the right subtraction for "how much duplication is there" and the wrong one
 * for "how many names collide". The same row-count-vs-distinct-count slip has
 * bitten this project before. Both numbers are true; they answer different
 * questions, and the one that governs this rule is 52.
 *
 * ── ⚠⚠ QUALIFY ONLY WHERE IT IS NEEDED ─────────────────────────────────────
 *
 * The brief: *"qualifying all 687 makes the common case noisier to fix 10%."*
 * So the qualifier is earned, never blanket — 82% of chips are unchanged.
 *
 * ⚠ AMBIGUITY IS JUDGED AGAINST THE LIST THE PROVIDER IS CHOOSING FROM, not
 * against the whole catalog. The harm Scott described is picking blind between
 * two identical labels IN FRONT OF HIM; a provider who claims only Workday sees
 * exactly one `Recruiting` and gains nothing from being told which one it is.
 * ⚠⚠ AND ONE SET DRIVES BOTH LISTS — the options and the picked chips — because
 * a chip that renamed itself after being clicked would be its own defect.
 */

/** The least a chip needs: an id, a name, and the domain that separates it. */
export type LabelledSkill = {
  name: string;
  /** The DOMAIN (pillar) name. `getSkillsForRoleTypes` already carries it. */
  area?: string | null;
};

/**
 * The names that appear more than once in `options`, lower-cased for lookup.
 *
 * ⚠ CASE-INSENSITIVE. Two rows differing only in case are the same collision to
 * a reader, and the catalog is human-entered.
 */
export function ambiguousSkillNames(options: readonly LabelledSkill[]): Set<string> {
  const seen = new Map<string, number>();
  for (const o of options) {
    const k = o.name.trim().toLowerCase();
    seen.set(k, (seen.get(k) ?? 0) + 1);
  }
  const out = new Set<string>();
  for (const [k, n] of seen) if (n > 1) out.add(k);
  return out;
}

/**
 * The qualifier a chip should carry, or `null` when its name already stands
 * alone.
 *
 * ⚠ NULL WHEN THERE IS NOTHING HONEST TO ADD. A colliding skill with no domain
 * on the row gets no qualifier rather than an empty separator — the same rule
 * `rate-display.ts` follows for a rate nobody set. Two bare chips is a worse
 * outcome than one, but a dangling `· ` is a worse outcome than two.
 */
export function skillQualifier(
  skill: LabelledSkill,
  ambiguous: Set<string>
): string | null {
  if (!ambiguous.has(skill.name.trim().toLowerCase())) return null;
  const area = skill.area?.trim();
  return area ? area : null;
}
