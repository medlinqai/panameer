/**
 * THE CATALOG'S MARK SYSTEM (`P1-A1.5-E465` / `E471`).
 *
 * > **SCOTT:** *"Can we do like what we did to the service catalog in Medlinq?
 * > Images?"* — and, 2026-09-13: *"i see your point, vendors are a yes. What
 * > about color tile abbreviations for the others (P2P, O2C...)"*
 *
 * ⚠⚠ ONE MARK SYSTEM, THREE TREATMENTS, ONE SIZE. Every row on both catalog
 * pages gets the SAME 34px rounded square, so the left column stays straight
 * whatever is inside it. What goes in depends on what the row IS:
 *
 *   VENDOR  the row is a real product          → its logo, or its monogram
 *   CHIP    the row has a canonical short name → P2P, O2C, R2R…
 *   ICON    neither                            → a muted lucide glyph
 *
 * ⚠ NO SCHEMA. This is keyed on `Pillar.code` (RDS) and the specialization NAME,
 * because a vendor's mark is not tenant data and 5 roles + 29 domains + 27
 * specializations do not need a column. `Skill.image_url` exists and is NOT used
 * — see `CatalogMark`'s docblock for why.
 *
 * ⚠⚠ A ROW WITH NO MAPPING FALLS BACK TO ITS GROUP'S GENERIC ICON, MUTED. Never
 * a broken image, never a blank box. Provider-authored `is_custom` rows are
 * permanently unmapped by definition — that is not a gap to fill.
 */

export type MarkKind = "vendor" | "chip" | "icon";

/**
 * ── ⚠ COLOUR ON THE MARKS (`P1-A1.5-E465b`) ─────────────────────────────────
 *
 * > **SCOTT, 2026-09-13:** *"also thinking it would be good to have some color
 * > in those other tiles"*
 *
 * ⚠ THE PAIRING IS THE ONE THE TILES ALREADY USE — Tailwind's `-100` fill with
 * `-800` text (`ConsolePage.tsx:63`), so this introduces no new colour system
 * and every hue is measured rather than eyeballed.
 *
 * ⚠⚠ NO MAGENTA, FUCHSIA, PINK OR ROSE ON ANY OF THEM. `E433` reserves magenta
 * for interactive things and a mark is not clickable; rose and fuchsia are close
 * enough to read as brand magenta at 34px, so the whole family is excluded.
 */
export type MarkTone =
  | "neutral" | "sky" | "violet" | "amber" | "emerald" | "teal"
  | "indigo" | "cyan" | "orange" | "lime" | "blue";

export type Mark = {
  kind: MarkKind;
  /** ⚠ `E465b`. Absent = neutral, which is what every vendor stays. */
  tone?: MarkTone;
  /** Chip text, e.g. `P2P`. Two to four characters or it stops being a label. */
  chip?: string;
  /** A lucide icon name, resolved by `CatalogMark`. */
  icon?: string;
  /**
   * ⚠ THE LOGO SLOT, DELIBERATELY EMPTY — see `VENDOR_MARKS` below.
   * A path under `public/catalog/`. When one is present it wins; when it is
   * absent the vendor renders as a monogram instead.
   */
  logo?: string;
  /** Initials for the monogram fallback. */
  monogram?: string;
};

/* ═══════════════════════════════════════════════════════════════════════════
   ⚠⚠ THE VENDOR LOGOS ARE NOT SHIPPED, AND THAT IS A LICENCE DECISION
   ═══════════════════════════════════════════════════════════════════════════

   ⚠ THE BRIEF'S OWN INSTRUCTION: *"Check the licence before shipping a
   third-party wordmark. If any is doubtful, use the muted icon and REPORT which
   — do not ship it and wait to be told."*

   ⚠⚠ EVERY ONE OF THESE ELEVEN IS DOUBTFUL, NOT SOME OF THEM. Oracle, SAP,
   Salesforce and Workday each publish a trademark-usage policy that reserves
   their logos for use under written permission; PeopleSoft, JD Edwards and
   Oracle Business Network are Oracle marks, Ariba is an SAP mark, and SciQuest
   now trades as JAGGAER. ⚠ NONE OF THEM IS OURS TO REDISTRIBUTE, and no licensed
   asset exists anywhere in `public/`.

   ⚠ SO THE SLOT IS BUILT AND LEFT EMPTY. Each vendor renders a MONOGRAM — its
   initials on the same neutral tile as every other mark. ⚠ A monogram is not a
   logo and not trade dress: no wordmark, no brand colour, no glyph.

   ⚠⚠ ENABLING A REAL LOGO LATER IS ONE LINE AND NO CODE CHANGE. Drop a licensed
   file at `public/catalog/<slug>.svg` and add `logo: "/catalog/<slug>.svg"` to
   that row. `CatalogMark` already prefers it.
   ⚠ REPORTED, NOT SHIPPED AND EXPLAINED AFTERWARDS.
*/
const vendor = (monogram: string): Mark => ({ kind: "vendor", monogram });

/** Keyed on `Pillar.code` — the five vendor suites on RDS. */
export const RDS_DOMAIN_MARKS: Record<string, Mark> = {
  /* ── vendor suites ─────────────────────────────────────────────────────── */
  ORACLE_E_BUSINESS_SUITE: vendor("EBS"),
  ORACLE_FUSION_CLOUD: vendor("OFC"),
  PEOPLESOFT: vendor("PS"),
  SALESFORCE: vendor("SF"),
  WORKDAY: vendor("WD"),

  /* ── the nine Operations domains: chips, because these ARE the real names ─
     ⚠ Scott's own project files are `question_bank_p2p.md` and
     `question_bank_o2c_r2r_h2r.md`, so `P2P` is the row's name shortened, not a
     graphic. Four of the nine already carry the abbreviation in the label.    */
  CUSTOMER_EXPERIENCE_CX: { tone: "sky", kind: "chip", chip: "CX" },
  ENTERPRISE_PERFORMANCE_MGMT_EPM: { tone: "indigo", kind: "chip", chip: "EPM" },
  GOVERNANCE_RISK_COMPLIANCE_GRC: { tone: "amber", kind: "chip", chip: "GRC" },
  /* ⚠⚠ H2R IS SETTLED (Scott, 2026-09-13: *"hire to retire is better."* / *"H2R"*).
     The RDS domain is already named Hire-to-Retire; the specialization row was
     renamed by this brief's WS-0. `H2F` appears nowhere and never ships. */
  HIRE_TO_RETIRE: { tone: "violet", kind: "chip", chip: "H2R" },
  ORDER_TO_CASH: { tone: "emerald", kind: "chip", chip: "O2C" },
  /*
    ── ⚠⚠ THE P2P COLLISION, AND HOW IT WAS RESOLVED ────────────────────────

    ⚠ `Plan-to-Produce` ALSO SHORTENS TO `P2P`, WHICH IS ALREADY PROCURE-TO-PAY,
    and two identical chips in one nine-row list is worse than no chip.

    ⚠⚠ PROCURE-TO-PAY KEEPS `P2P`. It is the canonical one — Scott files it as
    `question_bank_p2p.md` — so taking the chip away from the row that owns the
    abbreviation to settle a clash would be the wrong half to move.

    ⚠ PLAN-TO-PRODUCE GETS AN ICON INSTEAD OF `P2Pr`. The brief offered `P2Pr`,
    spelling it out, or an icon. ⚠⚠ `P2Pr` IS NOT A NAME ANYBODY SAYS — it would
    be an invented acronym, which is exactly the reason this brief gives for
    refusing chips on industries (*"`HLS` is a made-up acronym. Nobody says it"*).
    Applying that rule to industries and breaking it here would be inconsistent.
    ⚠ A factory glyph reads instantly and claims nothing false.
  */
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

/**
 * Keyed on the specialization NAME, exactly as the row is stored.
 *
 * ⚠ NAME-KEYED BECAUSE `Specialization` HAS NO `code`. Verified against the live
 * rows rather than against the seed JSON — the JSON still carries the malformed
 * `Enterprise Business Suite ()EBS)` and the seed's `fixTypo` repairs it on the
 * way in, so the JSON spelling would have missed.
 */
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

  /*
    ── ⚠ 10 industries: ICONS, NOT CHIPS ───────────────────────────────────

    ⚠⚠ `Healthcare & Life Sciences` → `HLS` IS A MADE-UP ACRONYM. Nobody says
    it, so the chip becomes a puzzle rather than a label — the exact opposite of
    what `P2P` does. ⚠ ALL TEN MAP TO A NATURAL GLYPH; none needed the muted
    generic fallback, which is reported rather than assumed.
  */
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
