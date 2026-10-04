
import { isPlausibleSkillTerm, STOPWORD_START } from "./parse";

/** Comparison key: lowercase, punctuation and spacing removed. */
const skillKey = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

export type CatalogSkill = {
  id: string;
  name: string;
  role_type_id?: string | null;
};

/** Group rows by a key, PRESERVING every row — used to count multiplicity. */
function groupBy(
  catalog: CatalogSkill[],
  key: (c: CatalogSkill) => string
): Map<string, CatalogSkill[]> {
  const m = new Map<string, CatalogSkill[]>();
  for (const c of catalog) {
    const k = key(c);
    const bucket = m.get(k);
    if (bucket) bucket.push(c);
    else m.set(k, [c]);
  }
  return m;
}

function roleSpanningNames(catalog: CatalogSkill[]): Map<string, CatalogSkill[]> {
  const out = new Map<string, CatalogSkill[]>();
  for (const [name, rows] of groupBy(catalog, (c) => c.name.toLowerCase())) {
    if (rows.length < 2) continue;
    const roles = new Set(rows.map((r) => r.role_type_id ?? ""));
    if (roles.size > 1) out.set(name, rows);
  }
  return out;
}

function deriveRoleAnchor(
  terms: string[],
  allByName: Map<string, CatalogSkill[]>,
  allByKey: Map<string, CatalogSkill[]>
): string | null {
  const tally = new Map<string, number>();
  for (const term of terms) {
    const rows = allByName.get(term.toLowerCase()) ?? allByKey.get(skillKey(term));
    if (!rows || rows.length !== 1) continue;
    const role = rows[0].role_type_id;
    if (role) tally.set(role, (tally.get(role) ?? 0) + 1);
  }
  let best: string | null = null;
  let bestN = 0;
  let tied = false;
  for (const [k, n] of tally) {
    if (n > bestN) {
      best = k;
      bestN = n;
      tied = false;
    } else if (n === bestN) {
      tied = true;
    }
  }
  return tied ? null : best;
}

export function matchSkills(
  parsedSkills: string[],
  catalog: CatalogSkill[]
): { matched: CatalogSkill[]; unmatched: string[] } {
  const byExact = new Map(catalog.map((c) => [c.name.toLowerCase(), c]));
  const byKey = new Map(catalog.map((c) => [skillKey(c.name), c]));

  const terms: string[] = [];
  for (const raw of parsedSkills) {
    const term = raw.trim();
    if (term) terms.push(term);
  }

  const spanning = roleSpanningNames(catalog);
  const anchor =
    spanning.size === 0
      ? null
      : deriveRoleAnchor(
          terms,
          groupBy(catalog, (c) => c.name.toLowerCase()),
          groupBy(catalog, (c) => skillKey(c.name))
        );

  const pickRow = (hit: CatalogSkill): CatalogSkill => {
    if (!anchor) return hit;
    const rows = spanning.get(hit.name.toLowerCase());
    if (!rows) return hit;
    const narrowed = rows.filter((r) => r.role_type_id === anchor);
    return narrowed.length > 0 ? narrowed[0] : hit;
  };

  const matched = new Map<string, CatalogSkill>();
  const unmatched: string[] = [];

  for (const term of terms) {
    const exact = byExact.get(term.toLowerCase());
    if (exact) {
      const row = pickRow(exact);
      matched.set(row.id, row);
      continue;
    }

    const normalized = byKey.get(skillKey(term));
    if (normalized) {
      const row = pickRow(normalized);
      matched.set(row.id, row);
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
      const row = pickRow(contained);
      matched.set(row.id, row);
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
