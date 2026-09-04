import type { SoftwareSuite } from "@prisma/client";
import { suiteFromPillar, suitesMentioned } from "@/lib/suite";

/**
 * PER-JOB SKILL EXTRACTION (brief_per_job_skill_model WS-3).
 *
 * Reads one job block — an employer's title, description and project text — and
 * answers three questions about THAT job: which catalog skills it used, which
 * software suite it ran on, and therefore which Role it was.
 *
 * PURE. No prisma, no I/O; the caller supplies the vocabulary. Same rule as
 * `parse.ts` and `match.ts`, and it is what lets the harness run the whole
 * precision suite without a database.
 *
 * ── WHY PER-JOB AND NOT PER-PROFILE ──────────────────────────────────────────
 *
 * "General Ledger" on a profile is unanswerable — Oracle's? PeopleSoft's? The
 * same words inside a job that already carries its suite are unambiguous. So
 * the unit of extraction is the job block, and the suite is derived from the
 * block's own contents before the shared modules in it are resolved.
 *
 * ── THE PRECISION GUARDS, AND WHY EACH EXISTS ────────────────────────────────
 *
 * A false skill is far more expensive than a missed one. A missed skill is a
 * chip the provider adds back in the review step; a false one is a claim
 * attributed to a named person against a dated engagement, which is the exact
 * property the model is selling. So every rule below fails toward silence.
 */

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
  /**
   * The block used shared modules but named no system. The WS-4 prompt asks
   * about exactly these jobs and no others.
   */
  needsSuite: boolean;
  /** Derived role name, or null if nothing matched. */
  role: string | null;
  /** Catalog names that matched, for display and for the harness. */
  names: string[];
};

/**
 * Acronyms that are a CATEGORY, not a product.
 *
 * "CRM" in a résumé means the discipline; it is not evidence of Salesforce CRM
 * Analytics. These appear as aliases on real catalog rows, so they cannot just
 * be trusted — they are refused outright, in every context, because there is no
 * amount of surrounding suite evidence that makes "we ran an ERP programme"
 * into a claim about a specific module.
 */
const AMBIGUOUS_ACRONYMS = new Set([
  "CRM", "SCM", "ERP", "AM", "HR", "HCM", "FIN", "IT", "BI", "AI", "API",
  "SQL", "UI", "UX", "QA", "PM", "BA", "SME", "P2P", "O2C", "R2R",
]);

/** Word-boundary regex for a literal phrase. */
function phraseRe(phrase: string, flags: string): RegExp {
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^A-Za-z0-9])${escaped}([^A-Za-z0-9]|$)`, flags);
}

/**
 * Is this alias safe to match anywhere, or only under an anchored suite?
 *
 * A multi-word alias ("Fixed Assets", "Self-Service Procurement") is specific
 * enough to stand alone. A SINGLE TOKEN is not: "GL", "AP", "PO" and "CE" occur
 * in ordinary prose, in ticket numbers and in other vendors' vocabularies, and
 * matching them loosely is how a profile fills with modules nobody worked on.
 *
 * Single tokens are therefore accepted only when BOTH hold:
 *   · they appear in the text as ISOLATED UPPERCASE — "AP" not "Ap" or "ap";
 *   · the job's suite is already known from other evidence (suite-gated).
 *
 * That is the brief's rule, and the ordering matters: the suite must come from
 * something else first, so an acronym can never be the thing that decides which
 * vendor a job belongs to.
 */
function isSingleToken(alias: string): boolean {
  return !/\s/.test(alias.trim());
}

type Hit = { entry: VocabEntry; viaAcronym: boolean };

/** Canonical-name and multi-word-alias hits — safe without a suite. */
function anchoredHits(text: string, vocab: VocabEntry[]): Hit[] {
  const hits: Hit[] = [];
  for (const entry of vocab) {
    /*
      CANONICAL NAMES ARE MATCHED CASE-SENSITIVELY when they are short or
      capitalised oddly, and case-insensitively when they are long enough to be
      unmistakable. "Assets" lowercase in prose ("managed assets") is not the
      Oracle Assets module; "Self-Service Procurement" in any casing is.
    */
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

/**
 * Extract one job's skills, suite and role.
 *
 * Order is the whole design:
 *   1. match only what is safe without knowing the suite;
 *   2. use those, plus any suite named in the prose, to decide the suite;
 *   3. only then resolve shared modules and acronyms against that suite.
 *
 * Doing (3) before (2) is what produces a job tagged Oracle because it said
 * "AP" and a job tagged PeopleSoft because it said "GL".
 */
export function extractJobSkills(text: string, vocab: VocabEntry[]): JobExtraction {
  const blank: JobExtraction = {
    skillIds: [], suite: null, needsSuite: false, role: null, names: [],
  };
  if (!text?.trim()) return blank;

  const hits = anchoredHits(text, vocab);

  /*
    A skill name is UNAMBIGUOUS when the catalog holds it under exactly one
    suite — "Visual Builder Studio" is Oracle's and nobody else's. Those are the
    only hits allowed to vote on which suite this job was.
  */
  const suitesByName = new Map<string, Set<SoftwareSuite>>();
  for (const v of vocab) {
    if (!v.suite) continue;
    suitesByName.set(v.name, (suitesByName.get(v.name) ?? new Set()).add(v.suite));
  }
  const votes = new Map<SoftwareSuite, number>();
  for (const { entry } of hits) {
    if (!entry.suite) continue;
    /*
      A platform-neutral tool cannot tell you the vendor. "SQL" is evidence
      about the work, not about the system — a block mentioning only SQL is an
      unanchored block, not a Cross-Vendor job.
    */
    if (entry.suite === "CROSS_VENDOR") continue;
    if ((suitesByName.get(entry.name)?.size ?? 0) !== 1) continue;
    votes.set(entry.suite, (votes.get(entry.suite) ?? 0) + 1);
  }

  /*
    AN EXPLICIT MENTION OUTWEIGHS CO-OCCURRENCE. "Implemented Oracle Cloud
    Financials" states the suite; inferring from module names is the fallback
    for blocks that do not. Weighted rather than absolute so a block naming one
    system while listing five modules of another still resolves sensibly.
  */
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

  /*
    RESOLVE SHARED MODULES TO THE JOB'S SUITE. "Payables" matched every suite's
    row; only the one for this job's suite survives. Agnostic rows (no suite)
    are always kept — a Cross-Vendor tool belongs to whatever job mentions it.
  */
  const resolved = [...all.values()].filter(({ entry }) => {
    /*
      CROSS_VENDOR IS NOT A COMPETING SUITE. It is the catalog's home for SQL,
      Git and REST — tools that belong to whichever job mentions them. Filtering
      it against the job's suite (as an earlier version did, because
      CROSS_VENDOR is an enum value like any other) silently dropped every
      platform-neutral tool from every job that had a suite, which is every job
      that parsed correctly.
    */
    if (!entry.suite || entry.suite === "CROSS_VENDOR") return true;
    if (!suite) return (suitesByName.get(entry.name)?.size ?? 0) === 1;
    return entry.suite === suite;
  });

  /*
    NEEDS-SUITE: the block used names that exist on more than one suite and gave
    nothing to anchor them. Do not guess — flag the job, ask on that job alone.
  */
  const sharedUnanchored = !suite && hits.some(
    ({ entry }) => entry.suite && (suitesByName.get(entry.name)?.size ?? 0) > 1
  );

  /*
    ROLE IS DERIVED BY WEIGHT OF EVIDENCE, not by first match. A job can carry
    both application modules and technical tools; the majority is the honest
    answer, and the provider can override it.
  */
  const roleVotes = new Map<string, number>();
  for (const { entry } of resolved) {
    roleVotes.set(entry.role, (roleVotes.get(entry.role) ?? 0) + 1);
  }
  /*
    Ties break toward Application-Specific, and by name after that, so the same
    job never derives two different roles on two runs. A functional reading is
    the safer default on a tie: most ERP work is functional, and the provider
    corrects it in one click either way.
  */
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

/**
 * The résumé's CURRENT OR MOST-RECENT employer, as a company SUGGESTION (WS-3).
 *
 * The WS-4 company step prefills with this. It is a suggestion and must stay
 * one: for an independent consultant it is usually their own entity and the
 * right answer; for a W-2 employee it is their employer, which is emphatically
 * NOT the Panameer billing entity a work order is written against. The same
 * string is also already a work-history Employer row, so auto-creating a
 * Company from it would silently produce a second meaning for one name.
 *
 * Current work wins (no end date); otherwise the latest end date; ties break on
 * document order, which is how CVs are written.
 */
export function suggestedCompany(
  /* ⚠ `employer` NULLABLE (`P1-J1.4-E373`). */
  experiences: { employer: string | null; endDate?: string | null }[]
): string | null {
  if (!experiences.length) return null;
  const current = experiences.find((e) => !e.endDate && e.employer?.trim());
  /* ⚠ `!` IS SAFE HERE — the predicate above already required a non-empty
     employer (`P1-J1.4-E373`). */
  if (current) return current.employer!.trim();

  const dated = experiences
    .filter((e) => e.endDate && e.employer?.trim())
    .sort((a, b) => (a.endDate! < b.endDate! ? 1 : a.endDate! > b.endDate! ? -1 : 0));
  /* ⚠ THE FIRST BRANCH IS FILTERED TO NON-EMPTY ABOVE; the second is not, so it
     keeps its optional chain and can legitimately yield null — a résumé whose
     only entries name no company HAS no current employer to report. */
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
  /*
    VENDOR ROLES ONLY, and this is the line that keeps role derivation
    deterministic. Six names exist as both an application module and an
    Operations capability ("Project Costing", "Grants Management"); including
    the agnostic rows would make those six votes for two different roles at
    once. Ops/Project skills carry no aliases precisely because they are not
    résumé vocabulary — nobody writes "Requisitioning & Demand Management" on a
    CV — so excluding them costs nothing real.
  */
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
