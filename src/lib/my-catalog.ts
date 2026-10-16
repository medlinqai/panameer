import { prisma } from "@/lib/prisma";
import { industryGap } from "@/lib/industry";
import { sellerCategoryWhere, sellerTypeByName } from "@/lib/business-types";
import { effectiveRates } from "@/lib/company-catalog";
import { termsLine } from "@/lib/billing-terms";

// My Catalog (2026-10-09): what a provider sells — services, service products, estimates.

/** CAT-E004 / RD-E003: publishing needs no Panameer review, only a linked company (validation waits until payment). */
export async function publishGate(personId: string): Promise<{ ok: boolean; href: string; reason: string | null }> {
  const m = await prisma.companyMembership.findFirst({ where: { person_id: personId, status: "APPROVED" }, select: { company_id: true } });
  if (!m) {
    // SO-E004: a pending joiner is told why.
    const pending = await prisma.companyMembership.findFirst({ where: { person_id: personId, status: "PENDING" }, select: { company: { select: { name: true } } } });
    if (pending) return { ok: false, href: "/company", reason: `${pending.company.name}'s admin hasn't approved you yet — you can go live once they do.` };
    return { ok: false, href: "/company?join=1#join", reason: "Add your company first." };
  }
  // Scott 10-16: industries are optional — asked in Get Found, never a publish blocker.
  return { ok: true, href: "", reason: null };
}

/** CAT-E002 / TX-E002: the services' types — stock (seeded by scripts/seed-service-taxonomy.ts) plus provider-added, merged ones folded away. */
export async function listServiceTypes(personId?: string) {
  // TX2-E003: for a seller, only their commodity's Rates + their business types' service categories (+ their own suggestions).
  const scope = personId ? { OR: [{ serviceCategory: await sellerCategoryWhere(personId) }, { service_category_id: null, created_by_person_id: personId }] } : {};
  return prisma.serviceType.findMany({ where: { merged_into_id: null, kind: "SERVICE", ...scope }, orderBy: [{ is_baseline: "desc" }, { sort_order: "asc" }, { name: "asc" }], select: { id: true, name: true, is_baseline: true } });
}

/** "Add your own" — reused if the name already exists (case-insensitive). */
export async function addServiceType(name: string, personId: string) {
  const clean = name.trim().replace(/\s+/g, " ").slice(0, 60);
  if (clean.length < 3) throw new Error("Give the service type a name");
  const hit = await sellerTypeByName(personId, clean);
  if (hit) return hit.merged_into_id ? (await prisma.serviceType.findUnique({ where: { id: hit.merged_into_id } }))! : hit;
  return prisma.serviceType.create({ data: { name: clean, created_by_person_id: personId, status: "SUGGESTED" } });
}

export type CatalogService = { id: string; name: string; typeName: string | null; rateCents: number; uom: string; published: boolean; terms: string | null; expenses: string | null; hoursIncluded: number | null; openToOffers: boolean; offersOverride: boolean | null };

/** CAT-E001: services on a profile — the owner sees drafts too; visitors only published. */
export async function catalogServicesFor(profileId: string, owner: boolean): Promise<CatalogService[]> {
  const raw = await prisma.providerService.findMany({ where: { provider_profile_id: profileId, active: true, rate_cents: { not: null }, ...(owner ? {} : { published_at: { not: null } }) }, orderBy: [{ sort_order: "asc" }, { created_at: "asc" }] });
  const pp = await prisma.providerProfile.findUnique({ where: { id: profileId }, select: { person_id: true, open_to_offers: true } });
  const rows = await effectiveRates(pp?.person_id ?? null, raw);
  const types = new Map((await prisma.serviceType.findMany({ where: { id: { in: rows.map((r) => r.service_type_id).filter((x): x is string => !!x) } }, select: { id: true, name: true } })).map((t) => [t.id, t.name]));
  return rows.map((r) => ({ id: r.id, name: r.name, typeName: r.service_type_id ? types.get(r.service_type_id) ?? null : null, rateCents: r.rate_cents ?? 0, uom: r.uom ?? "HOUR", published: !!r.published_at, terms: termsLine(r), expenses: r.expenses, hoursIncluded: r.hours_included, openToOffers: r.offers_override ?? !!pp?.open_to_offers, offersOverride: r.offers_override }));
}
