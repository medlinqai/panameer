/**
 * DATA FOR THE FOUR AGENT SCENES on the marketing home.
 *
 * ⚠ ALL FIGURES ARE ILLUSTRATIVE and Scott has approved them; the scenes are
 * presentational, wired to nothing. They live here rather than inline in JSX
 * because three of the four are charts or tables that render the same numbers
 * twice — the chart AND the table view, in the dashboard's case — and a second
 * copy is how the two come to disagree.
 */

/* ── 1 · Spend Overview ───────────────────────────────────────────────────── */

/**
 * ⚠ EXACTLY TWO COLOURS, AND THAT IS A METHOD CONSTRAINT, NOT A STYLE CHOICE.
 *
 * Magenta and blue were validated together for colourblind separation on a
 * light surface; adding a third failed that check. Do not introduce a third
 * series colour to this dashboard without re-running it.
 */
export const SPEND_ON = "#D72CD6";
export const SPEND_OFF = "#4b7bef";

/** [label, on-contract $M, off-contract $M] */
export type SpendRow = readonly [string, number, number];

export const SPEND_BY_CATEGORY: SpendRow[] = [
  ["Clinical supplies", 5.2, 0.9],
  ["Facilities", 3.1, 0.6],
  ["IT & software", 2.8, 0.3],
  ["Professional services", 2.2, 0.7],
  ["Logistics", 1.4, 0.4],
];

export const SPEND_BY_BUYER: SpendRow[] = [
  ["Clinical ops", 6.1, 1.0],
  ["Facilities", 3.4, 0.7],
  ["Corporate", 2.9, 0.6],
  ["Regional", 2.3, 0.6],
];

export const SPEND_BY_SUPPLIER: SpendRow[] = [
  ["Medline", 2.4, 0.2],
  ["Henry Schein", 1.9, 0.3],
  ["Grainger", 1.5, 0.4],
  ["Iron Mountain", 1.1, 0.2],
  ["Cintas", 0.9, 0.3],
];

/**
 * [quarter, active, new]
 *
 * ⚠ THESE RENDER AS TWO CHARTS WITH SEPARATE SCALES, NEVER ONE PLOT WITH TWO
 * Y-AXES. Active runs ~1,200 and new runs ~40; on a shared scale the "new"
 * line is a flat line on the floor, and on a dual axis the chart can be made to
 * say anything by choosing where the axes cross. Two small charts is the honest
 * shape. See `SupplierCountPair`.
 */
export const SUPPLIER_COUNT: readonly (readonly [string, number, number])[] = [
  ["Q1", 1180, 42],
  ["Q2", 1215, 55],
  ["Q3", 1238, 38],
  ["Q4", 1240, 29],
];

export const SPEND_KPIS = [
  { k: "Total spend", v: "$17.6M", d: "▲ 6.2%", dir: "up" as const },
  { k: "Spend on contract", v: "83%", d: "▲ 4 pts", dir: "up" as const },
  { k: "Rogue spend", v: "4.2%", d: "▼ 1.1 pts", dir: "dn" as const },
  { k: "Active suppliers", v: "1,240", d: "▼ 38", dir: "dn" as const },
];

/** The requester rail, matching REQUESTER_NAV plus an Analytics group. */
export const SPEND_RAIL = {
  buyer: ["Start Learning", "Create Work", "Search Packages", "Manage Work", "Pay Providers", "Community"],
  analytics: ["Spend", "Savings", "Contracts", "Suppliers"],
  active: "Spend",
};

/* ── 3 · W-9 validation ───────────────────────────────────────────────────── */

export const W9_FIELDS: readonly (readonly [string, string])[] = [
  ["1 Name (as shown on your income tax return)", "Cedarline Industrial LLC"],
  ["2 Business name / disregarded entity", "Cedarline Supply Co."],
  ["3a Federal tax classification", "LLC — S corporation"],
  ["5 Address", "4120 Halstead Ave"],
  ["6 City, state, ZIP", "Cincinnati, OH 45242"],
  ["Part I · Employer identification number", "34-19•••••"],
  ["Part II · Signature of U.S. person", "M. Reyes"],
  ["Date", "08/11/2026"],
];

export type W9Check = { ok: boolean; title: string; detail: string };

/**
 * ⚠ SIX PASS, ONE WARNS — AND THE AGENT DOES NOT AUTO-APPROVE.
 *
 * The honest version and also the more persuasive one: an agent that clears a
 * name mismatch on its own is the thing a procurement lead will not trust.
 */
export const W9_CHECKS: W9Check[] = [
  { ok: true, title: "TIN is structurally valid", detail: "EIN format, checksum and prefix all consistent with an Ohio-registered entity." },
  { ok: true, title: "Name / TIN combination matches IRS records", detail: "IRS TIN Matching returned code 1 — name and TIN match." },
  { ok: true, title: "Form revision is current", detail: "Rev. March 2024 is the edition in force. Earlier revisions are rejected." },
  { ok: true, title: "Tax classification is consistent", detail: "LLC taxed as an S corporation — matches the entity type given at registration." },
  { ok: true, title: "Signed and dated", detail: "Part II signature present; dated within the last 90 days." },
  { ok: true, title: "Address matches the remit-to on file", detail: "4120 Halstead Ave, Cincinnati OH 45242 — exact match." },
  { ok: false, title: "Business name differs from the registration", detail: "W-9 line 2 reads Cedarline Supply Co.; the supplier entered Cedarline Industrial. Common for a DBA — confirm which name goes on the purchase order." },
];

/* ── 4 · Work request → matched talent ────────────────────────────────────── */

export type Expert = {
  initials: string;
  name: string;
  title: string;
  rate: string;
  tags: string[];
  validated: boolean;
  top?: boolean;
  avatar: string;
};

export const WR_EXPERTS: Expert[] = [
  { initials: "MD", name: "Marelise D.", title: "Procurement Contracts lead · 12 yrs · ★ 4.9 (23)", rate: "$185",
    tags: ["Oracle Cloud", "Contracts", "Migration", "Available this week"], validated: true, top: true,
    avatar: "linear-gradient(135deg,#D72CD6,#8a2be2)" },
  { initials: "LA", name: "Linus A.", title: "Procurement & sourcing architect · 15 yrs · ★ 4.8 (41)", rate: "$165",
    tags: ["Oracle Cloud", "Sourcing", "P2P"], validated: true,
    avatar: "linear-gradient(135deg,#4b7bef,#8a2be2)" },
  { initials: "ER", name: "Eddie R.", title: "Fusion procurement consultant · 9 yrs · ★ 4.9 (17)", rate: "$150",
    tags: ["Oracle Cloud", "Supplier Portal"], validated: false,
    avatar: "linear-gradient(135deg,#2fb37a,#4b7bef)" },
  { initials: "PN", name: "Priya N.", title: "P2P functional lead · 11 yrs · ★ 4.7 (29)", rate: "$140",
    tags: ["Oracle Cloud", "Invoicing", "Contracts"], validated: true,
    avatar: "linear-gradient(135deg,#e14b8a,#D72CD6)" },
];

export const WR_SCOPE = [
  "Configure contract types, clauses and approval rules",
  "Migrate 240 active supplier agreements",
  "Enable contract compliance checks on requisition lines",
];

export const WR_SKILLS = ["Oracle Cloud", "Procurement Contracts", "P2P", "Supplier Portal"];

export const WR_TERMS: readonly (readonly [string, string])[] = [
  ["Engagement", "Hourly, ~80 hrs"],
  ["Start", "Week of 1 Sep 2026"],
  ["Location", "Remote, US hours"],
  ["Budget guide", "$140–$190 / hr"],
];
