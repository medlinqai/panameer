import type { ServiceKind, ServiceUnit } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { companyIdForProfile } from "@/lib/company-catalog";
import { ownedProviderProfile, type Viewer } from "@/lib/access";
import { publishGate } from "@/lib/my-catalog";
import { personBusinessTypes } from "@/lib/business-types";

// TX-E004: Build Your Catalog (road stop 4) — the stock Service Types of the provider's business type(s), each a toggle + rate.
export const LIVE_TYPE = { merged_into_id: null, hidden: false, status: { in: ["STOCK" as const, "APPROVED" as const] } };
export const UNIT_SHORT: Record<ServiceUnit, string> = { HOUR: "hr", DAY: "day", WEEK: "wk", MONTH: "mo", SESSION: "session", VISIT: "visit", EACH: "each" };

async function me(viewer: Viewer) {
  const p = await prisma.providerProfile.findFirst({ where: ownedProviderProfile(viewer), select: { id: true, person_id: true } });
  if (!p) throw new Error("No provider profile");
  return p;
}

export async function buildCatalogData(viewer: Viewer) {
  const p = await me(viewer);
  const types = await personBusinessTypes(p.person_id);
  const cats = types.length
    ? await prisma.serviceCategory.findMany({
        where: { business_type_id: { in: types.map((t) => t.id) } },
        orderBy: [{ sort_order: "asc" }],
        select: { id: true, name: true, kind: true, business_type_id: true, serviceTypes: { where: LIVE_TYPE, orderBy: { sort_order: "asc" }, select: { id: true, name: true, description: true, units: true, required: true, pricing_model: true } } },
      })
    : [];
  const [services, products, gate] = await Promise.all([
    prisma.providerService.findMany({ where: { provider_profile_id: p.id, active: true, service_type_id: { not: null } }, select: { id: true, service_type_id: true, rate_cents: true, uom: true, published_at: true } }),
    prisma.serviceProduct.findMany({ where: { provider_profile_id: p.id, service_type_id: { not: null } }, orderBy: { created_at: "asc" }, select: { service_type_id: true, title: true, status: true } }),
    publishGate(p.person_id),
  ]);
  return { businessTypes: types, categories: cats, services, products, gate };
}

export async function saveCatalogService(viewer: Viewer, input: { serviceTypeId: string; on: boolean; rateCents?: number | null; unit?: ServiceUnit | null }) {
  const p = await me(viewer);
  const t = await prisma.serviceType.findFirst({ where: { id: input.serviceTypeId, kind: "SERVICE", ...LIVE_TYPE }, select: { id: true, name: true, units: true, commodity_code: true } });
  if (!t) throw new Error("That service type isn't in your Service Catalog");
  const existing = await prisma.providerService.findFirst({ where: { provider_profile_id: p.id, service_type_id: t.id }, orderBy: { created_at: "desc" } });
  if (!input.on) {
    if (existing) await prisma.providerService.update({ where: { id: existing.id }, data: { active: false } });
    return null;
  }
  const unit = input.unit && t.units.includes(input.unit) ? input.unit : t.units[0] ?? "HOUR";
  const rate = input.rateCents != null && input.rateCents > 0 ? Math.round(input.rateCents) : null;
  const data = { name: t.name, uom: unit, rate_cents: rate ?? existing?.rate_cents ?? null, active: true, unspsc_code: t.commodity_code ?? existing?.unspsc_code ?? null, company_id: existing?.company_id ?? (await companyIdForProfile(p.id)) };
  const row = existing
    ? await prisma.providerService.update({ where: { id: existing.id }, data })
    : await prisma.providerService.create({ data: { ...data, provider_profile_id: p.id, service_type_id: t.id, service_type: "SERVICE_BY_QTY", payment_event: "TIMESHEET" } });
  return { id: row.id, rateCents: row.rate_cents, unit: row.uom, published: !!row.published_at };
}

/** Publish My Catalog: every active, priced service goes live (needs a linked company). */
export async function publishCatalog(viewer: Viewer) {
  const p = await me(viewer);
  const gate = await publishGate(p.person_id);
  if (!gate.ok) throw new Error(gate.reason ?? "Add your company to publish");
  const r = await prisma.providerService.updateMany({ where: { provider_profile_id: p.id, active: true, rate_cents: { not: null }, published_at: null }, data: { published_at: new Date() } });
  return r.count;
}

/** "Suggest a Service Type" / "Suggest a Service Product Type" — goes to Admin › Service Taxonomy as SUGGESTED. */
export async function suggestType(viewer: Viewer, name: string, kind: ServiceKind) {
  const p = await me(viewer);
  const clean = name.trim().replace(/\s+/g, " ").slice(0, 60);
  if (clean.length < 3) throw new Error("Give it a name");
  const hit = await prisma.serviceType.findFirst({ where: { name: { equals: clean, mode: "insensitive" } } });
  if (hit) return { existing: true };
  await prisma.serviceType.create({ data: { name: clean, kind, status: "SUGGESTED", created_by_person_id: p.person_id } });
  return { existing: false };
}
