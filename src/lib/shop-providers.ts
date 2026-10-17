import { prisma } from "@/lib/prisma";
import { marketplaceWhere } from "@/lib/visibility";
import { isTalentCategory } from "@/lib/shop-categories";
import { UNIT_SHORT } from "@/lib/build-catalog";
import { searchVariants } from "@/lib/search-synonyms";
import type { ServiceUnit } from "@prisma/client";

// SH-E003: trade / vendor companies, shown openly. Talent sellers never appear here (they're under Hire).
export type ShopProvider = {
  profileId: string; userId: string | null; company: string; description: string | null; logoUrl: string | null;
  city: string | null; category: string; categories: string[]; fromCents: number | null; fromUnit: string; delivery: string[];
};

export async function listShopProviders(seesTest: boolean, f: { q?: string; category?: string; delivery?: string } = {}): Promise<ShopProvider[]> {
  const rows = await prisma.providerProfile.findMany({
    where: await marketplaceWhere(seesTest),
    select: {
      id: true, overview: true,
      person: { select: { user_id: true, first_name: true, last_name: true, site: { select: { addresses: { take: 1, select: { city: true, state: true } } } }, company: { select: { name: true, description: true, logo_url: true, businessTypes: { select: { businessType: { select: { name: true, commodityGroup: { select: { name: true } } } } } } } } } },
    },
    take: 500,
  });
  const trades = rows
    .map((r) => {
      const groups = [...new Set((r.person.company?.businessTypes ?? []).map((b) => b.businessType.commodityGroup?.name).filter((g): g is string => !!g))];
      return { r, groups: groups.filter((g) => !isTalentCategory(g)), types: (r.person.company?.businessTypes ?? []).map((b) => b.businessType.name) };
    })
    .filter((x) => x.groups.length > 0);
  const ids = trades.map((x) => x.r.id);
  const [rates, products] = await Promise.all([
    prisma.providerService.findMany({ where: { provider_profile_id: { in: ids }, active: true, published_at: { not: null }, rate_cents: { not: null } }, select: { provider_profile_id: true, rate_cents: true, uom: true } }),
    prisma.serviceProduct.findMany({ where: { provider_profile_id: { in: ids }, status: "PUBLISHED", offered: true }, select: { provider_profile_id: true, price_cents: true, pricing_type: true, delivery: true, title: true } }),
  ]);
  const qs = f.q?.trim() ? searchVariants(f.q.trim().toLowerCase()) : null;
  const out: ShopProvider[] = [];
  for (const { r, groups, types } of trades) {
    const c = r.person.company;
    const prices = [
      ...rates.filter((x) => x.provider_profile_id === r.id).map((x) => ({ cents: x.rate_cents!, unit: x.uom ? `/${UNIT_SHORT[x.uom as ServiceUnit] ?? x.uom.toLowerCase()}` : "" })),
      ...products.filter((x) => x.provider_profile_id === r.id && x.price_cents != null).map((x) => ({ cents: x.price_cents!, unit: x.pricing_type === "RECURRING" ? "/mo" : "" })),
    ].sort((a, b) => a.cents - b.cents);
    const mine = products.filter((x) => x.provider_profile_id === r.id);
    const addr = r.person.site?.addresses[0];
    const p: ShopProvider = {
      profileId: r.id, userId: r.person.user_id, company: c?.name ?? `${r.person.first_name} ${r.person.last_name}`, description: c?.description ?? r.overview ?? null, logoUrl: c?.logo_url ?? null,
      city: addr?.city ? [addr.city, addr.state].filter(Boolean).join(", ") : null, category: groups[0], categories: groups,
      fromCents: prices[0]?.cents ?? null, fromUnit: prices[0]?.unit ?? "",
      delivery: [...new Set(mine.map((x) => x.delivery ?? "EITHER"))],
    };
    const text = [p.company, p.description ?? "", ...groups, ...types, ...mine.map((x) => x.title)].join(" ").toLowerCase();
    if (qs && !qs.some((q) => text.includes(q))) continue;
    if (f.category && !groups.includes(f.category)) continue;
    if (f.delivery === "site" && !p.delivery.some((d) => d === "ONSITE" || d === "EITHER")) continue;
    if (f.delivery === "shipped" && !p.delivery.some((d) => d === "OFFSITE" || d === "EITHER")) continue;
    if (f.delivery === "remote") continue; // remote is for talent; trades are at your site or shipped
    out.push(p);
  }
  return out.sort((a, b) => a.company.localeCompare(b.company));
}
