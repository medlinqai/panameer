import { searchVariants } from "@/lib/search-synonyms";
import type { ShopProduct } from "@/lib/shop";

/** Popular first (bought most), then newest. */
export const byPopular = (a: ShopProduct, b: ShopProduct) => b.orders - a.orders || b.createdAt.localeCompare(a.createdAt);

// SH2-E003: Shop's left filters — Category (with counts) · Price · Billing · Delivery · Open to offers. Values live in the URL.
export type StoreQuery = { q?: string; category?: string; price?: string; billing?: string; delivery?: string; offers?: string };
export const STORE_PRICE = [
  { value: "u100", label: "Under $100", test: (c: number) => c < 10_000 },
  { value: "100to500", label: "$100–$500", test: (c: number) => c >= 10_000 && c <= 50_000 },
  { value: "500to2k", label: "$500–$2,000", test: (c: number) => c > 50_000 && c <= 200_000 },
  { value: "o2k", label: "Over $2,000", test: (c: number) => c > 200_000 },
  { value: "quote", label: "Quote", test: () => false },
];
export const STORE_BILLING = [
  { value: "one", label: "One time" },
  { value: "monthly", label: "Monthly" },
];
export const STORE_DELIVERY = [
  { value: "site", label: "At your site" },
  { value: "offsite", label: "Offsite" },
];

/** Everything but the Category — so the Category counts reflect the other filters. */
export function filterStoreExceptCategory(list: ShopProduct[], f: StoreQuery): ShopProduct[] {
  const qs = f.q?.trim() ? searchVariants(f.q.trim().toLowerCase()) : null;
  const price = STORE_PRICE.find((x) => x.value === f.price);
  return list.filter(
    (p) =>
      (!qs || [p.title, p.summary ?? "", p.providerName, p.companyName ?? "", p.category ?? "", p.typeName ?? ""].some((t) => qs.some((q) => t.toLowerCase().includes(q)))) &&
      (!price || (price.value === "quote" ? p.priceCents == null : p.priceCents != null && price.test(p.priceCents))) &&
      (!f.billing || (f.billing === "monthly" ? p.pricingType === "RECURRING" : p.pricingType !== "RECURRING")) &&
      (!f.delivery || (f.delivery === "site" ? p.delivery !== "OFFSITE" : p.delivery !== "ONSITE")) &&
      (!f.offers || p.openToOffers)
  );
}

export function filterStore(list: ShopProduct[], f: StoreQuery): ShopProduct[] {
  return filterStoreExceptCategory(list, f).filter((p) => !f.category || p.category === f.category);
}

/** A link to the same page with one filter set (or cleared when it's already that value). */
export function storeHref(base: string, f: StoreQuery, key: keyof StoreQuery, value: string | null): string {
  const next: Record<string, string> = {};
  for (const [k, v] of Object.entries(f)) if (v) next[k] = v;
  if (value == null || next[key] === value) delete next[key];
  else next[key] = value;
  const qs = new URLSearchParams(next).toString();
  return qs ? `${base}?${qs}` : base;
}
