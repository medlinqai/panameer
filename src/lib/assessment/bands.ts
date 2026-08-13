/**
 * THE BANDS — every money question in the assessment is a band, never a box.
 *
 * An SMB owner does not know last year's supplier spend to the dollar, and
 * asking for one is how a 90-second form becomes an abandoned form. Bands are
 * also the honest shape for the OUTPUT: the report shows ranges because the
 * inputs were ranges, and a single-point estimate built on a band is a false
 * precision the tool would then have to defend on a call.
 *
 * ⚠ EVERY VALUE IS IN CENTS and every range is [low, high]. `high: null` means
 * the top band is open-ended, and the sizing code treats it as `low` rather
 * than inventing a ceiling — the conservative direction. See `bandRange`.
 */

export type Band = {
  /** Stored on the assessment. Stable — changing it invalidates stored answers. */
  id: string;
  /** What the respondent reads. Copy from the assessment-flow-copy prototype. */
  label: string;
  lowCents: number;
  /** null = open-ended top band. */
  highCents: number | null;
};

/*
  $100,000 in cents, as a readability unit — so a band reads `5 * M` for $500K.

  ⚠ THE UNIT IS $100K, NOT $1M. The first version of the EBITDA and spend
  tables was written as though it were $1M and every value came out TEN TIMES
  TOO HIGH: the "$500K–$2M" profit band held $5M–$20M, and the walk's first
  report showed funding of $900K–$3.6M where it should have read $90K–$360K.
  Nothing caught it because the LABELS were right — the numbers were only wrong
  where nobody reads them. `bands.test.ts` now parses each label and asserts the
  cents agree, which is the only check that would have failed.
*/
const M = 100_000_00;

/** Step 0 — "Last year's revenue". */
export const REVENUE_BANDS: Band[] = [
  { id: "lt1m", label: "<$1M", lowCents: 0, highCents: 10 * M },
  { id: "1to5m", label: "$1M–$5M", lowCents: 10 * M, highCents: 50 * M },
  { id: "5to25m", label: "$5M–$25M", lowCents: 50 * M, highCents: 250 * M },
  { id: "gt25m", label: "$25M+", lowCents: 250 * M, highCents: null },
];

/**
 * Step 0 — "Roughly, your profit (EBITDA) last year". OPTIONAL.
 *
 * The bands are absolute dollars rather than margin percentages because that is
 * what the funding math multiplies, and asking an owner for a margin percentage
 * is asking them to do arithmetic in a form.
 */
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

/**
 * Step 2, cost lever — LOCKED COPY EDIT (2026-08-13).
 *
 * The prototype asked Most / Some / Little-or-none. Scott replaced it with
 * percentage bands: "most" is a word two people size differently, and this
 * number is a multiplier on the savings estimate, so the vagueness landed
 * directly in the money.
 */
export type PercentBand = { id: string; label: string; low: number; high: number };

export const COST_LEVER_BANDS: PercentBand[] = [
  { id: "lt20", label: "Less than 20%", low: 0, high: 0.2 },
  { id: "20to40", label: "20–40%", low: 0.2, high: 0.4 },
  { id: "40to60", label: "40–60%", low: 0.4, high: 0.6 },
  { id: "60to80", label: "60–80%", low: 0.6, high: 0.8 },
  { id: "gt80", label: "80%+", low: 0.8, high: 1 },
];

/**
 * Step 2, labor — LOCKED COPY EDIT (2026-08-13).
 *
 * ONE question, not two. The prototype asked "…on purchasing? …on invoices/AP?"
 * as a single field with two answers, which is unanswerable as written and
 * double-counts the person who does both — very common at this size. Scott's
 * replacement asks for the combined headcount across the whole cycle.
 */
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
  { id: "quickbooks", label: "QuickBooks / spreadsheets" },
  { id: "legacy", label: "Legacy ERP (PeopleSoft, JDE, EBS…)" },
  { id: "cloud", label: "Cloud ERP" },
  { id: "unsure", label: "Not sure" },
] as const;

/** The leapfrog flag — legacy ERP gets the "faster, cheaper path" message. */
export const LEAPFROG_PLATFORM = "legacy";

export function findBand(bands: Band[], id: string | null | undefined): Band | null {
  return bands.find((b) => b.id === id) ?? null;
}

/**
 * A band as a [low, high] cent range for arithmetic.
 *
 * The open-ended top band returns [low, low] — NOT [low, Infinity] and not
 * [low, low * 2]. Both alternatives invent a number the respondent did not
 * give; using the floor twice keeps the estimate conservative, which is the
 * standing rule for everything the report shows.
 */
export function bandRange(band: Band | null): [number, number] {
  if (!band) return [0, 0];
  return [band.lowCents, band.highCents ?? band.lowCents];
}
