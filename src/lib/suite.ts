import type { SoftwareSuite } from "@prisma/client";

/**
 * SOFTWARE SUITES — the one place the enum, the catalog and the UI agree
 * (brief_per_job_skill_model WS-1).
 *
 * Three names exist for every suite and they are all load-bearing:
 *
 *   the ENUM      `ORACLE_FUSION_CLOUD`     what the database stores
 *   the PILLAR    "Oracle Fusion Cloud"      what the v5 catalog calls it
 *   the LABEL     "Oracle Cloud"             what a person calls it
 *
 * They are kept together because the failure mode of splitting them is silent.
 * A suite whose pillar string is misspelled in one query does not error — it
 * returns no skills, and the provider sees an empty module list for a system
 * they have worked on for a decade.
 *
 * ADDING A SUITE is: a value in the `SoftwareSuite` enum, a row here, and a
 * column in the catalog spreadsheet. If any one is missed the others make it
 * obvious: `suiteFromPillar` stops resolving and `SUITE_ORDER` stops listing.
 */

type SuiteMeta = {
  /** `Pillar.name` in the v5 catalog — the join to the skill list. */
  pillar: string;
  /** What the UI says. Shorter than the pillar where the pillar is formal. */
  label: string;
  /** Alternate spellings a provider or a résumé might use. */
  aka: string[];
};

export const SUITES: Record<SoftwareSuite, SuiteMeta> = {
  ORACLE_FUSION_CLOUD: {
    pillar: "Oracle Fusion Cloud",
    label: "Oracle Cloud",
    aka: ["Oracle Cloud", "Fusion", "Oracle Fusion", "Oracle Cloud Applications", "OCloud", "Fusion Apps"],
  },
  ORACLE_EBS: {
    pillar: "Oracle E-Business Suite",
    label: "Oracle EBS",
    aka: ["EBS", "E-Business Suite", "Oracle Applications", "Oracle Apps", "R12", "11i"],
  },
  PEOPLESOFT: {
    pillar: "PeopleSoft",
    label: "PeopleSoft",
    aka: ["PSFT", "Oracle PeopleSoft", "PeopleSoft HCM", "PeopleSoft FSCM"],
  },
  WORKDAY: {
    pillar: "Workday",
    label: "Workday",
    aka: ["WD", "Workday HCM", "Workday Financials"],
  },
  SALESFORCE: {
    pillar: "Salesforce",
    label: "Salesforce",
    aka: ["SFDC", "Force.com", "Salesforce.com"],
  },
  CROSS_VENDOR: {
    pillar: "Cross-Vendor (Platform-Neutral)",
    label: "Platform-neutral",
    aka: ["Cross-Vendor", "Platform Neutral", "Vendor-agnostic"],
  },
};

/**
 * Display order. Not alphabetical — it follows the catalog's own weighting, and
 * CROSS_VENDOR sits last because "platform-neutral" is a category of tool
 * rather than a system anybody says they work on.
 */
export const SUITE_ORDER: SoftwareSuite[] = [
  "ORACLE_FUSION_CLOUD",
  "ORACLE_EBS",
  "PEOPLESOFT",
  "WORKDAY",
  "SALESFORCE",
  "CROSS_VENDOR",
];

export const suiteLabel = (s: SoftwareSuite): string => SUITES[s].label;
export const suitePillar = (s: SoftwareSuite): string => SUITES[s].pillar;

/** The catalog pillar name → the enum. Used when reading v5 skill rows. */
export function suiteFromPillar(pillar: string | null | undefined): SoftwareSuite | null {
  if (!pillar) return null;
  const hit = SUITE_ORDER.find((s) => SUITES[s].pillar === pillar);
  return hit ?? null;
}

/**
 * A written suite name → the enum, for résumé text and provider free-typing.
 *
 * Case- and punctuation-insensitive, and it matches the ALIASES too, because
 * "we were on R12" is how people write EBS. Deliberately exact-token rather
 * than substring: "Oracle" alone resolves to nothing, since it is equally
 * Fusion, EBS and PeopleSoft, and guessing between them is the specific error
 * the whole per-job model exists to stop making.
 */
export function suiteFromText(text: string | null | undefined): SoftwareSuite | null {
  if (!text) return null;
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "");
  const t = norm(text);
  if (!t) return null;
  for (const s of SUITE_ORDER) {
    const candidates = [SUITES[s].pillar, SUITES[s].label, ...SUITES[s].aka];
    if (candidates.some((c) => norm(c) === t)) return s;
  }
  return null;
}

/** Every suite mentioned anywhere in a block of text, in catalog order. */
export function suitesMentioned(text: string): SoftwareSuite[] {
  const hay = text.toLowerCase();
  return SUITE_ORDER.filter((s) =>
    [SUITES[s].pillar, SUITES[s].label, ...SUITES[s].aka].some((c) => {
      /*
        Word-bounded, so "WD" does not fire inside "forWarD" and "R12" does not
        fire inside "R120". A false suite on a job is worse than no suite: no
        suite asks the provider one question, a wrong suite silently
        misattributes every skill on that job.
      */
      const escaped = c.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, "i").test(hay);
    })
  );
}
