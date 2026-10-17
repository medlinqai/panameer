import { prisma } from "@/lib/prisma";
import { memberVisibleWhere } from "@/lib/access";
import { scheduleLine } from "@/lib/cart";
import type { Viewer } from "@/lib/access";
import { isTalentCategory } from "@/lib/shop-categories";

export { isTalentCategory };

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
  /** SH: the Category (commodity group) and whether it's talent (masked for buyers). */
  category: string | null;
  talent: boolean;
  /** SH-E005: true when the seller is shown masked ("Oracle P2P consultant"). */
  masked: boolean;
  maskLabel: string;
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

/** SH-E005: what a buyer sees instead of a talent seller's name. */
export function maskLabel(title: string | null | undefined, category: string | null): string {
  const t = (title ?? "").replace(/\s*\(.*?\)/g, "").replace(/\b(Functional|Technical)\s+/gi, "").replace(/\bConsultant\b/, "consultant").trim();
  return t || `A ${category ?? "Panameer"} provider`;
}

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
    talent: isTalentCategory(category),
    masked: false,
    maskLabel: maskLabel(person?.title, category),
    companyName: person?.company?.name ?? null,
    city: addr?.city ? [addr.city, addr.state].filter(Boolean).join(", ") : null,
    leadDays: p.lead_time_days,
    delivery: p.delivery,
  };
}

/** SH-E005: whom this viewer may see by name — themselves, admins see all, and talent they bought from, matched, invited or are connected to. */
export async function talentVisibleTo(viewer: Viewer | null): Promise<(providerPersonId: string) => boolean> {
  if (!viewer) return () => false;
  if (viewer.isSystemAdmin || viewer.isAdmin) return () => true;
  const me = await prisma.person.findUnique({ where: { user_id: viewer.userId }, select: { id: true } });
  if (!me) return () => false;
  const [orders, lines, invites, proposals, links] = await Promise.all([
    prisma.workOrder.findMany({ where: { buyer_person_id: me.id }, select: { provider_person_id: true } }),
    prisma.workRequestLine.findMany({ where: { workRequest: { buyer_person_id: me.id, status: { not: "INCOMPLETE" } }, provider_person_id: { not: null } }, select: { provider_person_id: true } }),
    prisma.proposalRequest.findMany({ where: { invited_by_person_id: me.id }, select: { provider_person_id: true } }),
    prisma.proposal.findMany({ where: { job: { buyer_person_id: me.id } }, select: { provider_person_id: true } }),
    prisma.connection.findMany({ where: { status: "ACCEPTED", OR: [{ from_user_id: viewer.userId }, { to_user_id: viewer.userId }] }, select: { from_user_id: true, to_user_id: true } }),
  ]);
  const linkedUsers = links.map((l) => (l.from_user_id === viewer.userId ? l.to_user_id : l.from_user_id));
  const linked = linkedUsers.length ? await prisma.person.findMany({ where: { user_id: { in: linkedUsers } }, select: { id: true } }) : [];
  const ok = new Set<string>([me.id, ...orders.map((o) => o.provider_person_id), ...lines.map((l) => l.provider_person_id!), ...invites.map((i) => i.provider_person_id), ...proposals.map((x) => x.provider_person_id), ...linked.map((x) => x.id)]);
  return (id) => ok.has(id);
}

/** SH-E005: talent products show the seller masked unless this viewer may see them. */
export function maskProducts(list: ShopProduct[], canSee: (providerPersonId: string) => boolean): ShopProduct[] {
  return list.map((p) => (p.talent && !canSee(p.providerPersonId) ? { ...p, masked: true, providerName: p.maskLabel, providerFirst: "", providerLast: "", providerPhotoUrl: null, companyName: null } : p));
}

export async function getShopProduct(id: string, seesTest = false): Promise<ShopProduct | null> {
  const row = await prisma.serviceProduct.findFirst({ where: { id, status: "PUBLISHED", providerProfile: { person: memberVisibleWhere(seesTest) } }, select: SELECT });
  return row ? shape(row, 0) : null;
}

/** SH-E001: published in the last 7 days (newest first), topped up with the newest when the week is thin. */
export function newThisWeek(list: ShopProduct[], take = 8): ShopProduct[] {
  const week = list.filter((p) => Date.now() - Date.parse(p.createdAt) < 7 * 86_400_000);
  return (week.length >= 4 ? week : list).slice(0, take);
}

/** SH-E005: which of these provider profiles this viewer sees masked — talent sellers they haven't bought from, matched, invited or connected to. */
export async function maskedProfileIds(viewer: Viewer | null, profileIds: string[]): Promise<Set<string>> {
  if (!profileIds.length) return new Set();
  const [canSee, rows] = await Promise.all([
    talentVisibleTo(viewer),
    prisma.providerProfile.findMany({ where: { id: { in: profileIds } }, select: { id: true, person_id: true, person: { select: { company: { select: { businessTypes: { select: { businessType: { select: { commodityGroup: { select: { name: true } } } } } } } } } } } }),
  ]);
  return new Set(rows.filter((r) => (r.person.company?.businessTypes ?? []).some((b) => isTalentCategory(b.businessType.commodityGroup?.name)) && !canSee(r.person_id)).map((r) => r.id));
}
