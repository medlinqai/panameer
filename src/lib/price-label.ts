import { formatCents } from "@/lib/display";

/** "$299.00", "$110.00 / hr", "$499.00 / month" — shared by server and client components. */
export function priceLabel(p: { priceCents: number | null; currency: string; pricingType?: string | null; billingPeriod?: string | null }) {
  if (p.priceCents == null) return "Price on request";
  const per = p.pricingType === "HOURLY" ? " / hr" : p.pricingType === "RECURRING" ? (p.billingPeriod === "ANNUAL" ? " / year" : " / month") : "";
  return `${formatCents(p.priceCents, p.currency)}${per}`;
}
