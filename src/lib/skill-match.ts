
/** Same letters: case, spacing and punctuation ignored, "&" = "and" (catalog auto-link rule). */
export function sameLetters(raw: string): string {
  return raw.toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, " ").trim();
}

export function normaliseSkill(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean)
    .map((w) => (w.length > 3 && w.endsWith("s") && !w.endsWith("ss") ? w.slice(0, -1) : w))
    .join(" ");
}

/** Levenshtein distance. Iterative, two rows — the strings here are short. */
export function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(
        prev[j] + 1,
        cur[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
    prev = cur;
  }
  return prev[b.length];
}

export const NEAR_MAX_EDITS = 2;
export const NEAR_MAX_RATIO = 0.25;
export const NEAR_MIN_LENGTH = 4;

export function isNear(typedNorm: string, candidateNorm: string): boolean {
  if (typedNorm.length < NEAR_MIN_LENGTH || candidateNorm.length < NEAR_MIN_LENGTH) {
    return false;
  }
  const d = editDistance(typedNorm, candidateNorm);
  if (d === 0) return false; // that is EXACT, not near
  const longer = Math.max(typedNorm.length, candidateNorm.length);
  return d <= NEAR_MAX_EDITS && d / longer <= NEAR_MAX_RATIO;
}

export type SkillCandidate = {
  id: string;
  name: string;
  isCustom?: boolean;
};

export type SkillMatch =
  | { kind: "exact"; skill: SkillCandidate }
  | { kind: "near"; skill: SkillCandidate; typed: string }
  /** A genuinely new skill. Creating it is correct. */
  | { kind: "none" };

export function matchSkill(typed: string, candidates: SkillCandidate[]): SkillMatch {
  const t = normaliseSkill(typed);
  if (!t) return { kind: "none" };

  const ordered = [...candidates].sort(
    (a, b) => Number(a.isCustom ?? false) - Number(b.isCustom ?? false)
  );

  let best: { skill: SkillCandidate; d: number } | null = null;
  for (const c of ordered) {
    const n = normaliseSkill(c.name);
    if (!n) continue;
    if (n === t) return { kind: "exact", skill: c };
    if (!isNear(t, n)) continue;
    const d = editDistance(t, n);
    if (!best || d < best.d || (d === best.d && c.name.length < best.skill.name.length)) {
      best = { skill: c, d };
    }
  }
  return best ? { kind: "near", skill: best.skill, typed: typed.trim() } : { kind: "none" };
}

export const didYouMean = (candidateName: string) => `Did you mean ${candidateName}?`;

/**
 * ── ⚠⚠⚠ A NEW SKILL IS STORED IN TITLE CASE (`P2-A2-E602` WS-B 3) ─────────
 *
 * ⚠ SCOTT, 2026-09-22: *"New skills are stored in Title Case."*
 *
 * ⚠⚠⚠ AND THE 18 ORACLE PRODUCT NAMES KEEP THEIRS. Scott, the same day:
 * *"The 18 non-Title-Case names are Oracle product names (iProcurement,
 * eBenefits); leave them."* ⚠ Those are SEED rows and this never touches them —
 * but a provider can TYPE `iProcurement`, and a naive title-caser would store
 * `Iprocurement`, inventing the very defect this is meant to prevent.
 *
 * ⚠⚠ THE RULE, AND IT IS DELIBERATELY CONSERVATIVE: **a word is capitalised
 * only when it is ENTIRELY lower case.** Anything already carrying an upper-case
 * letter is left exactly as typed.
 *   `purchase requisitions` → `Purchase Requisitions`
 *   `iProcurement`          → `iProcurement`   (intra-word capital)
 *   `eBenefits`             → `eBenefits`
 *   `OTBI`, `PIM`, `BI Publisher` → unchanged  (acronyms)
 * ⚠⚠⚠ IT CANNOT "FIX" A NAME SOMEBODY CAPITALISED ON PURPOSE, WHICH IS THE
 * POINT: the failure mode being avoided is a matcher that rewrites a product
 * name, not a member who shouts.
 *
 * ⚠ Small words are NOT lower-cased back down (`of`, `and`): this is a NAME,
 * not a sentence, and `Bill of Materials` vs `Bill Of Materials` is a judgement
 * about a specific product name that no general rule can make correctly.
 * ⚠ Separators are preserved exactly — spaces, `/`, `-`, `&` — so
 * `negotiations/sourcing` becomes `Negotiations/Sourcing`.
 */
export function titleCaseSkill(raw: string): string {
  return raw.replace(/[^\s/&-]+/g, (word) =>
    word === word.toLowerCase() ? word.charAt(0).toUpperCase() + word.slice(1) : word
  );
}
