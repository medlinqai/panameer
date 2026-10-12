import { searchVariants } from "@/lib/search-synonyms";
import type { ShopProduct } from "@/lib/shop";

// WS-E005/E007: Shop filters from fields every product has. Values live in the URL; one predicate per filter.
export const PRICE = [
  { value: "u1k", label: "Under $1,000", test: (c: number) => c < 100_000 },
  { value: "1to5k", label: "$1,000–$5,000", test: (c: number) => c >= 100_000 && c <= 500_000 },
  { value: "5to10k", label: "$5,000–$10,000", test: (c: number) => c > 500_000 && c <= 1_000_000 },
  { value: "o10k", label: "Over $10,000", test: (c: number) => c > 1_000_000 },
];
export const BILLING = [
  { value: "fixed", label: "Fixed" },
  { value: "monthly", label: "Monthly" },
];
export const KIND = [
  { value: "DELIVERABLE", label: "Deliverable" },
  { value: "DEPLOYABLE", label: "AI Agent" },
  { value: "BLANKET", label: "Blanket" },
];
export const DELIVERY = [
  { value: "le2", label: "2 weeks or less", test: (w: number) => w <= 2 },
  { value: "3to4", label: "3–4 weeks", test: (w: number) => w >= 3 && w <= 4 },
  { value: "5to8", label: "5–8 weeks", test: (w: number) => w >= 5 && w <= 8 },
  { value: "gt8", label: "More than 8 weeks", test: (w: number) => w > 8 },
];

export type ShopQuery = { q?: string; type?: string; price?: string; billing?: string; kind?: string; delivery?: string; location?: string };

export function filterProducts(list: ShopProduct[], f: ShopQuery): ShopProduct[] {
  const qs = f.q?.trim() ? searchVariants(f.q.trim().toLowerCase()) : null;
  const price = PRICE.find((x) => x.value === f.price);
  const delivery = DELIVERY.find((x) => x.value === f.delivery);
  return list.filter(
    (p) =>
      (!qs || [p.title, p.summary ?? "", p.providerName].some((t) => qs.some((q) => t.toLowerCase().includes(q)))) &&
      (!f.type || p.productTypeId === f.type) &&
      (!price || (p.priceCents != null && price.test(p.priceCents))) &&
      (!f.billing || (f.billing === "monthly" ? p.pricingType === "RECURRING" : p.pricingType !== "RECURRING")) &&
      (!f.kind || p.kind === f.kind) &&
      (!delivery || (p.durationWeeks != null && delivery.test(p.durationWeeks))) &&
      (!f.location || p.providerCountry === f.location)
  );
}

/** Popular first (bought most), then newest. */
export const byPopular = (a: ShopProduct, b: ShopProduct) => b.orders - a.orders || b.createdAt.localeCompare(a.createdAt);
