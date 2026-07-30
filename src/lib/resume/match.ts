/**
 * Résumé skills → seeded catalog skills (brief_Q).
 *
 * PURE (no prisma, no I/O) so it can be tested in isolation, the same rule as
 * `parse.ts`. The caller supplies the catalog.
 */

import { isPlausibleSkillTerm, STOPWORD_START } from "./parse";

/** Comparison key: lowercase, punctuation and spacing removed. */
const skillKey = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

export type CatalogSkill = { id: string; name: string };

/**
 * Map a résumé's free-text skills onto the SEEDED CATALOG.
 *
 * Three passes, most confident first:
 *   1. exact, case-insensitive;
 *   2. normalized — "PL/SQL Specialist" ≡ "PL SQL Specialist";
 *   3. conservative whole-phrase containment — a résumé entry like "Oracle
 *      Cloud Procurement" matches the catalog's "Procurement".
 *
 * Pass 3 is deliberately fenced: the catalog name must be ≥ 6 characters and
 * appear on a word boundary. Without those guards short entries match inside
 * unrelated words and the marketplace fills with skills nobody claimed. A false
 * match is worse than an honest "unmatched" — unmatched terms come back to the
 * caller and are surfaced to the user as an import gap.
 */
export function matchSkills(
  parsedSkills: string[],
  catalog: CatalogSkill[]
): { matched: CatalogSkill[]; unmatched: string[] } {
  const byExact = new Map(catalog.map((c) => [c.name.toLowerCase(), c]));
  const byKey = new Map(catalog.map((c) => [skillKey(c.name), c]));

  const matched = new Map<string, CatalogSkill>();
  const unmatched: string[] = [];

  for (const raw of parsedSkills) {
    const term = raw.trim();
    if (!term) continue;

    const exact = byExact.get(term.toLowerCase());
    if (exact) {
      matched.set(exact.id, exact);
      continue;
    }

    const normalized = byKey.get(skillKey(term));
    if (normalized) {
      matched.set(normalized.id, normalized);
      continue;
    }

    const contained = catalog.find((c) => {
      if (c.name.length < 6) return false;
      const re = new RegExp(
        `\\b${c.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
        "i"
      );
      return re.test(term);
    });
    if (contained) {
      matched.set(contained.id, contained);
      continue;
    }

    unmatched.push(term);
  }

  return { matched: [...matched.values()], unmatched };
}

/**
 * The unmatched terms worth OFFERING to the provider (WS-B / E051-5).
 *
 * Policy, decided: SUGGEST AND CONFIRM, never auto-add. An unmatched term is not
 * evidence of a missing catalog entry — it is just as likely to be a fragment,
 * a version string, or a line the section detector mis-bucketed. Auto-adding
 * would pollute the taxonomy that makes the marketplace searchable, and the
 * provider is the only party who knows which of their own terms are real.
 *
 * Two filters before anything reaches them:
 *
 *  - `isPlausibleSkillTerm`, the SAME test the parser applies when deciding what
 *    is a skill at all. A term the parser would have refused must not reappear
 *    as something the provider is invited to tick — that would launder rejected
 *    junk back in through the UI.
 *  - `STOPWORD_START`, so clause fragments ("and Payables") never show up.
 *
 * Deduped case-insensitively and capped, because a list long enough to skim past
 * is a list that gets confirmed wholesale — which is auto-add with extra steps.
 */
export const MAX_SKILL_SUGGESTIONS = 20;

/**
 * STRICTER than the parse-time rule, on purpose.
 *
 * `isPlausibleSkillTerm` decides what may be KEPT from a skills block, where the
 * cost of being wrong is one odd entry in a list the provider is already
 * reviewing. A suggestion costs more: it is a question put to the provider, and
 * a question they have to answer "no" to is one that should not have been asked.
 * Measured on the fixtures, the parse-time rule alone offered "Oracle Cloud
 * application experience since 2017" and "Related Skills for this Job Request" —
 * both six words, both legal by that rule, neither a skill anyone would tick.
 *
 * Three extra tells, all cheap and all specific to prose that leaked into a
 * skills bucket:
 *   - more than four words — real skill names are short;
 *   - a colon — that is a LABEL introducing a list, not a member of one;
 *   - an unbalanced bracket — the term was cut out of a longer phrase.
 */
function isWorthSuggesting(term: string): boolean {
  if (term.split(/\s+/).length > 4) return false;
  if (term.includes(":")) return false;
  const opens = (term.match(/[([]/g) ?? []).length;
  const closes = (term.match(/[)\]]/g) ?? []).length;
  if (opens !== closes) return false;
  return true;
}

export function suggestableSkills(unmatched: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of unmatched) {
    const term = raw.trim().replace(/\s+/g, " ");
    if (!term) continue;
    if (STOPWORD_START.test(term)) continue;
    if (!isPlausibleSkillTerm(term)) continue;
    if (!isWorthSuggesting(term)) continue;
    const key = term.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(term);
    if (out.length >= MAX_SKILL_SUGGESTIONS) break;
  }
  return out;
}
