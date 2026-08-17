/**
 * THE P2P QUESTION BANK, in code.
 *
 * SOURCE OF TRUTH: `2. Claude Sub-Files/question_bank_p2p.md` for the eight
 * capability domains and their maturity ladders, and the `assessment_flow_copy`
 * prototype for the exact wording of the money questions and the AI-mode
 * question. Where the two differ, the prototype wins — it is the copy Scott
 * iterated on, and the bank is the structure underneath it.
 *
 * ── THE LADDER IS THE SAME FOUR RUNGS EVERYWHERE ─────────────────────────────
 *
 * Manual tools → purpose-built software → integrated ERP on best practices →
 * AI agents, scored 10/23/37/50, with the EXAMPLES phrased per domain so a
 * reader recognises their own desk. The consistency is not decoration: it is
 * the only reason one score can roll up across eight domains and, later, across
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
/**
 * ── THE LADDER IS FOUR RUNGS, 10 / 23 / 37 / 50 ──────────────────────────────
 *
 * Manual tools → purpose-built software → integrated ERP on best practices →
 * AI agents. From Scott's deck, `4. Project Documents/AI Maturity Assessment.pptx`.
 *
 * ⚠ THE ENDPOINTS ARE 10 AND 50 AND THAT IS DELIBERATE. `maturityPercent` is
 * `((avg - 10) / 40) x 100` and `domainOpportunity` returns a zero gap at
 * `rung >= 50`. Renumbering to 10/20/30/40 would have needed a new divisor AND
 * would have left the top rung with opportunity still on the table. Keeping the
 * floor and the ceiling means the formula does not move at all — only the
 * values a step can emit, plus two new `GAP_BY_RUNG` keys.
 */
export const MATURITY_RUNGS = [10, 23, 37, 50] as const;
export type Rung = (typeof MATURITY_RUNGS)[number];

/**
 * One rung of the ladder: the title is the same in all eight domains, the
 * examples are not.
 *
 * ⚠ THE EXAMPLES ARE THE POINT. Four abstract tiers read as a taxonomy nobody
 * can place themselves in; "Excel/XLS, Sharepoint, SmartSheets, Word, Email"
 * is a sentence a procurement manager recognises as their own desk. Every
 * string is verbatim from the deck.
 */
export type RungOption = { title: string; examples: string };

export type CapabilityDomain = {
  /** Stable key — stored in the answers JSON. Renaming breaks stored reports. */
  key: string;
  /** Plain-language name for the report. */
  name: string;
  /** The formal capability-domain name, shown as the parenthetical. */
  formal: string;
  /** The maturity question, in the owner's language. */
  question: string;
  /** Four rungs, 10 -> 50, in order. */
  rungs: RungOption[];
  /**
   * ⭐ in the prototype — the domain where the cost lever bites hardest, so a
   * low score here is worth more than a low score elsewhere at equal spend.
   * See `DOLLAR_WEIGHTS` in scoring.ts.
   */
  costLever?: boolean;
};

/* The two upper rungs are identical in all eight domains — the deck repeats them
   verbatim, so they are named once rather than pasted eight times. */
const INTEGRATED: RungOption = {
  title: "Integrated ERP Applications using Best Practices",
  examples:
    "Manage by Exceptions, Self-Service, Custom Connector or APIs, Per App Rptng",
};
/**
 * ⚠ RUNG 4 NAMES PANAMEER'S OWN AGENTS, AND SOME DO NOT EXIST YET (E027).
 *
 * Rungs 1-3 name other people's software — Excel, Sharepoint, Coupa, Ariba,
 * Deltek. Rung 4 named nothing: one generic line about ERP/3rd-party/MCP agent
 * suites, identical in all eight domains. So the one rung describing where
 * Panameer wants the reader to GO was the one rung they could not picture, which
 * is the asymmetry this fixes.
 *
 * (The retired line is paraphrased above rather than quoted, so that grepping for
 * it returns only real usages and stays a usable guard.)
 *
 * ⚠ THESE ARE PRODUCT CLAIMS ON A PUBLIC, PRE-ACCOUNT PAGE. A few exist as
 * mockups on `/` — Price Alert Agent is the Price Alerts lightbox — and most do
 * not exist at all. Scott is doing that deliberately ("looking to sell ideas
 * while they are taking the maturity assessment"), so this is not a defect to
 * soften. It IS the same class of unverified public claim as the tax-savings
 * copy and the uncleared Oracle mark, and belongs behind the same gate.
 *
 * ⚠ DO NOT ADD, INVENT OR "IMPROVE" A NAME, and do not attach availability
 * language, a badge or "coming soon". The strings are verbatim from
 * `4. Project Documents/2. Design/01. Journeys/0.4 AI Maturity Assessment/AI
 * Maturity Assessment.pptx` (md5 589e08e3…), including Scott's trailing "etc.".
 */
const aiNative = (examples: string): RungOption => ({
  title: "AI Native and Programmable 3rd Party Agents",
  examples,
});
const manual = (examples: string): RungOption => ({
  title: "Manual or Offline Computing Tools",
  examples,
});
const purposeBuilt = (examples: string): RungOption => ({
  title: "Purpose-Built Software Applications",
  examples,
});

/*
  ⚠ EIGHT DOMAINS HERE, TEN ON THE HOME PAGE. `lib/capability-domains.ts`
  advertises ten P2P capability domains on `/`; this bank measures eight. The
  two that have never been assessed are "Data, Analytics & AI Governance" and
  "Change Management & AI Adoption". Authoring them is a separate brief — do not
  paper over the gap by inventing ladders for them here.
*/
export const P2P_DOMAINS: CapabilityDomain[] = [
  {
    key: "requisitioning",
    name: "Request and Demand Management",
    formal: "Requisitioning",
    question: "How do employees request goods and services?",
    rungs: [
      manual("Excel/XLS, Sharepoint, SmartSheets, Word, Email, etc."),
      purposeBuilt(
        "Enterprise Resource Planning or ERP Applications (HCM, F&A, SCM, etc.)"
      ),
      INTEGRATED,
      aiNative(
        "Voice-Request Agent, Price Alert Agent, Services Procurement Fulfillment, etc."
      ),
    ],
  },
  {
    key: "sourcing",
    name: "Sourcing and Supplier Selection",
    formal: "Sourcing",
    question: "How do buyers select suppliers and item prices?",
    costLever: true,
    rungs: [
      manual("Excel/XLS, Sharepoint, SmartSheets, etc."),
      purposeBuilt("Scout, Vinimaya, Coupa, SciQuest, Ketera, Ariba, etc."),
      INTEGRATED,
      aiNative(
        "Contract Price Alert Agent, Quick Quote Agent, etc."
      ),
    ],
  },
  {
    key: "contracts",
    name: "Contract Management",
    formal: "Contract Management",
    question: "How does your organization contract with suppliers?",
    costLever: true,
    rungs: [
      manual("Excel/XLS, Sharepoint, Word, PDFs, etc."),
      purposeBuilt("Deltek Costpoint, Focus Softnet, etc."),
      INTEGRATED,
      aiNative(
        "Adaptive PO Terms Agent, Off-Contract Spend Alert, Auto-Renewal & Extension Agent, etc."
      ),
    ],
  },
  {
    key: "purchase_orders",
    name: "Purchase Order Management",
    formal: "Purchase Order Management",
    question: "How does your organization place and manage orders with suppliers?",
    rungs: [
      manual("Excel/XLS, Sharepoint, Word, PDFs, etc."),
      purposeBuilt("Coupa, SciQuest, Ketera, Ariba, etc."),
      INTEGRATED,
      aiNative(
        "eHub Agent, Services Procurement Work Order Agent, Buyer Agent, etc."
      ),
    ],
  },
  {
    key: "receiving",
    name: "Goods & Services Receipts",
    formal: "Goods & Services Receipt",
    question: "How do buyers confirm requesters received what they ordered?",
    rungs: [
      manual("Excel/XLS, Sharepoint, Word, PDFs, email, etc."),
      purposeBuilt("Coupa, SciQuest, Ketera, Ariba, etc."),
      INTEGRATED,
      aiNative(
        "Services Procurement Settlement Agent, ERS Agent, Buyer Agent, etc."
      ),
    ],
  },
  {
    key: "invoices",
    name: "Invoice Management",
    formal: "Invoice matching",
    question: "How do supplier invoices get processed?",
    rungs: [
      manual("Excel/XLS, Sharepoint, Word, PDFs, email, etc."),
      purposeBuilt("Coupa, SciQuest, Ketera, Ariba, etc."),
      INTEGRATED,
      aiNative(
        "Match Exception Agent, Non-PO Commodity-based Auto-Coding, etc."
      ),
    ],
  },
  {
    key: "payments",
    name: "Invoice Settlement/Payment",
    formal: "Payments & Cash",
    question: "How does your organization pay suppliers?",
    costLever: true,
    rungs: [
      manual("Excel/XLS, Sharepoint, Word, PDFs, email, etc."),
      purposeBuilt("Coupa, SciQuest, Ketera, Ariba, etc."),
      INTEGRATED,
      aiNative(
        "Credit-Match Agent, Volume-Audit Agent, Credit-Card Payment Agent, etc."
      ),
    ],
  },
  {
    key: "supplier_risk",
    name: "Supplier Risk & Compliance",
    formal: "Supplier Risk & Compliance",
    question: "How does your organization vet and manage suppliers?",
    rungs: [
      manual("Excel/XLS, Sharepoint, Word, PDFs, email, etc."),
      purposeBuilt("Coupa, SciQuest, Ketera, Ariba, etc."),
      INTEGRATED,
      aiNative(
        "Government Compliance Agent, News Monitoring Agent, Credit Rating Agent, etc."
      ),
    ],
  },
];


/** The rung index (0-3) → the stored score. `null` = "Not sure". */
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
