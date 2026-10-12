import type { PaymentEvent, ServiceDelivery } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ownedProviderProfile, type Viewer } from "@/lib/access";
import { gapSentence, sellGaps } from "@/lib/gate-reads";
import { publishGate } from "@/lib/my-catalog";
import { LIVE_TYPE } from "@/lib/build-catalog";
const OWN_PRODUCT_TYPE = { merged_into_id: null, hidden: false, status: "SUGGESTED" as const, kind: "SERVICE_PRODUCT" as const };
import { personBusinessTypes } from "@/lib/business-types";
import { companyIdForProfile } from "@/lib/company-catalog";

// MC-E006: My Catalog › Service Products — the list and the Create card (mockup D). Owner-scoped from the session.
export type Pricing = "FIXED" | "MONTHLY" | "HOURLY";
export type PayPlan = "ON_DELIVERY" | "SPLIT" | "MONTHLY_ADVANCE";
export type ProductForm = {
  title: string; serviceTypeId: string | null; summary: string; images: string[]; pricing: Pricing; priceCents: number | null;
  delivery: ServiceDelivery | null; leadTimeDays: number | null; durationWeeks: number | null; domainIds: string[]; skillIds: string[];
  deliverables: string[]; payPlan: PayPlan;
};
export const MAX_IMAGES = 5;
const PRICING_ROW = { FIXED: { pricing_type: "FIXED", kind: "DELIVERABLE", billing_period: null }, MONTHLY: { pricing_type: "RECURRING", kind: "DEPLOYABLE", billing_period: "MONTHLY" }, HOURLY: { pricing_type: "HOURLY", kind: "HOURS", billing_period: null } } as const;
const PLAN: Record<PayPlan, { label: string; percent: number; event: PaymentEvent }[]> = {
  ON_DELIVERY: [{ label: "On delivery", percent: 100, event: "ACCEPTANCE" }],
  SPLIT: [{ label: "At start", percent: 50, event: "ORDER_ACCEPTED" }, { label: "On delivery", percent: 50, event: "ACCEPTANCE" }],
  MONTHLY_ADVANCE: [],
};

async function me(viewer: Viewer) {
  const p = await prisma.providerProfile.findFirst({ where: ownedProviderProfile(viewer), select: { id: true, person_id: true } });
  if (!p) throw new Error("No provider profile");
  return p;
}

/** The business types' Service Product Types with their defaults, grouped by category. */
export async function productTypes(personId: string) {
  const bts = await personBusinessTypes(personId);
  if (!bts.length) return [];
  // Stock types + the provider's own (Scott 2026-10-12: no waiting on the admin; they also land in the admin's suggestions).
  const stock = await prisma.serviceType.findMany({
    where: { kind: "SERVICE_PRODUCT", ...LIVE_TYPE, serviceCategory: { business_type_id: { in: bts.map((b) => b.id) }, hidden: false } },
    orderBy: [{ serviceCategory: { sort_order: "asc" } }, { sort_order: "asc" }],
    select: TYPE_SELECT,
  });
  const own = await prisma.serviceType.findMany({
    where: { ...OWN_PRODUCT_TYPE, OR: [{ created_by_person_id: personId }, { serviceProducts: { some: { providerProfile: { person_id: personId } } } }] },
    orderBy: { created_at: "asc" },
    select: TYPE_SELECT,
  });
  return [...stock, ...own.map((t) => ({ ...t, serviceCategory: { name: "Your Types" } }))];
}
const TYPE_SELECT = { id: true, name: true, pricing_model: true, units: true, delivery: true, lead_time_days: true, serviceCategory: { select: { name: true } } } as const;

/** "+ Add a Type…" in the Type dropdown — live for this provider at once; queued in Admin › Service Taxonomy suggestions. */
export async function addProductType(viewer: Viewer, rawName: string) {
  const p = await me(viewer);
  const name = rawName.trim().replace(/\s+/g, " ").slice(0, 60);
  if (name.length < 3) throw new Error("Give it a name");
  const hit = await prisma.serviceType.findFirst({ where: { name: { equals: name, mode: "insensitive" } } });
  if (hit && hit.status !== "SUGGESTED") throw new Error(`"${hit.name}" is already a type — pick it from the list`);
  if (hit) return { id: hit.id, name: hit.name };
  const bts = await personBusinessTypes(p.person_id);
  const cat = await prisma.serviceCategory.findFirst({ where: { business_type_id: { in: bts.map((b) => b.id) }, kind: "SERVICE_PRODUCT", hidden: false }, orderBy: { sort_order: "asc" }, select: { id: true } });
  const t = await prisma.serviceType.create({ data: { name, kind: "SERVICE_PRODUCT", status: "SUGGESTED", created_by_person_id: p.person_id, service_category_id: cat?.id ?? null, pricing_model: "FIXED", units: ["EACH"], delivery: "OFFSITE", sort_order: 900 } });
  return { id: t.id, name: t.name };
}

export async function catalogProductsPage(viewer: Viewer) {
  const p = await me(viewer);
  const [types, rows, domains, skills, gaps] = await Promise.all([
    productTypes(p.person_id),
    prisma.serviceProduct.findMany({
      where: { provider_profile_id: p.id }, orderBy: [{ sort_order: "asc" }, { created_at: "asc" }],
      include: { images: { orderBy: { sort_order: "asc" } }, serviceType: { select: { name: true } }, domains: { select: { domain_id: true } }, skills: { select: { skill_id: true } }, deliverables: { orderBy: { sequence: "asc" } }, milestones: { orderBy: { sequence: "asc" } } },
    }),
    prisma.domain.findMany({ orderBy: [{ process: "asc" }, { sort_order: "asc" }], select: { id: true, process: true, name: true } }),
    prisma.providerSkill.findMany({ where: { provider_profile_id: p.id }, select: { skill: { select: { id: true, name: true } } }, take: 40 }),
    sellGaps(viewer.userId),
  ]);
  return { types, products: rows.map(toForm), domains, skills: skills.map((s) => s.skill), sellGaps: gaps };
}

type Row = Awaited<ReturnType<typeof prisma.serviceProduct.findMany<{ include: { images: true; serviceType: { select: { name: true } }; domains: { select: { domain_id: true } }; skills: { select: { skill_id: true } }; deliverables: true; milestones: true } }>>>[number];
function toForm(r: Row) {
  const pricing: Pricing = r.pricing_type === "RECURRING" ? "MONTHLY" : r.pricing_type === "HOURLY" ? "HOURLY" : "FIXED";
  const payPlan: PayPlan = r.milestones.length === 2 ? "SPLIT" : r.milestones.length === 0 && pricing === "MONTHLY" ? "MONTHLY_ADVANCE" : "ON_DELIVERY";
  const images = r.images.length ? r.images.map((i) => i.url) : r.cover_image_url ? [r.cover_image_url] : [];
  return {
    id: r.id, status: r.status, typeName: r.serviceType?.name ?? null,
    form: { title: r.title, serviceTypeId: r.service_type_id, summary: r.summary ?? "", images, pricing, priceCents: r.price_cents, delivery: r.delivery, leadTimeDays: r.lead_time_days, durationWeeks: r.duration_weeks, domainIds: r.domains.map((d) => d.domain_id), skillIds: r.skills.map((s) => s.skill_id), deliverables: r.deliverables.map((d) => d.text), payPlan } satisfies ProductForm,
  };
}

/** What still blocks publishing: name, type, description, cover picture, price, delivery. */
export function publishMissing(f: ProductForm): string[] {
  return [
    !f.title.trim() && "a name", !f.serviceTypeId && "a type", !f.summary.trim() && "a description",
    !f.images.length && "a cover picture", f.priceCents == null && "a price", !f.delivery && "delivery",
  ].filter((x): x is string => !!x);
}

export async function saveCatalogProduct(viewer: Viewer, id: string | null, f: ProductForm, publish: boolean): Promise<string> {
  const p = await me(viewer);
  const title = f.title.trim().slice(0, 200);
  if (!title) throw new Error("Give it a name");
  if (f.serviceTypeId && !(await prisma.serviceType.findFirst({ where: { id: f.serviceTypeId, kind: "SERVICE_PRODUCT", OR: [LIVE_TYPE, OWN_PRODUCT_TYPE] }, select: { id: true } }))) throw new Error("Pick a type from the list");
  if (f.images.length > MAX_IMAGES) throw new Error(`Up to ${MAX_IMAGES} pictures`);
  if (f.priceCents != null && (!Number.isFinite(f.priceCents) || f.priceCents < 0)) throw new Error("That price isn't valid");
  if (publish) {
    const missing = publishMissing(f);
    if (missing.length) throw new Error(`To publish, add ${missing.join(", ")}.`);
    const gaps = await sellGaps(viewer.userId);
    if (gaps.length) throw new Error(gapSentence(gaps));
    if (!(await publishGate(p.person_id)).ok) throw new Error("Add your company to publish.");
  }
  const [domainIds, skillIds] = await Promise.all([
    prisma.domain.findMany({ where: { id: { in: f.domainIds } }, select: { id: true } }).then((r) => r.map((x) => x.id)),
    prisma.skill.findMany({ where: { id: { in: f.skillIds } }, select: { id: true } }).then((r) => r.map((x) => x.id)),
  ]);
  const owned = id ? await prisma.serviceProduct.findFirst({ where: { id, provider_profile_id: p.id }, select: { id: true, status: true } }) : null;
  if (id && !owned) throw new Error("That Service Product isn't yours");
  const plan = f.pricing === "MONTHLY" ? PLAN.MONTHLY_ADVANCE : PLAN[f.payPlan === "MONTHLY_ADVANCE" ? "ON_DELIVERY" : f.payPlan];
  const data = {
    title, summary: f.summary.trim().slice(0, 4000) || null, service_type_id: f.serviceTypeId, price_cents: f.priceCents,
    ...PRICING_ROW[f.pricing], delivery: f.delivery, lead_time_days: f.leadTimeDays, duration_weeks: f.durationWeeks,
    cover_image_url: f.images[0] ?? null, payment_terms: "NET30" as const, payment_event: (f.pricing === "MONTHLY" ? "ORDER_ACCEPTED" : "ACCEPTANCE") as PaymentEvent,
    status: publish ? ("PUBLISHED" as const) : owned?.status === "PUBLISHED" ? ("PUBLISHED" as const) : ("DRAFT" as const),
  };
  const children = {
    images: { create: f.images.map((url, i) => ({ url, sort_order: i })) },
    deliverables: { create: f.deliverables.map((t) => t.trim()).filter(Boolean).slice(0, 20).map((text, i) => ({ text: text.slice(0, 300), sequence: i })) },
    milestones: { create: plan.map((m, i) => ({ label: m.label, percent: m.percent, payment_event: m.event, sequence: i })) },
    skills: { create: skillIds.map((skill_id) => ({ skill_id })) },
    domains: { create: domainIds.map((domain_id) => ({ domain_id })) },
  };
  if (!owned) {
    const row = await prisma.serviceProduct.create({ data: { ...data, ...children, provider_profile_id: p.id, company_id: await companyIdForProfile(p.id) }, select: { id: true } });
    return row.id;
  }
  await prisma.$transaction([
    prisma.serviceProductImage.deleteMany({ where: { service_product_id: owned.id } }),
    prisma.serviceProductDeliverable.deleteMany({ where: { service_product_id: owned.id } }),
    prisma.serviceProductMilestone.deleteMany({ where: { service_product_id: owned.id } }),
    prisma.serviceProductSkill.deleteMany({ where: { service_product_id: owned.id } }),
    prisma.serviceProductDomain.deleteMany({ where: { service_product_id: owned.id } }),
    prisma.serviceProduct.update({ where: { id: owned.id }, data: { ...data, ...children } }),
  ]);
  return owned.id;
}

/** Publish from the list: the same checks as the Create card's Publish. */
export async function publishCatalogProduct(viewer: Viewer, id: string) {
  const page = await catalogProductsPage(viewer);
  const row = page.products.find((x) => x.id === id);
  if (!row) throw new Error("That Service Product isn't yours");
  return saveCatalogProduct(viewer, id, row.form, true);
}
