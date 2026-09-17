/**
 * Résumé skills → seeded catalog skills (brief_Q).
 *
 * PURE (no prisma, no I/O) so it can be tested in isolation, the same rule as
 * `parse.ts`. The caller supplies the catalog.
 */

import { isPlausibleSkillTerm, STOPWORD_START } from "./parse";

/** Comparison key: lowercase, punctuation and spacing removed. */
const skillKey = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

/**
 * ⚠⚠ A SKILL'S IDENTITY IS THE TRIPLE `(role, domain, name)`, NOT THE NAME
 * (`P2-J1.4-E515`). The schema says so — `Skill` is
 * `@@unique([catalog_id, role_type_id, pillar_id, name])`, and its own comment
 * records why a name-only key was wrong: *"'Project Manager' legitimately exists
 * under BOTH Project-Specific/Project Execution and Operations-Specific/Project
 * Portfolio Management, and a name-only key silently collapsed them into one
 * row."*
 *
 * ⚠⚠ THIS FILE FIXES THE **ROLE** HALF OF THAT AND DELIBERATELY NOT THE DOMAIN
 * HALF. See the `THE 46 STAY A COIN FLIP` note on `matchSkills` — that is a
 * ruling with numbers behind it, not an omission.
 *
 * ⚠ `role_type_id` IS OPTIONAL. `onboarding.ts:752` (`resumeSkillIds`) passes the
 * PROVIDER'S OWN skills as the catalog — already resolved to specific rows, with
 * no multi-homing in it — and `check-fixtures.ts:268` passes `[]`. Neither has
 * the column and neither needs it. ⚠⚠ A CALLER THAT OMITS IT GETS TODAY'S
 * BEHAVIOUR EXACTLY: the anchor simply never fires.
 */
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

/**
 * ⚠⚠ THE SIX NAMES THAT SPAN MORE THAN ONE ROLE — THE ENTIRE SCOPE OF THE FIX.
 *
 * ⚠ Measured on `PANAMEER_V1`: **52 multi-homed ACTIVE names — 6 span ROLES, 46
 * are domain-only within one role.** Only the 6 are treated here. A name whose
 * rows all share a role is NOT returned by this function and therefore keeps
 * today's resolution byte for byte.
 *
 * ⚠ A catalog with no `role_type_id` (see `CatalogSkill`) yields a one-element
 * set and so is never role-spanning — the inert path, on purpose.
 */
function roleSpanningNames(catalog: CatalogSkill[]): Map<string, CatalogSkill[]> {
  const out = new Map<string, CatalogSkill[]>();
  for (const [name, rows] of groupBy(catalog, (c) => c.name.toLowerCase())) {
    if (rows.length < 2) continue;
    const roles = new Set(rows.map((r) => r.role_type_id ?? ""));
    if (roles.size > 1) out.set(name, rows);
  }
  return out;
}

/**
 * The role the résumé's OWN unambiguous skills point at — or `null` on a tie.
 *
 * ⚠⚠ ONLY NAMES CARRYING EXACTLY ONE CATALOG ROW VOTE. A multi-homed name must
 * not vote on its own disambiguation: that is circular, and on a résumé carrying
 * several of them the first one read would decide the rest.
 *
 * ⚠ SUBSTRING HITS DO NOT VOTE EITHER. A containment match is a guess, and a
 * guess must not establish the anchor that then resolves everything after it.
 *
 * ⚠⚠ `null` ON A TIE, AND A TIE IS NOT THE SAME AS SILENCE — but both mean the
 * same thing HERE, because a null anchor simply leaves today's behaviour in
 * place rather than queueing anything. ⚠ That is why this build cannot lose a
 * term the old one matched.
 */
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
 *
 * ── ⚠⚠ `P2-J1.4-E515` — THE ROLE HALF, AND ONLY THE ROLE HALF ──────────────
 *
 * ⚠⚠ THE THREE PASSES, THEIR ORDER AND THEIR RESULT ARE UNCHANGED FOR EVERY
 * NAME EXCEPT SIX. `byExact`/`byKey` are still last-wins maps, still built the
 * same way, and still decide every ordinary term. The ONLY addition is
 * `pickRow`, which redirects a match when — and only when — the matched NAME
 * spans more than one ROLE and the résumé's own skills name that role decisively.
 *
 * ⚠ WHY THE REDIRECT MATTERS: `new Map()` keeps the LAST entry for a repeated
 * key, so a role-spanning name resolved to whichever row Postgres returned last.
 * `E509`'s role prune then deletes every skill outside the chosen role — the arc
 * that destroyed ten skills and survived only because `ADFdi` was a name
 * collision. ⚠⚠ Six names, but they are upstream of the prune.
 *
 * ── ⚠⚠ THE 46 STAY A COIN FLIP, AND THAT IS A DECISION ─────────────────────
 *
 * ⚠ The other 46 multi-homed names differ only by DOMAIN (`Inventory`,
 * `Purchasing`, `General Ledger`, `Fixed Assets`, `Core HR`, `Payroll`…). Those
 * modules genuinely exist in Fusion AND EBS AND PeopleSoft, and ⚠⚠ **A RÉSUMÉ
 * THAT SAYS "Inventory" HAS NOT SAID WHICH.** The fact is not in the document,
 * so no matcher can recover it.
 *
 * ⚠⚠ RESOLVING IT HONESTLY WAS BUILT AND MEASURED, AND IT COST TOO MUCH:
 * returning `null` on an unresolvable domain queued **21 of 126 matched terms**
 * and dropped distinct skills **72 → 49 (−32%)**, including 17 real names.
 * Feeding the anchor certifications recovered **one**; feeding it employers and
 * job titles made it **worse** (25 lost) AND broke a genuine three-way tie.
 * ⚠ Scott, 2026-09-16: *"a worse product than a wrong filing."*
 *
 * ⚠⚠ THE CONSEQUENCE, WHICH MUST NOT BE FORGOTTEN: for a multi-ERP consultant
 * the DERIVED DOMAIN, `E507` Part D's recompute, and any domain-based grouping
 * on the profile are **NOT TRUSTWORTHY**. ⚠ `E545` (the provider confirms the
 * domain) is the only route to the missing fact.
 *
 * ⚠ `find()` WAS NOT CHANGED TO `filter()` — pass 3 still yields at most one
 * name per term. Only 16 of 370 terms contain more than one catalog name, and 6
 * of those are already caught by pass 1. Not authorised, and not needed.
 */
export function matchSkills(
  parsedSkills: string[],
  catalog: CatalogSkill[]
): { matched: CatalogSkill[]; unmatched: string[] } {
  /* ⚠⚠ TODAY'S INDEXES, UNCHANGED — last write wins, exactly as before. */
  const byExact = new Map(catalog.map((c) => [c.name.toLowerCase(), c]));
  const byKey = new Map(catalog.map((c) => [skillKey(c.name), c]));

  const terms: string[] = [];
  for (const raw of parsedSkills) {
    const term = raw.trim();
    if (term) terms.push(term);
  }

  const spanning = roleSpanningNames(catalog);
  /* ⚠ Skip the whole anchor when no name in this catalog spans roles — which is
     every caller except the two real catalog reads, and keeps them identical. */
  const anchor =
    spanning.size === 0
      ? null
      : deriveRoleAnchor(
          terms,
          groupBy(catalog, (c) => c.name.toLowerCase()),
          groupBy(catalog, (c) => skillKey(c.name))
        );

  /**
   * ⚠⚠ THE ONLY BEHAVIOUR CHANGE IN THIS FILE, AND IT CANNOT QUEUE A TERM.
   * It takes the row today's maps already chose and returns EITHER a sibling row
   * of the same name under the anchored role, OR that same row back. There is no
   * third outcome — so `unmatched` is untouched by construction.
   */
  const pickRow = (hit: CatalogSkill): CatalogSkill => {
    if (!anchor) return hit;
    const rows = spanning.get(hit.name.toLowerCase());
    if (!rows) return hit;
    const narrowed = rows.filter((r) => r.role_type_id === anchor);
    /* ⚠⚠ ANY ROW UNDER THE ANCHORED ROLE — NOT "exactly one or give up".
       `Project Costing` (4 rows) and `Grants Management` (3) carry SEVERAL rows
       under Application-Specific, differing only by DOMAIN. Requiring a unique
       survivor made those two fall back to an Operations-Specific row, which is
       ⚠ STRICTLY WORSE THAN THE COIN FLIP THE 46 GET: `E509`'s prune deletes by
       `role_type_id`, so an Application-Specific provider did not get the skill
       MISFILED — they got it DELETED.
       ⚠⚠ SCOTT, 2026-09-16: *"A wrong domain is a bad label. A wrong role is a
       missing skill."* The domain here is the same coin flip the 46 already
       carry, and the role is now right. */
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
