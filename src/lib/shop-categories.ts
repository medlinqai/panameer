// SH2-E001: the 12 Day-1 Categories, in this order. The first 11 are commodity groups; Help is a tile that opens /help.
export type CategoryIconKey = "erp" | "print" | "mkt" | "web" | "ai" | "fin" | "it" | "truck" | "fac" | "exp" | "lead" | "help";

export type Day1Category = { name: string; icon: CategoryIconKey; examples: string; href?: string };

export const DAY1_CATEGORIES: Day1Category[] = [
  { name: "ERP & Oracle", icon: "erp", examples: "App extensions, reports, consulting" },
  { name: "Printing", icon: "print", examples: "Cards, banners, signs, labels" },
  { name: "Marketing", icon: "mkt", examples: "Local SEO, ads, social, video, copy" },
  { name: "Websites", icon: "web", examples: "Design, redesigns, landing pages, upkeep" },
  { name: "AI & Automation", icon: "ai", examples: "Chatbots, workflows, AI receptionists" },
  { name: "Finance & Admin", icon: "fin", examples: "Bookkeeping, payroll, virtual assistants" },
  { name: "IT", icon: "it", examples: "Managed IT, security, cloud moves" },
  { name: "Transportation", icon: "truck", examples: "Freight, courier, fleet service" },
  { name: "Facilities", icon: "fac", examples: "HVAC, landscaping, pest, cleaning" },
  { name: "Mentoring & Advisory", icon: "exp", examples: "Mentoring, consulting, coaching, fractional roles" },
  { name: "Lead Generation", icon: "lead", examples: "Leads for HVAC, roofing, plumbing" },
  { name: "Help", icon: "help", examples: "Don't know what to do? Start here.", href: "/help" },
];

/** The 11 Categories that are commodity groups (Help is not). */
export const SHOP_CATEGORY_NAMES = DAY1_CATEGORIES.filter((c) => !c.href).map((c) => c.name);

export const categoryLook = (name: string | null | undefined): Day1Category =>
  DAY1_CATEGORIES.find((c) => c.name === name) ?? { name: name ?? "", icon: "erp", examples: "" };

// SH-E001 leftovers, removed with the old Shop pages (SH2-E002 / E003).
export const TALENT_CATEGORIES = ["Professional Services", "Technology", "Staffing & Contingent Labor", "Education & Training"] as const;
export function isTalentCategory(commodityGroup: string | null | undefined): boolean {
  return !!commodityGroup && (TALENT_CATEGORIES as readonly string[]).includes(commodityGroup);
}
export const categoryGradient = (name: string | null | undefined) => (name ? "var(--color-ink)" : "var(--color-ink)");
