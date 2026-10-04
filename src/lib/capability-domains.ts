
export type Direction = "up" | "dn";

export type Kpi = {
  /** Pre-formatted headline figure — "87%", "11d", "2". */
  value: string;
  label: string;
  /** Pre-formatted movement, arrow included — "▲ +12% vs last qtr". */
  delta: string;
  dir: Direction;
};

export type CapabilityDomain = {
  id: string;
  name: string;
  kpis: [Kpi, Kpi, Kpi, Kpi];
  /** One line, shown on the card under the KPIs. */
  suggestion: string;
  /** 0–100. Drives the fill bar and the ladder band. */
  score: number;
};

const k = (value: string, label: string, delta: string, dir: Direction): Kpi => ({
  value,
  label,
  delta,
  dir,
});

export const P2P_DOMAINS: CapabilityDomain[] = [
  {
    id: "requisitioning",
    name: "Requisitioning & Demand Management",
    kpis: [
      k("61%", "Catalog Requisition Rate", "▲ +6% vs last qtr", "up"),
      k("27%", "Off-Catalog Requests", "▼ −3% vs last qtr", "dn"),
      k("3.2d", "Avg Requisition Cycle", "▼ −0.4d vs last qtr", "dn"),
      k("44%", "Auto-Approved Reqs", "▲ +9% vs last qtr", "up"),
    ],
    suggestion:
      "Route off-catalog requests through a guided form and auto-classify them — most buyer touches come from the 27% that bypass the catalog.",
    score: 33,
  },
  {
    id: "sourcing",
    name: "Sourcing & Supplier Selection",
    kpis: [
      k("34%", "Competitive Sourcing Rate", "▲ +4% vs last qtr", "up"),
      k("46%", "Single-Bid Awards", "▼ −5% vs last qtr", "dn"),
      k("41d", "Avg Sourcing Cycle", "▼ −3d vs last qtr", "dn"),
      k("4.1%", "Savings Captured", "▲ +0.6% vs last qtr", "up"),
    ],
    suggestion:
      "Auto-assemble bid packages from prior awards so a sourcing event starts 70% complete.",
    score: 26,
  },
  {
    id: "contracts",
    name: "Contract Management",
    kpis: [
      k("58%", "Contracts Under Management", "▲ +7% vs last qtr", "up"),
      k("22%", "Off-Contract Spend", "▼ −4% vs last qtr", "dn"),
      k("27d", "Avg Contract Cycle", "▼ −5d vs last qtr", "dn"),
      k("14%", "Expiring Unrenewed", "▼ −2% vs last qtr", "dn"),
    ],
    suggestion:
      "Alert on contracts inside 90 days of expiry, with usage and price history attached.",
    score: 37,
  },
  {
    id: "purchase_orders",
    name: "Purchase Order Management",
    kpis: [
      k("87%", "Touchless PO Rate", "▲ +12% vs last qtr", "up"),
      k("4.2%", "Maverick Spend", "▼ −8% vs last qtr", "dn"),
      k("94%", "Invoice Match Rate", "▲ +5% vs last qtr", "up"),
      k("11d", "Avg PO Cycle Time", "▼ −3d vs last qtr", "dn"),
    ],
    suggestion:
      "Price-check every PO line against contract before approval, not in the quarterly review.",
    score: 72,
  },
  {
    id: "receiving",
    name: "Goods & Services Receipt",
    kpis: [
      k("76%", "Receipt On Time", "▲ +5% vs last qtr", "up"),
      k("18%", "Blind Receipts", "▼ −6% vs last qtr", "dn"),
      k("6d", "Service Entry Lag", "▼ −2d vs last qtr", "dn"),
      k("81%", "Three-Way Match Ready", "▲ +4% vs last qtr", "up"),
    ],
    suggestion:
      "Auto-create service entry sheets from milestone completion so receipt stops being the bottleneck.",
    score: 49,
  },
  {
    id: "invoices",
    name: "Invoice Processing & Matching",
    kpis: [
      k("94%", "Invoice Match Rate", "▲ +5% vs last qtr", "up"),
      k("68%", "Touchless Invoice Rate", "▲ +11% vs last qtr", "up"),
      k("9%", "Exception Rate", "▼ −3% vs last qtr", "dn"),
      k("4.3d", "Avg Days to Post", "▼ −1.1d vs last qtr", "dn"),
    ],
    suggestion:
      "Read and validate invoice documents on arrival so exceptions surface before posting.",
    score: 60,
  },
  {
    id: "payments",
    name: "Payments & Cash Management",
    kpis: [
      k("91%", "On-Time Payment", "▲ +3% vs last qtr", "up"),
      k("23%", "Early-Pay Discount Capture", "▲ +8% vs last qtr", "up"),
      k("0.4%", "Duplicate Payment Rate", "▼ −0.2% vs last qtr", "dn"),
      k("38d", "Avg Days Payable", "▲ +2d vs last qtr", "up"),
    ],
    suggestion:
      "Score early-payment discount opportunities daily against cash position instead of applying a fixed policy.",
    score: 49,
  },
  {
    id: "supplier_risk",
    name: "Supplier Risk & Compliance",
    kpis: [
      k("64%", "Suppliers Fully Registered", "▲ +9% vs last qtr", "up"),
      k("71%", "Documents Current", "▲ +6% vs last qtr", "up"),
      k("88%", "Sanctions Screened", "▲ +2% vs last qtr", "up"),
      k("12d", "Avg Onboarding Time", "▼ −4d vs last qtr", "dn"),
    ],
    suggestion:
      "Validate registration documents automatically at submission — most onboarding delay is document rework.",
    score: 39,
  },
  {
    id: "data_ai_governance",
    name: "Data, Analytics & AI Governance",
    kpis: [
      k("72%", "Spend Classified", "▲ +10% vs last qtr", "up"),
      k("83%", "Item Master Accuracy", "▲ +3% vs last qtr", "up"),
      k("5d", "Reporting Latency", "▼ −2d vs last qtr", "dn"),
      k("2", "Models Under Governance", "▲ +2 vs last qtr", "up"),
    ],
    suggestion:
      "Classify spend continuously so category views are current rather than quarterly.",
    score: 30,
  },
  {
    id: "change_ai_adoption",
    name: "Change Management & AI Adoption",
    kpis: [
      k("47%", "Trained Users", "▲ +14% vs last qtr", "up"),
      k("39%", "Feature Adoption", "▲ +7% vs last qtr", "up"),
      k("18", "Support Tickets / 100 Users", "▼ −5 vs last qtr", "dn"),
      k("62%", "Process Compliance", "▲ +5% vs last qtr", "up"),
    ],
    suggestion:
      "Target enablement at the three roles generating the most exceptions rather than the whole user base.",
    score: 25,
  },
];

/** Pre-selected on first paint — the figures the mockup has always shown. */
export const DEFAULT_DOMAIN_ID = "purchase_orders";

export const P2P_OVERALL_SCORE = Math.round(
  P2P_DOMAINS.reduce((n, d) => n + d.score, 0) / P2P_DOMAINS.length
);

export const LADDER = ["Initial", "Developing", "Optimized", "Leading"] as const;
export type Band = (typeof LADDER)[number];

export function bandFor(score: number): Band {
  if (score <= 25) return "Initial";
  if (score <= 50) return "Developing";
  if (score <= 80) return "Optimized";
  return "Leading";
}

export const OPPORTUNITIES_BY_DOMAIN = [4, 3, 3, 1, 2, 2, 2, 3, 2, 1] as const;

export const TOTAL_OPPORTUNITIES = OPPORTUNITIES_BY_DOMAIN.reduce((n, v) => n + v, 0);

/** The other three processes — listed, never fabricated. See WS-5. */
export const OTHER_PROCESSES = [
  "Order-to-Cash",
  "Record-to-Report",
  "Hire-to-Retire",
] as const;
