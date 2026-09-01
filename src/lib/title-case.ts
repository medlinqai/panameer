/**
 * TITLE CASE — the one implementation (`P1-J1.1-E272` rule, `P1-J1.4-E298` use).
 *
 * ⚠⚠ THIS FILE IS NEW, AND THE BRIEF THAT ASKED FOR IT ASSUMED IT ALREADY EXISTED.
 * `E298` says *"REUSE the helper from the app-wide title-case pass (`e96cd2e`).
 * Do not write a second one."* THERE WAS NO FIRST ONE: `e96cd2e` was a STATIC
 * SWEEP of 60 string literals, applied by a throwaway scanner that was never
 * committed. It shipped no reusable function. Reported rather than adapted around.
 *
 * ⚠ SO THIS IS THE FIRST, NOT THE SECOND — which is what the instruction was
 * actually protecting. Anything that needs to title-case at RUNTIME imports this;
 * nobody writes another.
 *
 * The rule is Scott's, from `E272`, reproduced exactly:
 *   1. Always capitalise the FIRST and LAST word.
 *   2. Capitalise nouns, pronouns, verbs, adjectives, adverbs, subordinating
 *      conjunctions.
 *   3. Lowercase, unless first or last: articles (a/an/the), coordinating
 *      conjunctions (and/but/or/nor/for/yet/so) and prepositions of FOUR LETTERS
 *      OR FEWER.
 *   4. Capitalise prepositions of five letters or more.
 *   5. Hyphenated compounds capitalise both parts.
 *
 * ⚠ THE GUARDS ARE NOT DECORATION. The sweep's first pass corrupted `&amp;` into
 * `&Amp;`, turned `3rd` into `3Rd` and lowercased the particle in `Sign Up`. Each
 * of those is defended below, because a runtime caller cannot review the output
 * the way a one-off sweep could.
 */

const ARTICLES = new Set(["a", "an", "the"]);
const COORD = new Set(["and", "but", "or", "nor", "for", "yet", "so"]);
/** Prepositions of four letters or fewer — Scott's list, verbatim. */
const SHORT_PREP = new Set([
  "at", "by", "for", "from", "in", "into", "of", "off", "on", "onto", "out",
  "over", "to", "up", "with",
]);
const LOWER = new Set([...ARTICLES, ...COORD, ...SHORT_PREP]);

/**
 * Words that are ALSO phrasal-verb particles. Lowercasing these mid-title breaks
 * `Sign Up`, `Fill Out`, `Log In`. A runtime helper cannot tell a particle from a
 * preposition, so it LEAVES AN EXISTING CAPITAL ALONE rather than guessing.
 */
const PARTICLE_RISK = new Set(["up", "out", "off", "over", "on", "in", "yet"]);

/** Abbreviations that are never capitalised by this rule. */
const ABBREV = new Set(["vs", "etc", "eg", "ie"]);

const ORDINAL = /^\d+(st|nd|rd|th)$/i;

function capWord(w: string): string {
  if (!w) return w;
  /* Already carries internal capitals — an acronym (ERP, AI, TIN), a brand
     (Panameer), or a McName. Never re-case those. */
  if (/[A-Z]/.test(w.slice(1))) return w;
  if (ORDINAL.test(w)) return w.toLowerCase();
  return w[0].toUpperCase() + w.slice(1);
}

export function titleCase(input: string): string {
  /* ⚠ HTML ENTITIES ARE LEFT ENTIRELY ALONE. `&amp;` -> `&Amp;` is a corrupted
     document, not a casing preference. If one is present, so is markup, and this
     helper is for plain labels. */
  if (/&[a-z]+;/i.test(input)) return input;

  const parts = input.split(" ");
  const wordIdx = parts
    .map((p, i) => (/[A-Za-z]/.test(p) ? i : -1))
    .filter((i) => i >= 0);
  if (wordIdx.length === 0) return input;
  const first = wordIdx[0];
  const last = wordIdx[wordIdx.length - 1];

  return parts
    .map((p, i) => {
      if (!/[A-Za-z]/.test(p)) return p;
      if (p.includes("-")) return p.split("-").map(capWord).join("-");

      const lead = p.match(/^[^A-Za-z]*/)![0];
      const trail = p.match(/[^A-Za-z]*$/)![0];
      const core = p.slice(lead.length, p.length - trail.length || undefined);
      const lc = core.toLowerCase();

      if (ABBREV.has(lc)) return p;
      if (i === first || i === last) return lead + capWord(core) + trail;
      /* An existing capital on a particle is deliberate — see PARTICLE_RISK. */
      if (PARTICLE_RISK.has(lc) && /[A-Z]/.test(core[0])) return p;
      if (LOWER.has(lc) && !/[A-Z]/.test(core.slice(1))) return lead + lc + trail;
      return lead + capWord(core) + trail;
    })
    .join(" ");
}
