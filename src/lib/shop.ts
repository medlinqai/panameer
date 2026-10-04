import { prisma } from "@/lib/prisma";
import { memberVisibleWhere } from "@/lib/access";

// R1 Chain C: what a buyer can browse and make an offer on — published service products only.
export type ShopProduct = {
  id: string;
  title: string;
  summary: string | null;
  pricingType: string;
  priceCents: number | null;
  currency: string;
  durationWeeks: number | null;
  providerName: string;
  providerProfileId: string;
  providerPersonId: string;
  deliverables: string[];
};

const SELECT = {
  id: true, title: true, summary: true, pricing_type: true, price_cents: true, currency: true, duration_weeks: true,
  deliverables: { orderBy: { sequence: "asc" as const }, select: { text: true } },
  providerProfile: { select: { id: true, person_id: true, person: { select: { first_name: true, last_name: true } } } },
};

type Row = {
  id: string; title: string; summary: string | null; pricing_type: string; price_cents: number | null; currency: string; duration_weeks: number | null;
  deliverables: { text: string }[];
  providerProfile: { id: string; person_id: string; person: { first_name: string; last_name: string } | null };
};

const shape = (p: Row): ShopProduct => ({
  id: p.id,
  title: p.title,
  summary: p.summary,
  pricingType: p.pricing_type,
  priceCents: p.price_cents,
  currency: p.currency,
  durationWeeks: p.duration_weeks,
  providerName: p.providerProfile.person ? `${p.providerProfile.person.first_name} ${p.providerProfile.person.last_name}`.trim() : "A provider",
  providerProfileId: p.providerProfile.id,
  providerPersonId: p.providerProfile.person_id,
  deliverables: p.deliverables.map((d) => d.text),
});

export async function listShopProducts(): Promise<ShopProduct[]> {
  const rows = await prisma.serviceProduct.findMany({
    where: { status: "PUBLISHED", providerProfile: { person: memberVisibleWhere() } },
    orderBy: [{ created_at: "desc" }],
    select: SELECT,
    take: 500,
  });
  return (rows as unknown as Row[]).map(shape);
}

export async function getShopProduct(id: string): Promise<ShopProduct | null> {
  const row = await prisma.serviceProduct.findFirst({ where: { id, status: "PUBLISHED", providerProfile: { person: memberVisibleWhere() } }, select: SELECT });
  return row ? shape(row as unknown as Row) : null;
}
