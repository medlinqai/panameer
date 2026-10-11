import { prisma } from "@/lib/prisma";
import { memberVisibleWhere } from "@/lib/access";
import { scheduleLine } from "@/lib/cart";

// R1 Chain C: what a buyer can browse and buy — published service products only.
export type ShopProduct = {
  id: string;
  title: string;
  summary: string | null;
  pricingType: string;
  billingPeriod: string | null;
  kind: string;
  priceCents: number | null;
  currency: string;
  durationWeeks: number | null;
  providerName: string;
  providerFirst: string;
  providerLast: string;
  providerPhotoUrl: string | null;
  providerProfileId: string;
  providerPersonId: string;
  providerCountry: string | null;
  deliverables: string[];
  coverCode: string | null;
  /** The product's payment schedule in one line ("50% Kickoff at order · 50% Delivery on delivery · net 30"). */
  terms: string;
  /** Work order lines bought from it — "Popular with Buyers". */
  orders: number;
  createdAt: string;
};

const SELECT = {
  id: true, title: true, summary: true, pricing_type: true, billing_period: true, kind: true, price_cents: true, currency: true, duration_weeks: true, cover_code: true,
  payment_terms: true, payment_trigger: true, created_at: true,
  milestones: { orderBy: { sequence: "asc" as const }, select: { label: true, percent: true, trigger: true } },
  deliverables: { orderBy: { sequence: "asc" as const }, select: { text: true } },
  providerProfile: { select: { id: true, person_id: true, person: { select: { first_name: true, last_name: true, photo_url: true, company: { select: { country: true } } } } } },
};

const TERMS: Record<string, string> = { IMMEDIATE: "due on receipt", NET15: "net 15", NET30: "net 30", NET45: "net 45", NET60: "net 60" };

export async function listShopProducts(providerProfileId?: string): Promise<ShopProduct[]> {
  const rows = await prisma.serviceProduct.findMany({
    where: { status: "PUBLISHED", ...(providerProfileId ? { provider_profile_id: providerProfileId } : {}), providerProfile: { person: memberVisibleWhere() } },
    orderBy: [{ created_at: "desc" }],
    select: SELECT,
    take: 500,
  });
  const bought = new Map(
    (await prisma.workOrderLine.groupBy({ by: ["service_product_id"], where: { service_product_id: { in: rows.map((r) => r.id) } }, _count: { _all: true } })).map((g) => [g.service_product_id, g._count._all])
  );
  return rows.map((p) => shape(p, bought.get(p.id) ?? 0));
}

type Row = Awaited<ReturnType<typeof prisma.serviceProduct.findMany<{ select: typeof SELECT }>>>[number];

function shape(p: Row, orders: number): ShopProduct {
  const person = p.providerProfile.person;
  return {
    id: p.id,
    title: p.title,
    summary: p.summary,
    pricingType: p.pricing_type,
    billingPeriod: p.billing_period,
    kind: p.kind,
    priceCents: p.price_cents,
    currency: p.currency,
    durationWeeks: p.duration_weeks,
    providerName: person ? `${person.first_name} ${person.last_name}`.trim() : "A provider",
    providerFirst: person?.first_name ?? "",
    providerLast: person?.last_name ?? "",
    providerPhotoUrl: person?.photo_url ?? null,
    providerProfileId: p.providerProfile.id,
    providerPersonId: p.providerProfile.person_id,
    providerCountry: person?.company?.country ?? null,
    deliverables: p.deliverables.map((d) => d.text),
    coverCode: p.cover_code,
    terms: [scheduleLine(p), p.payment_terms ? TERMS[p.payment_terms] : null].filter(Boolean).join(" · "),
    orders,
    createdAt: p.created_at.toISOString(),
  };
}

export async function getShopProduct(id: string): Promise<ShopProduct | null> {
  const row = await prisma.serviceProduct.findFirst({ where: { id, status: "PUBLISHED", providerProfile: { person: memberVisibleWhere() } }, select: SELECT });
  return row ? shape(row, 0) : null;
}
