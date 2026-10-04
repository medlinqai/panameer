
export type Band = {
  /** Stored on the assessment. Stable — changing it invalidates stored answers. */
  id: string;
  /** What the respondent reads. Copy from the assessment-flow-copy prototype. */
  label: string;
  lowCents: number;
  /** null = open-ended top band. */
  highCents: number | null;
};

const M = 100_000_00;

/** Step 0 — "Last year's revenue". */
export const REVENUE_BANDS: Band[] = [
  { id: "lt1m", label: "<$1M", lowCents: 0, highCents: 10 * M },
  { id: "1to5m", label: "$1M–$5M", lowCents: 10 * M, highCents: 50 * M },
  { id: "5to25m", label: "$5M–$25M", lowCents: 50 * M, highCents: 250 * M },
  { id: "gt25m", label: "$25M+", lowCents: 250 * M, highCents: null },
];

export const EBITDA_BANDS: Band[] = [
  { id: "lt100k", label: "Under $100K", lowCents: 0, highCents: 1 * M },
  { id: "100to500k", label: "$100K–$500K", lowCents: 1 * M, highCents: 5 * M },
  { id: "500kto2m", label: "$500K–$2M", lowCents: 5 * M, highCents: 20 * M },
  { id: "gt2m", label: "$2M+", lowCents: 20 * M, highCents: null },
];

/** Step 2, value base — "How much did you spend with outside suppliers?" */
export const SPEND_BANDS: Band[] = [
  { id: "lt250k", label: "<$250K", lowCents: 0, highCents: 2.5 * M },
  { id: "250kto1m", label: "$250K–$1M", lowCents: 2.5 * M, highCents: 10 * M },
  { id: "1to5m", label: "$1M–$5M", lowCents: 10 * M, highCents: 50 * M },
  { id: "gt5m", label: "$5M+", lowCents: 50 * M, highCents: null },
];

export type PercentBand = { id: string; label: string; low: number; high: number };

export const COST_LEVER_BANDS: PercentBand[] = [
  { id: "lt20", label: "Less than 20%", low: 0, high: 0.2 },
  { id: "20to40", label: "20–40%", low: 0.2, high: 0.4 },
  { id: "40to60", label: "40–60%", low: 0.4, high: 0.6 },
  { id: "60to80", label: "60–80%", low: 0.6, high: 0.8 },
  { id: "gt80", label: "80%+", low: 0.8, high: 1 },
];

export type CountBand = { id: string; label: string; low: number; high: number | null };

export const HEADCOUNT_BANDS: CountBand[] = [
  { id: "1", label: "1", low: 1, high: 1 },
  { id: "2to3", label: "2–3", low: 2, high: 3 },
  { id: "4to6", label: "4–6", low: 4, high: 6 },
  { id: "7to10", label: "7–10", low: 7, high: 10 },
  { id: "gt10", label: "More than 10", low: 11, high: null },
];

export const STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY","DC",
] as const;

export const ENTITY_TYPES = [
  { id: "scorp", label: "S-corp / LLC" },
  { id: "ccorp", label: "C-corp" },
  { id: "soleprop", label: "Sole prop" },
] as const;

export const PLATFORMS = [
  {
    id: "quickbooks",
    label: "Small Business Software (QuickBooks, NetSuite, etc.)",
  },
  { id: "legacy", label: "Enterprise-Grade ERP — Legacy (PeopleSoft, JDE, EBS…)" },
  { id: "cloud", label: "Enterprise-Grade ERP — Modern (Oracle Cloud, Salesforce, Workday…)" },
  { id: "unsure", label: "Not sure" },
] as const;

/** The leapfrog flag — legacy ERP gets the "faster, cheaper path" message. */
export const LEAPFROG_PLATFORM = "legacy";

export function findBand(bands: Band[], id: string | null | undefined): Band | null {
  return bands.find((b) => b.id === id) ?? null;
}

export function bandRange(band: Band | null): [number, number] {
  if (!band) return [0, 0];
  return [band.lowCents, band.highCents ?? band.lowCents];
}
