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

/* ── 5 + 6 · The two ERP-integration flow diagrams ────────────────────────── */

/**
 * SCOTT'S FOUR-COLUMN DECK DIAGRAM, as data.
 *
 * ── WHY THE GEOMETRY LIVES HERE AND NOT IN THE SVG ───────────────────────────
 *
 * The brief offered a choice: drop these strings with the swimlanes they used to
 * feed, or keep them here as data driving the SVG. Kept, and the coordinates
 * came with them — because a label and the box it has to fit inside are one
 * decision, not two. "Invitation to Accept Work Order" fits a 300px chip and
 * would not fit a 200px one; splitting the two across two files is how a copy
 * edit silently overflows a box nobody re-measured.
 *
 * So: this file is WHAT the diagram says and WHERE each piece sits.
 * `FlowDiagram.tsx` is the renderer and holds no content at all — it draws the
 * frame (Oracle box, Panameer panel, the two actors, the arrow markers) that
 * both scenes share and then lays out whatever it is handed.
 *
 * ── ⚠ THE COORDINATE SYSTEM IS SHARED AND FIXED ──────────────────────────────
 *
 * Both scenes are `viewBox="0 0 1080 578"`, and the frame is drawn at identical
 * coordinates in both. That is what lets a reader open one dialog, close it,
 * open the other, and compare — the Oracle box and the Panameer panel do not
 * move between them. Change a frame constant in `FlowDiagram.tsx` and it moves
 * in both, which is the point; change a chip's `y` here and it moves in one.
 *
 * ── THE THREE ARROW LANGUAGES, AND THEY MEAN DIFFERENT THINGS ────────────────
 *
 * Do not collapse them into one colour:
 *   `mag`  — crosses between Panameer and something else. This is the integration.
 *   `navy` — the requester acting inside Oracle, or Oracle's own doc-to-doc step.
 *   `note` — navy DASHED: a notification, not a transaction. Used once, in
 *            Settlement, where the purchase receipt tells the requester it exists.
 */

/** A navy document chip in the Oracle column. `x` and width are fixed by the frame. */
export type FlowDoc = {
  y: number;
  h: number;
  /** One or two rows of text, centred in the chip. */
  lines: readonly [string] | readonly [string, string];
  /** Hairline across the chip's middle — separates two documents sharing one box. */
  rule?: boolean;
};

/** A white step chip in the Panameer panel. Height is fixed by the frame. */
export type FlowStep = { y: number; label: string };

/** See "the three arrow languages" above. */
export type FlowLineKind = "mag" | "navy" | "note";

/** One connector. `d` is an SVG path in the shared 1080x578 coordinate system. */
export type FlowConnector = { kind: FlowLineKind; d: string };

export type FlowSpec = {
  docs: readonly FlowDoc[];
  steps: readonly FlowStep[];
  /**
   * Optional dashed lineage running down the Oracle chips — "this requisition
   * became this agreement became this order", inside the ERP. Not an arrow: it
   * is a statement about provenance, so it has no head.
   */
  spine?: string;
  connectors: readonly FlowConnector[];
};

/**
 * FULFILLMENT — requisition to released work order.
 *
 * ⚠ THE ALTERNATION IS THE CLAIM. Requisition lands in Oracle, the bid happens
 * in Panameer, the accepted rate returns to Oracle as a req line, the PO goes
 * back out, the acknowledgement comes home. Group the Oracle chips together and
 * the diagram stops saying the one thing it exists to say: the documents keep
 * landing in the system of record while the marketplace does the work between.
 *
 * The step chips fall in THREE GROUPS — bid, work order, release — and the gaps
 * between groups are why `FlowDiagram` only draws a little white arrow where two
 * chips are one 8px gutter apart. A group break is a pause, not a hand-off.
 */
export const FULFILLMENT_FLOW: FlowSpec = {
  docs: [
    // One box, two documents, hairline between: the req and the line it carries.
    { y: 88, h: 76, lines: ["Purchase Requisition", "Req Line"], rule: true },
    { y: 240, h: 48, lines: ["Purchase Agreement"] },
    { y: 330, h: 44, lines: ["Purchase Order"] },
    { y: 460, h: 52, lines: ["Purchase Order", "Acknowledge"] },
  ],
  steps: [
    { y: 95, label: "Create Work Request" },
    { y: 133, label: "Invitation Providers to Bid" },
    { y: 171, label: "Providers Propose Rate" },
    { y: 209, label: "Requester Accepts Rate" },
    { y: 290, label: "Auto-Create Work Order" },
    { y: 328, label: "Invitation to Accept Work Order" },
    { y: 420, label: "Accept Work Order" },
    { y: 458, label: "Release Work Order" },
  ],
  spine: "M295 164 V240 M295 288 V330",
  connectors: [
    // The requester, acting inside Oracle.
    { kind: "navy", d: "M102 276 H124 V126 H201" },
    { kind: "navy", d: "M102 292 H140 V352 H201" },
    { kind: "navy", d: "M203 486 H118 V318" },
    // Oracle <-> Panameer: the integration.
    { kind: "mag", d: "M385 110 H556" },
    { kind: "mag", d: "M558 224 H470 V148 H389" },
    { kind: "mag", d: "M385 352 H500 V305 H556" },
    { kind: "mag", d: "M558 473 H480 V486 H389" },
    // Panameer <-> the provider.
    { kind: "mag", d: "M860 148 H900 V236 H981" },
    { kind: "mag", d: "M981 258 H916 V186 H864" },
    { kind: "mag", d: "M860 343 H932 V316 H981" },
    { kind: "mag", d: "M981 336 H948 V435 H864" },
  ],
};

/**
 * SETTLEMENT — work delivered to money moved.
 *
 * ⚠ WHAT IS MISSING IS THE POINT. There is no provider invoice chip, because the
 * provider never sends one: the approved settlement writes the receipt, the
 * receipt triggers the ERS invoice, and the payment follows. Anyone who has run
 * accounts payable reads that off the diagram immediately.
 *
 * The one DASHED connector is the receipt telling the requester it exists —
 * a notification, not a transaction, and the only place the two are distinguished.
 */
export const SETTLEMENT_FLOW: FlowSpec = {
  docs: [
    { y: 210, h: 52, lines: ["Purchase", "Receipt"] },
    { y: 330, h: 46, lines: ["ERS Invoice"] },
    { y: 468, h: 48, lines: ["Payment"] },
  ],
  steps: [
    { y: 95, label: "Manage Work Order" },
    { y: 150, label: "Manage Timeline via Tracker" },
    { y: 205, label: "Create Settlement (Hrs/Pay Rqst)" },
    { y: 243, label: "Settlement Approval" },
    { y: 468, label: "Auto-Create Payment" },
  ],
  connectors: [
    // Oracle's own step: the receipt becomes the evaluated-receipt invoice.
    { kind: "navy", d: "M295 262 V326" },
    // The receipt NOTIFIES the requester. Dashed: nothing is being transacted.
    { kind: "note", d: "M203 236 H70 V258" },
    // The requester, acting inside Oracle.
    { kind: "navy", d: "M102 300 H140 V492 H201" },
    // Requester -> Panameer: one trunk, two branches.
    { kind: "mag", d: "M102 284 H124 V110 H556" },
    { kind: "mag", d: "M124 165 H556" },
    // Panameer <-> Oracle.
    { kind: "mag", d: "M558 258 H495 V236 H389" },
    { kind: "mag", d: "M385 492 H500 V483 H556" },
    // Provider -> Panameer: one trunk, three branches.
    { kind: "mag", d: "M981 284 H910 V110 H864" },
    { kind: "mag", d: "M910 165 H864" },
    { kind: "mag", d: "M910 220 H864" },
    // ...and the payment back out to them.
    { kind: "mag", d: "M860 483 H981 V330" },
  ],
};
