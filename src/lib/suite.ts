import type { SoftwareSuite } from "@prisma/client";

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
      const escaped = c.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, "i").test(hay);
    })
  );
}
