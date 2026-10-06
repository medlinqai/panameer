import { SKILL_NAME_SMALL_WORDS, SKILL_NAME_TERMS } from "@/lib/skill-name-terms";

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

/** A NEW SKILL IS STORED IN TITLE CASE WS-B 3) */
export function titleCaseSkill(raw: string): string {
  return formatSkillName(raw);
}

const TERMS = new Map(SKILL_NAME_TERMS.map((t) => [t.toLowerCase(), t]));
const SMALL = new Set(SKILL_NAME_SMALL_WORDS);

/** Skill / specialization names: lowercase words get Title Case (small words lower, known terms exact). */
export function formatSkillName(raw: string): string {
  // Typed in capitals (PROCURE TO PAY), not a run of acronyms (CEMLI / RICEW): has a real word of 6+ letters.
  const shouting = !/[a-z]/.test(raw) && /(?:^|[^A-Za-z])[A-Z]{6,}(?:[^A-Za-z]|$)/.test(raw) && raw.trim().includes(" ");
  let first = true;
  const cased = (core: string): string => {
    const known = TERMS.get(core.toLowerCase());
    if (known) return known;
    if (!first && SMALL.has(core.toLowerCase())) return core.toLowerCase();
    return core.charAt(0).toUpperCase() + core.slice(1).toLowerCase();
  };
  const part = (p: string): string => {
    const [, pre, core, post] = /^([^A-Za-z0-9]*)(.*?)([^A-Za-z0-9]*)$/.exec(p)!;
    if (!core) return p;
    const out = cased(core);
    first = false;
    return pre + out + post;
  };
  return raw
    .split(" ")
    .map((word) => {
      if (!word) return word;
      // Already has capitals beyond its first letter: the author meant them.
      if (!shouting && /[A-Z]/.test(word.slice(1))) {
        first = false;
        return word;
      }
      // Title-case words stay as typed (Salesforce "Apex" is not Oracle "APEX").
      if (!shouting && /^[^a-z]*[A-Z]/.test(word)) {
        first = false;
        return word;
      }
      const bare = word.replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/g, "");
      const whole = TERMS.get(bare.toLowerCase());
      if (whole && bare.includes("/")) {
        first = false;
        return word.replace(bare, whole);
      }
      return word.split(/([-/])/).map((p) => (p === "-" || p === "/" ? p : part(p))).join("");
    })
    .join(" ");
}
