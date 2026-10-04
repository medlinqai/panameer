
export type MarkKind = "vendor" | "chip" | "icon";

export type MarkTone =
  | "neutral" | "sky" | "violet" | "amber" | "emerald" | "teal"
  | "indigo" | "cyan" | "orange" | "lime" | "blue";

export type Mark = {
  kind: MarkKind;
  tone?: MarkTone;
  /** Chip text, e.g. `P2P`. Two to four characters or it stops being a label. */
  chip?: string;
  /** A lucide icon name, resolved by `CatalogMark`. */
  icon?: string;
  logo?: string;
  /** Initials for the monogram fallback. */
  monogram?: string;
};

const vendor = (monogram: string): Mark => ({ kind: "vendor", monogram });

/** Keyed on `Pillar.code` — the five vendor suites on RDS. */
export const RDS_DOMAIN_MARKS: Record<string, Mark> = {
  /* ── vendor suites ─────────────────────────────────────────────────────── */
  ORACLE_E_BUSINESS_SUITE: vendor("EBS"),
  ORACLE_FUSION_CLOUD: vendor("OFC"),
  PEOPLESOFT: vendor("PS"),
  SALESFORCE: vendor("SF"),
  WORKDAY: vendor("WD"),

  CUSTOMER_EXPERIENCE_CX: { tone: "sky", kind: "chip", chip: "CX" },
  ENTERPRISE_PERFORMANCE_MGMT_EPM: { tone: "indigo", kind: "chip", chip: "EPM" },
  GOVERNANCE_RISK_COMPLIANCE_GRC: { tone: "amber", kind: "chip", chip: "GRC" },
  HIRE_TO_RETIRE: { tone: "violet", kind: "chip", chip: "H2R" },
  ORDER_TO_CASH: { tone: "emerald", kind: "chip", chip: "O2C" },
  PLAN_TO_PRODUCE: { tone: "orange", kind: "icon", icon: "Factory" },
  PROCURE_TO_PAY: { tone: "teal", kind: "chip", chip: "P2P" },
  PROJECT_PORTFOLIO_MGMT_PPM: { tone: "cyan", kind: "chip", chip: "PPM" },
  RECORD_TO_REPORT: { tone: "lime", kind: "chip", chip: "R2R" },

  /* ── Project / AI / Cross-Vendor: icons, muted ─────────────────────────── */
  CROSS_VENDOR_PLATFORM_NEUTRAL: { kind: "icon", icon: "Shuffle" },
  DELIVERY_LEADERSHIP: { kind: "icon", icon: "Flag" },
  ARCHITECTURE_DESIGN: { kind: "icon", icon: "DraftingCompass" },
  TESTING_SUPPORT: { kind: "icon", icon: "BugPlay" },
  CHANGE_ENABLEMENT: { kind: "icon", icon: "RefreshCw" },
  CORE_TECHNICAL_DEVELOPMENT: { kind: "icon", icon: "Code" },
  CREATIVE_CONTENT_GENERATION: { kind: "icon", icon: "Sparkles" },
  DATA_SUPPORT_SERVICES: { kind: "icon", icon: "Database" },
  AI_GOVERNANCE_TRUST: { kind: "icon", icon: "ShieldCheck" },
  AI_CONSULTING_ENABLEMENT: { kind: "icon", icon: "Lightbulb" },
};

/** Keyed on `RoleType.code` — the five top-level rows on RDS. */
export const RDS_ROLE_MARKS: Record<string, Mark> = {
  APPLICATION_SPECIFIC: { tone: "sky", kind: "icon", icon: "LayoutGrid" },
  TECHNOLOGY_SPECIFIC: { tone: "violet", kind: "icon", icon: "Cpu" },
  PROJECT_SPECIFIC: { tone: "amber", kind: "icon", icon: "Flag" },
  OPERATIONS_SPECIFIC: { tone: "emerald", kind: "icon", icon: "Workflow" },
  AI_SPECIALIST: { tone: "teal", kind: "icon", icon: "Sparkles" },
};

export const SPECIALIZATION_MARKS: Record<string, Mark> = {
  /* ── 11 products ──────────────────────────────────────────────────────── */
  "Oracle Cloud": vendor("OC"),
  "Oracle Business Network": vendor("OBN"),
  "Enterprise Business Suite (EBS)": vendor("EBS"),
  PeopleSoft: vendor("PS"),
  Salesforce: vendor("SF"),
  SAP: vendor("SAP"),
  "JD Edwards": vendor("JDE"),
  SciQuest: vendor("SQ"),
  Ariba: vendor("AR"),
  Coupa: vendor("CP"),
  Workday: vendor("WD"),

  /* ── 6 processes ──────────────────────────────────────────────────────── */
  "Procure-to-Pay": { tone: "teal", kind: "chip", chip: "P2P" },
  "Record-to-Report": { tone: "lime", kind: "chip", chip: "R2R" },
  "Order-to-Cash": { tone: "emerald", kind: "chip", chip: "O2C" },
  "Hire-to-Retire": { tone: "violet", kind: "chip", chip: "H2R" },
  "Source-to-Pay": { tone: "sky", kind: "chip", chip: "S2P" },
  "Putaway-to-Issue": { tone: "orange", kind: "chip", chip: "P2I" },

  "Public Sector & Government": { tone: "indigo", kind: "icon", icon: "Landmark" },
  "Healthcare & Life Sciences": { tone: "emerald", kind: "icon", icon: "HeartPulse" },
  "Financial Services & Fintech": { tone: "teal", kind: "icon", icon: "Banknote" },
  "Energy, Utilities, & Resources": { tone: "amber", kind: "icon", icon: "Zap" },
  "Education Services": { tone: "violet", kind: "icon", icon: "GraduationCap" },
  "Consumer Products & Retail": { tone: "orange", kind: "icon", icon: "ShoppingBag" },
  "Technology, Media, & Telecommunications": { tone: "sky", kind: "icon", icon: "RadioTower" },
  "Real Estate & Infrastructure": { tone: "cyan", kind: "icon", icon: "Building2" },
  "Transportation, Travel, & Logistics": { tone: "blue", kind: "icon", icon: "Truck" },
  "Industry Products & Manufacturing": { tone: "lime", kind: "icon", icon: "Factory" },
};

/** The three group-level fallbacks, by specialization kind. */
export const KIND_FALLBACK: Record<string, Mark> = {
  PRODUCT: { kind: "icon", icon: "Boxes" },
  METHODOLOGY: { kind: "icon", icon: "Workflow" },
  INDUSTRY: { kind: "icon", icon: "Building2" },
};
