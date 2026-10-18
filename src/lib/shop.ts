import { prisma } from "@/lib/prisma";
import { memberVisibleWhere } from "@/lib/access";
import { scheduleLine } from "@/lib/cart";

// R1 Chain C: what a buyer can browse and buy — published service products only.
export type ShopProduct = {
  id: string;
  title: string;
  summary: string | null;
  /** CG-E003: the optional Details PDF. */
  detailsPdfUrl: string | null;
  pricingType: string;
  billingPeriod: string | null;
  kind: string;
  priceCents: number | null;
  /** MO-E002: buyers may Make an Offer (the floor stays private). */
  openToOffers: boolean;
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
  coverUrl: string | null;
  coverStyle: string | null;
  typeName: string | null;
  productTypeId: string | null;
  /** The Service Taxonomy business type of its type (What We Buy). */
  businessTypeId: string | null;
  /** The product's payment schedule in one line ("50% Kickoff at order · 50% Delivery on delivery · net 30"). */
  terms: string;
  /** Work order lines bought from it — "Popular with Buyers". */
  orders: number;
  createdAt: string;
  /** Published in the last 30 days — "New". */
  fresh: boolean;
  /** SH: the Category (commodity group). */
  category: string | null;
  companyName: string | null;
  city: string | null;
  leadDays: number | null;
  delivery: string | null;
};

const SELECT = {
  id: true, title: true, summary: true, details_pdf_url: true, pricing_type: true, billing_period: true, kind: true, price_cents: true, open_to_offers: true, offers_override: true, currency: true, duration_weeks: true, cover_code: true, cover_image_url: true, cover_style: true,
  payment_terms: true, payment_event: true, product_type_id: true, service_type_id: true, created_at: true, lead_time_days: true, delivery: true,
  serviceType: { select: { name: true, serviceCategory: { select: { business_type_id: true, businessType: { select: { commodityGroup: { select: { name: true } } } }, commodityGroup: { select: { name: true } } } } } },
  milestones: { orderBy: { sequence: "asc" as const }, select: { label: true, percent: true, payment_event: true } },
  deliverables: { orderBy: { sequence: "asc" as const }, select: { text: true } },
  providerProfile: { select: { id: true, person_id: true, open_to_offers: true, person: { select: { first_name: true, last_name: true, photo_url: true, title: true, site: { select: { addresses: { take: 1, select: { city: true, state: true } } } }, company: { select: { name: true, country: true, businessTypes: { take: 1, select: { businessType: { select: { commodityGroup: { select: { name: true } } } } } } } } } } } },
};

const TERMS: Record<string, string> = { IMMEDIATE: "due on receipt", NET15: "net 15", NET30: "net 30", NET45: "net 45", NET60: "net 60" };

export async function listShopProducts(providerProfileId?: string, seesTest = false): Promise<ShopProduct[]> {
  const rows = await prisma.serviceProduct.findMany({
    where: { status: "PUBLISHED", ...(providerProfileId ? { provider_profile_id: providerProfileId } : {}), providerProfile: { person: memberVisibleWhere(seesTest) } },
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
  const sc = p.serviceType?.serviceCategory;
  const category = sc?.businessType?.commodityGroup?.name ?? sc?.commodityGroup?.name ?? person?.company?.businessTypes[0]?.businessType.commodityGroup?.name ?? null;
  const addr = person?.site?.addresses[0];
  return {
    id: p.id,
    title: p.title,
    detailsPdfUrl: p.details_pdf_url,
    summary: p.summary,
    pricingType: p.pricing_type,
    billingPeriod: p.billing_period,
    kind: p.kind,
    priceCents: p.price_cents,
    // Lane 7: the product's override, else the seller's Open to Offers switch.
    openToOffers: p.offers_override ?? (p.providerProfile.open_to_offers || p.open_to_offers),
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
    coverUrl: p.cover_image_url,
    coverStyle: p.cover_style,
    typeName: p.serviceType?.name ?? null,
    productTypeId: p.service_type_id ?? p.product_type_id,
    businessTypeId: p.serviceType?.serviceCategory?.business_type_id ?? null,
    terms: [scheduleLine(p), p.payment_terms ? TERMS[p.payment_terms] : null].filter(Boolean).join(" · "),
    orders,
    createdAt: p.created_at.toISOString(),
    fresh: Date.now() - p.created_at.getTime() < 30 * 86_400_000,
    category,
    companyName: person?.company?.name ?? null,
    city: addr?.city ? [addr.city, addr.state].filter(Boolean).join(", ") : null,
    leadDays: p.lead_time_days,
    delivery: p.delivery,
  };
}

export async function getShopProduct(id: string, seesTest = false): Promise<ShopProduct | null> {
  const row = await prisma.serviceProduct.findFirst({ where: { id, status: "PUBLISHED", providerProfile: { person: memberVisibleWhere(seesTest) } }, select: SELECT });
  return row ? shape(row, 0) : null;
}


