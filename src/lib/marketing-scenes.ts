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
 * SCOTT'S FOUR-COLUMN DECK DIAGRAM, v2 — as data.
 *
 * Geometry is `2. Claude Sub-Files/mockups/erp_flows_v2.html`, approved.
 *
 * ── ⚠ THE THREE RULES THAT MAKE IT CONNECT. DO NOT BREAK THEM ────────────────
 *
 * 1. THE ACTORS ARE FULL-HEIGHT COLUMNS, not floating glyphs. v1 drew them as a
 *    circle at `cx=1005 r=20`, and four provider connectors ended at a fixed
 *    `x=981` at four different heights — two of them 28px and 32px clear of the
 *    circle, pointing at blank canvas (E109). A circle has no straight edge, so
 *    there is no honest x to aim at; nudging coordinates is what produced the
 *    bug. A column has one, at every height, so the mid-air arrowhead is now
 *    structurally impossible rather than merely corrected.
 *
 * 2. EACH DOCUMENT SITS AT THE HEIGHT OF THE STEP IT PARTNERS WITH. Purchase
 *    Order level with Auto-Create Work Order, Acknowledge level with Release
 *    Work Order, Receipt level with Settlement Approval, Payment level with
 *    Auto-Create Payment. Once both ends of a hand-off are at the same height
 *    the connector is a straight line and there is nothing to route.
 *
 * 3. ZERO VERTICAL LANES IN THE GUTTERS. Every earlier attempt hand-placed them
 *    and that is exactly what tangled. If you find yourself adding one, rule 2
 *    has been broken somewhere — MOVE THE CHIP, do not route around it.
 *
 * ⚠ ONE DELIBERATE EXCEPTION, and it is the only elbow in either scene:
 * `Requester Accepts Rate → Req Line`. Req Line is the lower half of the
 * requisition chip and cannot also be 100px further down without splitting one
 * document into two chips. Scott has not asked for that and the two-row chip is
 * true to the document. Leave it.
 *
 * ── THE TWO SCENES ARE NO LONGER THE SAME HEIGHT ─────────────────────────────
 *
 * Fulfillment is 578 tall, Settlement 510 (E110). Settlement holds three
 * documents and five steps against Fulfillment's four and eight, and at a shared
 * 505px the bottom 40% of its magenta panel was empty gradient. Frame-to-frame
 * alignment between the two dialogs was argued for in the previous brief and was
 * not worth what it cost.
 *
 * ── THE THREE ARROW LANGUAGES, UNCHANGED, AND THEY MEAN DIFFERENT THINGS ─────
 *
 *   `mag`  — crosses between Panameer and something else. This is the integration.
 *   `navy` — the requester acting inside Oracle, or Oracle's own doc-to-doc step.
 *   `note` — navy DASHED: a notification, not a transaction. Used once, in
 *            Settlement, where the purchase receipt tells the requester it exists.
 */

/** A navy document chip in the Oracle column. x and width are fixed by the frame. */
export type FlowDoc = {
  y: number;
  h: number;
  /** One or two rows of text, centred in the chip. */
  lines: readonly [string] | readonly [string, string];
  /**
   * Hairline across the middle — TWO DOCUMENTS SHARING ONE BOX, not a decorative
   * divider. It changes the text layout: each row centres in its own half rather
   * than straddling the chip's centre.
   */
  rule?: boolean;
};

/**
 * WHO ACTS. A closed union, not a free string, and not a prefix parsed off the
 * front of the label (E112).
 *
 * "Requester Creates Work Request" split on the first space is fine until
 * somebody writes "Panameer Admin Approves…" and the label silently becomes
 * actor "Panameer" + verb "Admin Approves…". A union also means adding a fourth
 * actor is a type error at every call site rather than a string that renders
 * bold and nobody notices is wrong.
 */
export type FlowActor = "Requester" | "Provider" | "Panameer";

/**
 * A white step chip in the Panameer panel. Height is fixed by the frame.
 *
 * `actor` renders bold and `label` regular, in ONE centred <text> with two
 * <tspan>s — so the pair reads as a sentence and still centres as a unit. The
 * deck right-aligned provider actions and left-aligned requester ones; naming
 * the actor supersedes that, and the labels stay centred.
 *
 * ⚠ `follows` IS EXPLICIT, AND HAS TO BE. v1 derived the little white connector
 * from adjacency — "next chip exactly one gutter below". v2 spaces every chip
 * 15px apart, so in Settlement `Manages Work Order`, `Manages Timeline` and
 * `Creates Settlement Trans.` are 15px apart and are NOT a sequence: they are
 * three separate things the requester, Panameer and provider each own. Adjacency
 * can no longer tell a sequence from a stack, so the data says which it is.
 */
export type FlowStep = {
  y: number;
  actor: FlowActor;
  /** The verb phrase. Rendered after the actor, with a leading space. */
  label: string;
  follows?: boolean;
};

/** See "the three arrow languages" above. */
export type FlowLineKind = "mag" | "navy" | "note";

/**
 * A STRAIGHT HORIZONTAL CONNECTOR — the shape almost every hand-off has, now
 * that each document sits level with its partner.
 *
 * ⚠ MODELLED AS `{y, from, to}` RATHER THAN A PATH STRING, and that is what
 * makes E111's fix safe. A magenta crossing stops at the panel edge and a white
 * stub carries the last 16px onto the chip; authoring those as two `d` strings
 * means two copies of one y, and the v3 spec file already drifted that way (a
 * magenta at y=205 with its stub at y=200). Here the renderer derives the stub
 * from the same number, so the two cannot disagree.
 */
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
  /**
   * Vertical centre of the actor head in both columns. Not derived from the
   * container: the deck sits the Settlement actors above centre, and matching
   * the deck beats a formula that would move them.
   */
  actorCy: number;
  docs: readonly FlowDoc[];
  steps: readonly FlowStep[];
  /**
   * Dashed lineage down the Oracle chips — "this requisition became this
   * agreement became this order". HEADLESS on purpose: it states provenance, it
   * is not a hand-off, and an arrowhead would make it read as one.
   */
  spine?: string;
  connectors: readonly FlowConnector[];
};

/**
 * FULFILLMENT — requisition to released work order. Canvas 1080x578.
 *
 * ⚠ THE ALTERNATION IS THE CLAIM. Requisition lands in Oracle, the bid happens
 * in Panameer, the accepted rate returns to Oracle as a req line, the PO goes
 * back out, the acknowledgement comes home. Group the Oracle chips together and
 * the diagram stops saying the one thing it exists to say.
 */
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
    { y: 95, actor: "Requester", label: "Creates Work Request" },
    { y: 140, actor: "Requester", label: "Invites Providers to Bid", follows: true },
    { y: 185, actor: "Provider", label: "Proposes Rate", follows: true },
    { y: 230, actor: "Requester", label: "Accepts Rate", follows: true },
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
    /*
      Oracle <-> Panameer. ⚠ THESE STOP AT THE PANEL EDGE (560), NOT THE CHIP
      EDGE (576) — E111. The panel gradient's bottom stop is exactly the
      connector colour, so the last 16px and the arrowhead were magenta on
      magenta. The renderer adds the white stub; do NOT author one here.
    */
    { kind: "mag", y: 110, from: 438, to: 560 },
    /*
      ⚠ THE ONE DELIBERATE ELBOW. Req Line is the lower half of the requisition
      chip and cannot also be 100px further down. Do not "fix" it by splitting
      the chip. Freeform, and it leaves the panel edge, so it gets a stub too.
    */
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

/**
 * SETTLEMENT — work delivered to money moved. Canvas 1080x510.
 *
 * ⚠ WHAT IS MISSING IS THE POINT. There is no provider invoice chip, because the
 * provider never sends one: approved settlement writes the receipt, the receipt
 * triggers the ERS invoice, and the payment follows.
 *
 * ⚠ THE TWO REQUESTER LINES CROSS THE ORACLE COLUMN, STRAIGHT, at y=110 and
 * y=155 where that column is empty. This is what the source deck does on slide
 * 4. Routing them over the top of the containers was tried and rejected.
 */
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
    /*
      ⚠ THE FIRST THREE ARE NOT A SEQUENCE — three different actors, each
      reaching in. Only Creates -> Approves flows, hence `follows` on the fourth
      alone. Naming the actor is what finally makes that legible on the page.
    */
    { y: 95, actor: "Requester", label: "Manages Work Order" },
    { y: 140, actor: "Panameer", label: "Manages Timeline via Tracker" },
    { y: 185, actor: "Provider", label: "Creates Settlement Trans." },
    { y: 230, actor: "Requester", label: "Approves Settlement Trans.", follows: true },
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
    /* Panameer <-> Oracle. Panel edge, not chip edge — E111. */
    { kind: "mag", y: 245, from: 560, to: 438 },
    { kind: "mag", y: 395, from: 438, to: 560 },
    /* The provider reaching into the three management steps, and paid at the end. */
    { kind: "mag", y: 110, from: 936, to: 896 },
    { kind: "mag", y: 155, from: 936, to: 896 },
    { kind: "mag", y: 205, from: 936, to: 896 },
    { kind: "mag", y: 400, from: 896, to: 936 },
  ],
};
