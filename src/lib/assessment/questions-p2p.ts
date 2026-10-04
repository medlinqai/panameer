export const MATURITY_RUNGS = [10, 23, 37, 50] as const;
export type Rung = (typeof MATURITY_RUNGS)[number];

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
  costLever?: boolean;
};

const INTEGRATED: RungOption = {
  title: "Integrated ERP Applications using Best Practices",
  examples:
    "Manage by Exceptions, Self-Service, Custom Connector or APIs, Per App Rptng",
};
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
  {
    key: "data_ai_governance",
    name: "Data Analytics & AI Governance",
    formal: "Data Analytics & AI Governance",
    question: "How does your organization analyze data and control AI?",
    rungs: [
      manual(
        "Excel/XLS exports, hand-built pivots, ad-hoc reports, no named data owner, etc."
      ),
      purposeBuilt(
        "Standalone BI or spend-analytics tools (Tableau, Power BI, spend cubes), classified periodically"
      ),
      INTEGRATED,
      aiNative("The Spend Analytics Agent, AI Governance Agent"),
    ],
  },
  {
    key: "change_ai_adoption",
    name: "Change Management & AI Adoption",
    formal: "Change Management & AI Adoption",
    question: "How does your organization manage change & rollout AI?",
    rungs: [
      manual(
        "Slide decks, one-off sessions, email announcements, tribal knowledge, etc."
      ),
      purposeBuilt(
        "LMS or digital-adoption platforms (WalkMe, Whatfix, etc.), static help sites"
      ),
      INTEGRATED,
      aiNative("The “How Do I” Agent, AI Roadmap, Optimization Dashboard"),
    ],
  },
];

/** The rung index (0-3) → the stored score. `null` = "Not sure". */
export function rungScore(index: number): Rung {
  return MATURITY_RUNGS[index];
}

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
