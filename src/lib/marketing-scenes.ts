
/* ── 1 · Spend Overview ───────────────────────────────────────────────────── */

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
  buyer: ["Start Learning", "Create Work", "Search Service Products", "Manage Work", "Pay Providers", "Community"],
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

/* ── 5 + 6 · The two ERP-integration flow diagrams ────────────────────────── */

/** A navy document chip in the Oracle column. x and width are fixed by the frame. */
export type FlowDoc = {
  y: number;
  h: number;
  /** One or two rows of text, centred in the chip. */
  lines: readonly [string] | readonly [string, string];
  rule?: boolean;
};

export type FlowActor = "Buyer" | "Provider" | "Panameer";

export type FlowStep = {
  y: number;
  actor: FlowActor;
  /** The verb phrase. Rendered after the actor, with a leading space. */
  label: string;
  follows?: boolean;
};

/** See "the three arrow languages" above. */
export type FlowLineKind = "mag" | "navy" | "note";

export type FlowRun = { kind: FlowLineKind; y: number; from: number; to: number };

/** Anything not a straight horizontal: the Oracle-internal steps and the one elbow. */
export type FlowPath = { kind: FlowLineKind; d: string };

export type FlowConnector = FlowRun | FlowPath;

/** Narrowing helper — a run carries a y, a freeform path carries a d. */
export function isRun(c: FlowConnector): c is FlowRun {
  return (c as FlowRun).y !== undefined;
}

export type FlowSpec = {
  /** Canvas height. Fulfillment 578, Settlement 510. Width is always 1080. */
  canvasH: number;
  /** Height of all four columns. They start at y=40 and share this. */
  containerH: number;
  actorCy: number;
  docs: readonly FlowDoc[];
  steps: readonly FlowStep[];
  spine?: string;
  connectors: readonly FlowConnector[];
};

export const FULFILLMENT_FLOW: FlowSpec = {
  canvasH: 578,
  containerH: 505,
  actorCy: 262,
  docs: [
    // One box, two documents, hairline between: the req and the line it carries.
    { y: 88, h: 76, lines: ["Purchase Requisition", "Req Line"], rule: true },
    { y: 210, h: 44, lines: ["Purchase Agreement"] },
    // Level with "Panameer Creates Work Order" (rule 2).
    { y: 303, h: 44, lines: ["Purchase Order"] },
    // Level with "Panameer Releases Work Order" (rule 2).
    { y: 472, h: 46, lines: ["Purchase Order", "Acknowledge"] },
  ],
  steps: [
    { y: 95, actor: "Buyer", label: "Creates Work Request" },
    { y: 140, actor: "Buyer", label: "Invites Providers to Bid", follows: true },
    { y: 185, actor: "Provider", label: "Proposes Rate" },
    { y: 230, actor: "Buyer", label: "Accepts Rate", follows: true },
    { y: 310, actor: "Panameer", label: "Creates Work Order" },
    { y: 355, actor: "Panameer", label: "Invites Provider to Accept WO", follows: true },
    { y: 435, actor: "Provider", label: "Accepts Work Order" },
    { y: 480, actor: "Panameer", label: "Releases Work Order", follows: true },
  ],
  spine: "M332 164 V210 M332 254 V303",
  connectors: [
    /* The requester acting inside Oracle. Lands on a chip edge each time. */
    { kind: "navy", y: 110, from: 144, to: 226 },
    { kind: "navy", y: 325, from: 144, to: 226 },
    { kind: "navy", y: 495, from: 226, to: 144 },
    { kind: "mag", y: 110, from: 438, to: 560 },
    { kind: "mag", d: "M560 245 H508 V143 H438" },
    { kind: "mag", y: 325, from: 438, to: 560 },
    { kind: "mag", y: 495, from: 560, to: 438 },
    /* Panameer <-> the provider. Panel edge (896) for the same reason. */
    { kind: "mag", y: 155, from: 896, to: 936 },
    { kind: "mag", y: 205, from: 936, to: 896 },
    { kind: "mag", y: 375, from: 896, to: 936 },
    { kind: "mag", y: 455, from: 936, to: 896 },
  ],
};

export const SETTLEMENT_FLOW: FlowSpec = {
  canvasH: 510,
  containerH: 430,
  actorCy: 252,
  docs: [
    // Level with "Requester Approves Settlement Trans." (rule 2).
    { y: 222, h: 46, lines: ["Purchase", "Receipt"] },
    { y: 298, h: 44, lines: ["ERS Invoice"] },
    // Level with "Panameer Auto-Creates Payment" (rule 2).
    { y: 372, h: 46, lines: ["Payment"] },
  ],
  steps: [
    { y: 95, actor: "Buyer", label: "Manages Work Order" },
    { y: 140, actor: "Panameer", label: "Manages Timeline via Tracker" },
    { y: 185, actor: "Provider", label: "Creates Settlement Trans." },
    { y: 230, actor: "Buyer", label: "Approves Settlement Trans.", follows: true },
    { y: 380, actor: "Panameer", label: "Auto-Creates Payment" },
  ],
  connectors: [
    /* Oracle's own step: the receipt becomes the evaluated-receipt invoice. */
    { kind: "navy", d: "M332 268 V298" },
    /* Requester -> Panameer, straight across the empty top of the Oracle column. */
    { kind: "mag", y: 110, from: 144, to: 560 },
    { kind: "mag", y: 155, from: 144, to: 560 },
    /* The receipt NOTIFIES the requester. Dashed: nothing is being transacted. */
    { kind: "note", y: 245, from: 226, to: 144 },
    /* The requester acting inside Oracle. */
    { kind: "navy", y: 395, from: 144, to: 226 },
    { kind: "mag", y: 245, from: 560, to: 438 },
    { kind: "mag", y: 395, from: 438, to: 560 },
    /* The provider reaching into the three management steps, and paid at the end. */
    { kind: "mag", y: 110, from: 936, to: 896 },
    { kind: "mag", y: 155, from: 936, to: 896 },
    { kind: "mag", y: 205, from: 936, to: 896 },
    { kind: "mag", y: 400, from: 896, to: 936 },
  ],
};
