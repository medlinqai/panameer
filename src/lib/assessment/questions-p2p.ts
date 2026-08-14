/**
 * THE P2P QUESTION BANK, in code.
 *
 * SOURCE OF TRUTH: `2. Claude Sub-Files/question_bank_p2p.md` for the eight
 * capability domains and their maturity ladders, and the `assessment_flow_copy`
 * prototype for the exact wording of the money questions and the AI-mode
 * question. Where the two differ, the prototype wins — it is the copy Scott
 * iterated on, and the bank is the structure underneath it.
 *
 * ── THE LADDER IS THE SAME FIVE RUNGS EVERYWHERE ─────────────────────────────
 *
 * Manual → Spreadsheet → System → Integrated → AI-driven, scored 10/20/30/40/50
 * and phrased per domain in the respondent's own words ("they just ask, by
 * email"), never in ERP jargon. The consistency is not decoration: it is the
 * only reason one score can roll up across eight domains and, later, across
 * four processes.
 *
 * ── "NOT SURE" IS AN ANSWER, NOT A SKIP ──────────────────────────────────────
 *
 * Every ladder ends with it, and it scores `null` rather than 0. A domain
 * nobody can describe is a real finding — usually "no owner" — and scoring it
 * as the worst rung would put it top of the opportunity list on the strength of
 * an admission of ignorance. It is excluded from the maturity average and
 * surfaced separately. See `scoring.ts`.
 */

export const MATURITY_RUNGS = [10, 20, 30, 40, 50] as const;
export type Rung = (typeof MATURITY_RUNGS)[number];

export type CapabilityDomain = {
  /** Stable key — stored in the answers JSON. Renaming breaks stored reports. */
  key: string;
  /** Plain-language name for the report. */
  name: string;
  /** The formal capability-domain name, shown as the parenthetical. */
  formal: string;
  /** The maturity question, in the owner's language. */
  question: string;
  /** Five rungs, 10→50, in order. */
  rungs: string[];
  /**
   * ⭐ in the prototype — the domain where the cost lever bites hardest, so a
   * low score here is worth more than a low score elsewhere at equal spend.
   * See `DOLLAR_WEIGHTS` in scoring.ts.
   */
  costLever?: boolean;
};

export const P2P_DOMAINS: CapabilityDomain[] = [
  {
    key: "requisitioning",
    name: "Requesting what you need to buy",
    formal: "Requisitioning",
    question: "How do people request something to buy?",
    rungs: [
      "Manual — ask by email, text, in person",
      "A spreadsheet or form",
      "A system that routes for approval",
      "Self-service with catalogs & policy",
      "AI-driven — drafts, routes, flags off-policy",
    ],
  },
  {
    key: "sourcing",
    name: "Finding and choosing suppliers",
    formal: "Sourcing",
    question: "How do you decide who to buy from, and at what price?",
    costLever: true,
    rungs: [
      "Whoever we always use",
      "Collect a few quotes by hand",
      "A sourcing / RFQ tool",
      "Tied to approved suppliers & spend data",
      "AI recommends & scores options",
    ],
  },
  {
    key: "contracts",
    name: "Managing supplier contracts",
    formal: "Contract Management",
    question: "Where do your supplier contracts live, and how do you track them?",
    costLever: true,
    rungs: [
      "Paper / PDFs in a drawer or inbox",
      "A tracker with dates someone maintains",
      "A contract repository with reminders",
      "Linked to spend and compliance, auto-alerts",
      "AI reads contracts, flags terms and risks",
    ],
  },
  {
    key: "purchase_orders",
    name: "Issuing and tracking purchase orders",
    formal: "Purchase Order Management",
    question: "How do you place and track orders with suppliers?",
    rungs: [
      "Email / phone; no formal PO",
      "POs typed and logged by hand",
      "POs created and tracked in a tool",
      "POs flow to receiving and invoicing automatically",
      "AI creates, routes and monitors POs",
    ],
  },
  {
    key: "receiving",
    name: "Confirming what you received",
    formal: "Goods & Services Receipt",
    question: "How do you confirm you actually got what you ordered?",
    rungs: [
      "Someone eyeballs it; often not recorded",
      "Receipts noted in a log",
      "Receipts recorded against the order",
      "Receiving auto-matches order → invoice",
      "AI reconciles receipts, flags shortages",
    ],
  },
  {
    key: "invoices",
    name: "Processing supplier invoices",
    formal: "Invoice matching",
    question: "How do supplier invoices get processed?",
    rungs: [
      "Manual / keyed in",
      "A spreadsheet",
      "In a system, matched by hand",
      "Auto-matched to PO & receipt",
      "AI reads, matches, codes and flags issues",
    ],
  },
  {
    key: "payments",
    name: "Paying suppliers",
    formal: "Payments & Cash",
    question: "How do you pay suppliers?",
    costLever: true,
    rungs: [
      "Checks / manual transfers, one at a time",
      "A payment run tracked by hand",
      "Payments run from accounting or the ERP",
      "Scheduled runs tied to approvals and cash",
      "AI optimises timing and discounts, detects fraud",
    ],
  },
  {
    key: "supplier_risk",
    name: "Vetting and monitoring suppliers",
    formal: "Supplier Risk & Compliance",
    question: "How do you vet and keep tabs on suppliers?",
    rungs: [
      "We don't really; trust and history",
      "A checklist of docs by hand",
      "An onboarding portal that stores documents",
      "Ongoing monitoring tied to spend and contracts",
      "AI monitors risk, expirations and compliance",
    ],
  },
];

/** The rung index (0-4) → the stored score. `null` = "Not sure". */
export function rungScore(index: number): Rung {
  return MATURITY_RUNGS[index];
}

/**
 * AI Mode — asked ONCE, not per domain.
 *
 * It is a disposition, not a capability, so asking it eight times would be
 * eight chances to give eight different answers to the same question. It does
 * not affect the maturity score; it shapes which solutions are recommended and
 * how the human frames the call.
 */
export const AI_MODE_QUESTION =
  "When AI can handle a procurement task well, how much do you want it to run on its own?";

export const AI_MODES = [
  { id: "autonomous", label: "Do it — just handle it" },
  { id: "notify", label: "Do it & notify me" },
  { id: "propose", label: "Propose it, I'll approve" },
  { id: "route", label: "Route it to a person" },
] as const;

export const PROCESSES = [
  {
    key: "P2P",
    name: "Procure-to-Pay",
    blurb:
      "From the request to the payment — suppliers, purchase orders, receipts, invoices, cash out.",
    active: true,
  },
  {
    key: "O2C",
    name: "Order-to-Cash",
    blurb:
      "From the customer's order to the cash in the bank — quotes, orders, fulfillment, invoices, collections.",
    active: false,
  },
  {
    key: "R2R",
    name: "Record-to-Report",
    blurb:
      "From the first posting to the signed-off numbers — the ledger, the close, reporting, compliance.",
    active: false,
  },
  {
    key: "H2R",
    name: "Hire-to-Retire",
    blurb:
      "From the job req to the last day — recruiting, onboarding, time, payroll, benefits.",
    active: false,
  },
] as const;

export type ProcessKey = (typeof PROCESSES)[number]["key"];
