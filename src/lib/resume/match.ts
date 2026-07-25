/**
 * Résumé skills → seeded catalog skills (brief_Q).
 *
 * PURE (no prisma, no I/O) so it can be tested in isolation, the same rule as
 * `parse.ts`. The caller supplies the catalog.
 */

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
