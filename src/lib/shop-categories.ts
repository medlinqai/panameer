// SH: a Category = a commodity group. Talent Categories are people (masked, under Hire); the rest are trades shopped openly.
export const TALENT_CATEGORIES = ["Professional Services", "Technology", "Staffing & Contingent Labor", "Education & Training"] as const;

export function isTalentCategory(commodityGroup: string | null | undefined): boolean {
  return !!commodityGroup && (TALENT_CATEGORIES as readonly string[]).includes(commodityGroup);
}

export type CategoryIconKey = "chip" | "brief" | "print" | "home" | "truck" | "people" | "car" | "shield" | "calendar" | "school" | "phone" | "leaf" | "doc";

export const CATEGORY_LOOK: Record<string, { from: string; to: string; icon: CategoryIconKey; examples: string }> = {
  Technology: { from: "#272334", to: "#5B3B8C", icon: "chip", examples: "Reports, integrations, AI agents" },
  "Professional Services": { from: "#3B2E5A", to: "#7A4FA8", icon: "brief", examples: "Consulting, accounting, legal" },
  "Staffing & Contingent Labor": { from: "#7A3E1D", to: "#C46A3C", icon: "people", examples: "Contract PMs and specialists" },
  "Education & Training": { from: "#4A2E6E", to: "#9A5FC4", icon: "school", examples: "Workshops, courses, coaching" },
  "Printing & Signs": { from: "#B324B2", to: "#E86BD8", icon: "print", examples: "Cards, banners, displays" },
  "Facilities & Property": { from: "#1F6F5C", to: "#3FA287", icon: "home", examples: "HVAC, landscaping, cleaning" },
  "Logistics & Transportation": { from: "#1D4E89", to: "#3C7BC4", icon: "truck", examples: "Freight, courier, storage" },
  "Fleet & Vehicles": { from: "#33415C", to: "#5C6F94", icon: "car", examples: "Maintenance, rentals, leases" },
  Security: { from: "#2B2B2B", to: "#5A5A5A", icon: "shield", examples: "Guards, alarms, cameras" },
  "Travel & Events": { from: "#8C2F4B", to: "#C9567A", icon: "calendar", examples: "Events, venues, travel" },
  Telecom: { from: "#1C5D6E", to: "#3A93A8", icon: "phone", examples: "Internet, phones, cabling" },
  "Environmental & Waste": { from: "#3E5E1F", to: "#6E9A3C", icon: "leaf", examples: "Waste, shredding, recycling" },
  "Business Services": { from: "#4D4458", to: "#7D7290", icon: "doc", examples: "Mailroom, scanning, translation" },
  "Marketing & Creative": { from: "#A3366B", to: "#D96A9E", icon: "brief", examples: "Design, web, video" },
};
const FALLBACK = { from: "#272334", to: "#4b3e6e", icon: "brief" as CategoryIconKey, examples: "" };
export const categoryLook = (name: string | null | undefined) => (name && CATEGORY_LOOK[name]) || FALLBACK;
export const categoryGradient = (name: string | null | undefined) => {
  const l = categoryLook(name);
  return `linear-gradient(135deg, ${l.from}, ${l.to})`;
};
