import type { SoftwareSuite } from "@prisma/client";
import { suiteFromPillar, suitesMentioned } from "@/lib/suite";

export type VocabEntry = {
  skillId: string;
  /** Canonical catalog name, in its catalog casing. */
  name: string;
  /** The suite this row belongs to; null for the agnostic roles. */
  suite: SoftwareSuite | null;
  /** Role name, e.g. "Application-Specific". */
  role: string;
  aliases: string[];
};

export type JobExtraction = {
  skillIds: string[];
  /** Resolved suite, or null when the block gave no anchor. */
  suite: SoftwareSuite | null;
  needsSuite: boolean;
  /** Derived role name, or null if nothing matched. */
  role: string | null;
  /** Catalog names that matched, for display and for the harness. */
  names: string[];
};

const AMBIGUOUS_ACRONYMS = new Set([
  "CRM", "SCM", "ERP", "AM", "HR", "HCM", "FIN", "IT", "BI", "AI", "API",
  "SQL", "UI", "UX", "QA", "PM", "BA", "SME", "P2P", "O2C", "R2R",
]);

/** Word-boundary regex for a literal phrase. */
function phraseRe(phrase: string, flags: string): RegExp {
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^A-Za-z0-9])${escaped}([^A-Za-z0-9]|$)`, flags);
}

/** Is this alias safe to match anywhere, or only under an anchored suite? */
function isSingleToken(alias: string): boolean {
  return !/\s/.test(alias.trim());
}

type Hit = { entry: VocabEntry; viaAcronym: boolean };

/** Canonical-name and multi-word-alias hits — safe without a suite. */
function anchoredHits(text: string, vocab: VocabEntry[]): Hit[] {
  const hits: Hit[] = [];
  for (const entry of vocab) {
    // CANONICAL NAMES ARE MATCHED CASE-SENSITIVELY when they are short or
    const longEnough = entry.name.length >= 12 || entry.name.includes(" ");
    if (phraseRe(entry.name, longEnough ? "i" : "").test(text)) {
      hits.push({ entry, viaAcronym: false });
      continue;
    }
    const multiWordAlias = entry.aliases.find(
      (a) => !isSingleToken(a) && phraseRe(a, "i").test(text)
    );
    if (multiWordAlias) hits.push({ entry, viaAcronym: false });
  }
  return hits;
}

/** Single-token acronym hits — only ever used once a suite is known. */
function acronymHits(text: string, vocab: VocabEntry[], suite: SoftwareSuite): Hit[] {
  const hits: Hit[] = [];
  for (const entry of vocab) {
    if (entry.suite !== suite) continue;
    const acronym = entry.aliases.find((a) => {
      const t = a.trim();
      if (!isSingleToken(t)) return false;
      if (AMBIGUOUS_ACRONYMS.has(t.toUpperCase())) return false;
      // Isolated UPPERCASE only — the case carries the signal.
      if (t !== t.toUpperCase()) return false;
      return phraseRe(t, "").test(text);
    });
    if (acronym) hits.push({ entry, viaAcronym: true });
  }
  return hits;
}

/** Extract one job's skills, suite and role. */
export function extractJobSkills(text: string, vocab: VocabEntry[]): JobExtraction {
  const blank: JobExtraction = {
    skillIds: [], suite: null, needsSuite: false, role: null, names: [],
  };
  if (!text?.trim()) return blank;

  const hits = anchoredHits(text, vocab);

  // A skill name is UNAMBIGUOUS when the catalog holds it under exactly one
  const suitesByName = new Map<string, Set<SoftwareSuite>>();
  for (const v of vocab) {
    if (!v.suite) continue;
    suitesByName.set(v.name, (suitesByName.get(v.name) ?? new Set()).add(v.suite));
  }
  const votes = new Map<SoftwareSuite, number>();
  for (const { entry } of hits) {
    if (!entry.suite) continue;
    // A platform-neutral tool cannot tell you the vendor. "SQL" is evidence
    if (entry.suite === "CROSS_VENDOR") continue;
    if ((suitesByName.get(entry.name)?.size ?? 0) !== 1) continue;
    votes.set(entry.suite, (votes.get(entry.suite) ?? 0) + 1);
  }

  // AN EXPLICIT MENTION OUTWEIGHS CO-OCCURRENCE. "Implemented Oracle Cloud
  for (const s of suitesMentioned(text)) {
    votes.set(s, (votes.get(s) ?? 0) + 2);
  }

  const ranked = [...votes.entries()].sort((a, b) => b[1] - a[1]);
  const suite = ranked.length && (ranked.length === 1 || ranked[0][1] > ranked[1][1])
    ? ranked[0][0]
    : null;

  // With a suite in hand, acronyms become safe and shared modules resolve.
  const all = new Map<string, Hit>();
  for (const h of hits) all.set(h.entry.skillId, h);
  if (suite) for (const h of acronymHits(text, vocab, suite)) all.set(h.entry.skillId, h);

  // RESOLVE SHARED MODULES TO THE JOB'S SUITE. "Payables" matched every suite's
  const resolved = [...all.values()].filter(({ entry }) => {
    // CROSS_VENDOR IS NOT A COMPETING SUITE. It is the catalog's home for SQL
    if (!entry.suite || entry.suite === "CROSS_VENDOR") return true;
    if (!suite) return (suitesByName.get(entry.name)?.size ?? 0) === 1;
    return entry.suite === suite;
  });

  // NEEDS-SUITE: the block used names that exist on more than one suite and gave
  const sharedUnanchored = !suite && hits.some(
    ({ entry }) => entry.suite && (suitesByName.get(entry.name)?.size ?? 0) > 1
  );

  // ROLE IS DERIVED BY WEIGHT OF EVIDENCE, not by first match. A job can carry
  const roleVotes = new Map<string, number>();
  for (const { entry } of resolved) {
    roleVotes.set(entry.role, (roleVotes.get(entry.role) ?? 0) + 1);
  }
  // Ties break toward Application-Specific, and by name after that, so the same
  const role =
    [...roleVotes.entries()].sort(
      (a, b) => b[1] - a[1] || a[0].localeCompare(b[0])
    )[0]?.[0] ?? null;

  return {
    skillIds: resolved.map((r) => r.entry.skillId),
    suite,
    needsSuite: sharedUnanchored,
    role,
    names: resolved.map((r) => r.entry.name),
  };
}

/** The résumé's CURRENT OR MOST-RECENT employer, as a company SUGGESTION (WS-3). */
export function suggestedCompany(
  /* `employer` NULLABLE (`P1-J1.4-E373`). */
  experiences: { employer: string | null; endDate?: string | null }[]
): string | null {
  if (!experiences.length) return null;
  const current = experiences.find((e) => !e.endDate && e.employer?.trim());
  if (current) return current.employer!.trim();

  const dated = experiences
    .filter((e) => e.endDate && e.employer?.trim())
    .sort((a, b) => (a.endDate! < b.endDate! ? 1 : a.endDate! > b.endDate! ? -1 : 0));
  // THE FIRST BRANCH IS FILTERED TO NON-EMPTY ABOVE; the second is not, so it
  return dated[0]?.employer?.trim() ?? experiences[0]?.employer?.trim() ?? null;
}

/** Build the vocabulary from catalog rows. Vendor roles only — see below. */
export function buildVocabulary(
  rows: {
    id: string;
    name: string;
    aliases: string[];
    roleType: { name: string };
    pillar: { name: string } | null;
  }[]
): VocabEntry[] {
  // VENDOR ROLES ONLY, and this is the line that keeps role derivation
  return rows
    .filter((r) => r.roleType.name === "Application-Specific" || r.roleType.name === "Technology-Specific")
    .map((r) => ({
      skillId: r.id,
      name: r.name,
      suite: suiteFromPillar(r.pillar?.name),
      role: r.roleType.name,
      aliases: r.aliases ?? [],
    }));
}
