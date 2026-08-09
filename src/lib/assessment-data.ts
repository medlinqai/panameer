/**
 * THE AI-ADOPTION ASSESSMENT'S DATA (brief_home_rebuild_08_09 WS-D).
 *
 * Four process areas, each with its capability domains, four KPI tiles and a
 * maturity score. Lifted verbatim from the approved mockup's `<script>`.
 *
 * ⚠ EVERY NUMBER IN HERE IS ILLUSTRATIVE. Nothing measures anything: there is
 * no assessment engine, no customer data, and no scoring behind these figures.
 * They exist to show the SHAPE of the output a real assessment would produce,
 * which is what the marketing section is selling.
 *
 * That is also why they live in one file rather than inline in the component.
 * When the real thing is built, this module is what gets replaced — same
 * export, same types, values from the database — and the section renders it
 * without changing. A `sample: true` flag rides along so the UI has something
 * concrete to key its "illustrative" labelling off, rather than that honesty
 * depending on somebody remembering to keep a hard-coded caption.
 */

export type ProcessKey = "p2p" | "o2c" | "r2r" | "h2r";

export type KpiTile = {
  /** The headline figure, pre-formatted — "87%", "11d", "4.6". */
  value: string;
  label: string;
  /** Quarter-over-quarter movement, already signed and arrowed. */
  delta: string;
};

export type ProcessArea = {
  key: ProcessKey;
  /** Tab label, e.g. "Procure-to-Pay". */
  name: string;
  /** The glyph the mockup puts before each tab label. Decorative. */
  glyph: string;
  /** 0–100. Drives the maturity bar. */
  score: number;
  /** Index into MATURITY_STAGES — which stage the score sits in. */
  stage: number;
  domains: string[];
  tiles: KpiTile[];
  /** True while these figures are illustrative rather than measured. */
  sample: boolean;
};

export const MATURITY_STAGES = [
  "Initial",
  "Developing",
  "Optimized",
  "Leading",
] as const;

const t = (value: string, label: string, delta: string): KpiTile => ({
  value,
  label,
  delta,
});

export const ASSESSMENT_AREAS: ProcessArea[] = [
  {
    key: "p2p",
    name: "Procure-to-Pay",
    glyph: "▣",
    score: 72,
    stage: 2,
    sample: true,
    domains: [
      "Requisitioning & Demand Management",
      "Sourcing & Supplier Selection",
      "Contract Management",
      "Purchase Order Management",
      "Goods & Services Receipt",
      "Invoice Processing & Matching",
      "Payments & Cash Management",
      "Supplier Risk & Compliance",
      "Data, Analytics & AI Governance",
      "Change Management & AI Adoption",
    ],
    tiles: [
      t("87%", "Touchless PO Rate", "▲ +12% vs last qtr"),
      t("4.2%", "Maverick Spend", "▼ −8% vs last qtr"),
      t("94%", "Invoice Match Rate", "▲ +5% vs last qtr"),
      t("11d", "Avg. PO Cycle Time", "▼ −3d vs last qtr"),
    ],
  },
  {
    key: "o2c",
    name: "Order-to-Cash",
    glyph: "▤",
    score: 68,
    stage: 2,
    sample: true,
    domains: [
      "Customer & Credit Management",
      "Pricing, Quoting & Proposal",
      "Order & Contract Execution",
      "Service Delivery & Milestones",
      "Billing & Invoicing",
      "Revenue Recognition & Reporting",
      "Collections & Receivables",
      "Cash Application & Reconciliation",
      "Data, Analytics & AI Governance",
      "Change Management & AI Adoption",
    ],
    tiles: [
      t("38d", "Days Sales Outstanding", "▼ −4d vs last qtr"),
      t("81%", "Touchless Invoice Rate", "▲ +9% vs last qtr"),
      t("92%", "On-Time Collection", "▲ +3% vs last qtr"),
      t("2.1%", "Dispute Rate", "▼ −0.6% vs last qtr"),
    ],
  },
  {
    key: "r2r",
    name: "Record-to-Report",
    glyph: "▦",
    score: 64,
    stage: 2,
    sample: true,
    domains: [
      "Transaction & Journal Entry",
      "Account Reconciliation",
      "Intercompany Accounting",
      "Fixed Assets & Lease",
      "Close Management & Orchestration",
      "Financial Consolidation",
      "Management Reporting & FP&A",
      "Internal Controls & Auditing",
      "Data, Analytics & AI Governance",
      "Change Management & AI Adoption",
    ],
    tiles: [
      t("5.2d", "Days to Close", "▼ −1.1d vs last qtr"),
      t("76%", "Auto-Reconciliation", "▲ +14% vs last qtr"),
      t("84%", "Journal Automation", "▲ +7% vs last qtr"),
      t("1.3%", "Control Exceptions", "▼ −0.4% vs last qtr"),
    ],
  },
  {
    key: "h2r",
    name: "Hire-to-Retire",
    glyph: "◔",
    score: 49,
    stage: 1,
    sample: true,
    domains: [
      "Workforce Planning & Headcount",
      "Talent Acquisition & Recruitment",
      "Onboarding & New Hire",
      "Performance Management & Goals",
      "Learning, Development & Skills",
      "Compensation & Total Rewards",
      "Payroll & Time Management",
      "Workforce Analytics",
      "Data, Analytics & AI Governance",
      "Change Management & AI Adoption",
    ],
    tiles: [
      t("18d", "Time to Fill", "▼ −9d vs last qtr"),
      t("88%", "90-Day Retention", "▲ +6% vs last qtr"),
      t("97%", "Payroll Accuracy", "▲ +3% vs last qtr"),
      t("4.6", "Engagement Score", "▲ +0.4 vs last qtr"),
    ],
  },
];
