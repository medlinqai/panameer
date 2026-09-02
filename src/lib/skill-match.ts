/**
 * A TYPED SKILL FINDS THE ONE THAT ALREADY EXISTS (`P1-J1.4-E298`).
 *
 * **SCOTT, 2026-08-31:** *"i added a new skill - purchase requisitions… but that
 * is as i typed it… that means we will get misspellings and non-capitalizations."*
 *
 * The capitalisation half shipped: `addCustomSkill` title-cases what you type.
 * ⚠ THAT WAS THE SMALL HALF, and its own comment said so — `purchase requisitons`
 * became `Purchase Requisitons`, *"still misspelled, still unmatchable, now
 * looking deliberate."* This is the half that matters.
 *
 * ── ⚠⚠ THE PATTERN IS COPIED, NOT INVENTED ───────────────────────────────────
 *
 * `resolveApplicationIds` (`lib/employers.ts:352`) already does this for tools,
 * and its comment states the rule this file implements for skills: *"Matching is
 * case-insensitive against the WHOLE catalog before creating anything, so typing
 * 'oracle fusion' when 'Oracle Fusion' already exists links the baseline row
 * instead of spawning a near-duplicate custom for an admin to clean up later."*
 *
 * ⚠ ONE THING IS STRONGER HERE, DELIBERATELY: that function normalises CASE only.
 * Scott's example needs more — `purchase requisitons` differs from
 * `Purchase Requisitions` by a missing letter AND a plural. So this normalises
 * case, punctuation, whitespace AND a trailing plural `s`, and adds a NEAR tier
 * on top for the misspelling.
 *
 * ── ⚠⚠ AN EXACT-ISH MATCH LINKS SILENTLY. A NEAR MATCH ASKS ──────────────────
 *
 * A skill is a CLAIM ABOUT WHAT SOMEBODY CAN DO. Silently rewriting
 * `Purchase Requisitons` to `Purchase Requisitions` is putting words in their
 * mouth — and if the near match is wrong, it is a false claim with their name on
 * it. So NEAR never auto-corrects; it returns the candidate and the caller asks.
 *
 * ⚠ CUSTOM SKILLS ARE STILL ALLOWED. Scott types real ones. This stops
 * DUPLICATES, not new entries — `kind: "none"` is a normal, supported outcome.
 *
 * ── ⚠⚠ THERE IS A SECOND SKILL MATCHER, AND THAT IS CORRECT. READ THIS ───────
 *
 * `lib/resume/match.ts` exports `matchSkills` (PLURAL) and it already does
 * exact + punctuation-normalised + whole-phrase-containment matching against the
 * catalog. It was found while building this file, and the two were compared
 * before writing a line — they are DIFFERENT CONTRACTS, not a duplication:
 *
 *   `matchSkills`  BATCH and UNATTENDED. It runs over a whole résumé with nobody
 *                  watching, and its own docblock forbids guessing: *"A false
 *                  match is worse than an honest 'unmatched' — unmatched terms
 *                  come back to the caller and are surfaced to the user as an
 *                  import gap."* It has NO edit-distance tier ON PURPOSE.
 *   `matchSkill`   SINGLE and INTERACTIVE. One term, typed deliberately, with a
 *                  human right there to answer a question. That is the only
 *                  situation in which a NEAR tier is safe at all.
 *
 * ⚠⚠ SO THE NEAR TIER MUST NOT BE PUSHED DOWN INTO `matchSkills`. Doing so would
 * inject guesses into the unattended résumé path, which is precisely what that
 * file refuses to do. `check:field-quality` asserts it has not grown one.
 * ⚠ AND THIS FILE MUST NOT BE MERGED INTO IT. Reported at `E298`; two matchers
 * with near-identical names is a real trap, which is why the difference is
 * written down here rather than left to be rediscovered.
 *
 * ⚠ PURE AND DEPENDENCY-FREE so `check:field-quality` can drive every tier with
 * no database.
 */

/**
 * ⚠ NORMALISATION IS WHAT MAKES "EXACT-ISH" EXACT.
 *
 *   lower-case · punctuation to spaces · whitespace collapsed · trailing `s` off
 *
 * ⚠ THE PLURAL IS STRIPPED PER WORD, NOT OFF THE WHOLE STRING. `Purchase
 * Requisitions` -> `purchase requisition`, and `Accounts Receivable` ->
 * `account receivable`, which still matches `Accounts Receivable` because BOTH
 * sides go through this. Stripping only the final character would leave
 * `accounts receivable` unchanged and miss the pair.
 * ⚠ `ss` IS LEFT ALONE — `Business` must not become `busines`, and `Process`
 * must not become `proces`.
 */
export function normaliseSkill(raw: string): string {
  return raw
    .toLowerCase()
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

/**
 * ⚠⚠ WHAT "NEAR" MEANS, AND WHY THESE NUMBERS.
 *
 * After normalisation, a candidate is NEAR when BOTH hold:
 *
 *   1. edit distance <= `NEAR_MAX_EDITS` (2), and
 *   2. edit distance <= 25% of the longer string's length.
 *
 * ⚠ THE SECOND CLAUSE IS WHY THIS IS SAFE ON SHORT NAMES. Distance 2 alone would
 * make `Tax` near `Fax` and `SQL` near `SQR` — a two-character change in a
 * three-character skill is a different skill. The ratio kills those: 2/3 is 67%.
 * ⚠ AND THE FIRST CLAUSE IS WHY IT IS SAFE ON LONG ONES. 25% of
 * `Enterprise Performance Management` is eight edits, which would reach halfway
 * across the catalog; the absolute cap of 2 holds it to a typo or two.
 *
 * ⚠ MEASURED AGAINST SCOTT'S OWN EXAMPLE: `purchase requisitons` normalises to
 * `purchase requisiton` and `Purchase Requisitions` to `purchase requisition` —
 * distance 1, ratio 5%. NEAR, so it asks. That is the row he actually typed.
 *
 * ⚠ A MINIMUM LENGTH, because the ratio alone is not enough below four
 * characters: with `NEAR_MIN_LENGTH` = 4, nothing shorter is ever "near"
 * anything. `ERP` and `EPR` are not the same skill and must not be suggested as
 * such.
 */
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
  /**
   * ⚠ A PROVIDER-AUTHORED ROW. Optional so a caller with only id+name still
   * compiles; absent is treated as baseline.
   */
  isCustom?: boolean;
};

export type SkillMatch =
  /** Normalises to the same thing. ⚠ LINKS SILENTLY — no question asked. */
  | { kind: "exact"; skill: SkillCandidate }
  /** A typo away. ⚠ ASKS. Never applied without an answer. */
  | { kind: "near"; skill: SkillCandidate; typed: string }
  /** A genuinely new skill. Creating it is correct. */
  | { kind: "none" };

/**
 * Match typed text against candidates.
 *
 * ⚠ EXACT WINS OUTRIGHT, always, however many near ones there are. Among near
 * candidates the SMALLEST distance wins, and a tie goes to the shorter name —
 * deterministic, so the same typing always produces the same suggestion.
 */
export function matchSkill(typed: string, candidates: SkillCandidate[]): SkillMatch {
  const t = normaliseSkill(typed);
  if (!t) return { kind: "none" };

  /*
    ⚠⚠ A BASELINE CATALOG ROW OUTRANKS A PROVIDER-AUTHORED ONE, AND THIS IS NOT
    A NEW RULE — it is the one `resolveApplicationIds` states: *"links the
    BASELINE row instead of spawning a near-duplicate custom for an admin to
    clean up later."*

    ⚠ FOUND BY WALKING IT, NOT BY READING IT. The live catalog contains Scott's
    own misspelled custom row `purchase requisitons` and does NOT contain
    `Purchase Requisitions` at all. Without this ordering, typing the CORRECT
    spelling was answered with *"Did you mean purchase requisitons?"* — the
    matcher steering people onto a typo, which is worse than not matching.
    ⚠ IT ONLY BREAKS TIES AND ONLY WITHIN A TIER. An EXACT custom match still
    wins over a NEAR baseline one: an exact match is what the member actually
    typed, and a near one is a guess.
  */
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

/**
 * ⚠ THE PROMPT IS ONE STRING, IN ONE PLACE. CC's words, reported at `E298` for
 * Scott to overrule. It NAMES the candidate and keeps what was typed visible, so
 * the member can see both and choose.
 */
export const didYouMean = (candidateName: string) => `Did you mean ${candidateName}?`;
