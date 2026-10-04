
export const PILLARS = ["FOUNDATIONS", "SCM", "ERP", "HCM"] as const;
export type Pillar = (typeof PILLARS)[number];

export const PILLAR_LABEL: Record<Pillar, string> = {
  FOUNDATIONS: "Foundations",
  SCM: "Supply Chain",
  ERP: "Finance",
  HCM: "People",
};

export const PILLAR_BLURB: Record<Pillar, string> = {
  FOUNDATIONS: "New to Oracle",
  SCM: "Procurement and supply chain",
  ERP: "Finance and accounting",
  HCM: "HR and people",
};

export const GROUP_TO_PILLAR: Record<string, Pillar> = {
  "Foundational Learning Paths": "FOUNDATIONS",
  Procurement: "SCM",
  "Supply Chain Execution": "SCM",
  Accounting: "ERP",
  "Finance & Accounting": "ERP",
  "Core HR": "HCM",
};

export function pillarForGroup(group: string | null | undefined): Pillar | null {
  const g = (group ?? "").trim();
  return g && g in GROUP_TO_PILLAR ? GROUP_TO_PILLAR[g] : null;
}

export const MISSING_PILLARS_NOTE =
  "EPM and CX aren't on Panameer yet. Tell us if you want them";
export const MISSING_PILLARS_HREF = "/support/bug";
