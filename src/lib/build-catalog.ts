import type { ServiceKind, ServiceUnit } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sellerCategoryWhere, sellerTypeByName } from "@/lib/business-types";
import { companyIdForProfile } from "@/lib/company-catalog";
import { ownedProviderProfile, type Viewer } from "@/lib/access";
import { publishGate } from "@/lib/my-catalog";
import { personBusinessTypes } from "@/lib/business-types";

// TX-E004: Build Your Catalog (road stop 4) — the stock Service Types of the provider's business type(s), each a toggle + rate.
export const LIVE_TYPE = { merged_into_id: null, hidden: false, status: { in: ["STOCK" as const, "APPROVED" as const] } };
/** A provider-added rate type: usable by providers who offer it while it waits in Admin › Service Taxonomy's suggestions. */
export const OWN_CUSTOM = { merged_into_id: null, hidden: false, status: "SUGGESTED" as const, kind: "SERVICE" as const };
export const UNIT_SHORT: Record<ServiceUnit, string> = { HOUR: "hr", DAY: "day", WEEK: "wk", MONTH: "mo", SESSION: "session", VISIT: "visit", EACH: "each" };

async function me(viewer: Viewer) {
  const p = await prisma.providerProfile.findFirst({ where: ownedProviderProfile(viewer), select: { id: true, person_id: true } });
  if (!p) throw new Error("No provider profile");
  return p;
}

export async function buildCatalogData(viewer: Viewer) {
  const p = await me(viewer);
  const types = await personBusinessTypes(p.person_id);
  // Custom rate types (Scott 2026-10-12, option 2): a provider's own SUGGESTED types show for them right away.
  const mine = (await prisma.providerService.findMany({ where: { provider_profile_id: p.id, service_type_id: { not: null } }, select: { service_type_id: true } })).map((r) => r.service_type_id!);
  const typeWhere = { OR: [LIVE_TYPE, { ...OWN_CUSTOM, OR: [{ id: { in: mine } }, { created_by_person_id: p.person_id }] }] };
  // TX2-E003: the commodity's Rates first, then the business types' own categories.
  const cats = types.length
    ? await prisma.serviceCategory.findMany({
        where: { AND: [await sellerCategoryWhere(p.person_id), { hidden: false }] },
        orderBy: [{ commodity_group_id: { sort: "asc", nulls: "last" } }, { sort_order: "asc" }],
        select: { id: true, name: true, kind: true, business_type_id: true, commodity_group_id: true, serviceTypes: { where: typeWhere, orderBy: [{ sort_order: "asc" }, { created_at: "asc" }], select: { id: true, name: true, description: true, units: true, required: true, pricing_model: true, delivery: true, default_on: true, status: true } } },
      })
    : [];
  const [services, products, gate] = await Promise.all([
    prisma.providerService.findMany({ where: { provider_profile_id: p.id, active: true, service_type_id: { not: null } }, select: { id: true, service_type_id: true, rate_cents: true, uom: true, published_at: true, expenses: true, hours_included: true } }),
    prisma.serviceProduct.findMany({ where: { provider_profile_id: p.id, service_type_id: { not: null } }, orderBy: { created_at: "asc" }, select: { service_type_id: true, title: true, status: true } }),
    publishGate(p.person_id),
  ]);
  return { businessTypes: types, categories: cats, services, products, gate };
}

export type ServiceInput = { serviceTypeId: string; on: boolean; rateCents?: number | null; unit?: ServiceUnit | null; expenses?: Expenses | null; hoursIncluded?: number | null };
export type Expenses = "AT_COST" | "INCLUDED" | "NOT_APPLICABLE";
/** MC-E005: Onsite defaults to expenses billed at cost; everything else to none. */
export const defaultExpenses = (delivery: string | null | undefined): Expenses => (delivery === "ONSITE" ? "AT_COST" : "NOT_APPLICABLE");

export async function saveCatalogService(viewer: Viewer, input: ServiceInput) {
  const p = await me(viewer);
  const t = await prisma.serviceType.findFirst({ where: { id: input.serviceTypeId, kind: "SERVICE", OR: [LIVE_TYPE, OWN_CUSTOM] }, select: { id: true, name: true, units: true, commodity_code: true, delivery: true } });
  if (!t) throw new Error("That service type isn't in your Service Catalog");
  const existing = await prisma.providerService.findFirst({ where: { provider_profile_id: p.id, service_type_id: t.id }, orderBy: { created_at: "desc" } });
  if (!input.on) {
    if (existing) await prisma.providerService.update({ where: { id: existing.id }, data: { active: false } });
    return null;
  }
  const unit = input.unit && t.units.includes(input.unit) ? input.unit : t.units[0] ?? "HOUR";
  const rate = input.rateCents != null && input.rateCents > 0 ? Math.round(input.rateCents) : null;
  const data = {
    name: t.name, uom: unit, rate_cents: rate ?? existing?.rate_cents ?? null, active: true, unspsc_code: t.commodity_code ?? existing?.unspsc_code ?? null, company_id: existing?.company_id ?? (await companyIdForProfile(p.id)),
    expenses: input.expenses ?? existing?.expenses ?? defaultExpenses(t.delivery),
    hours_included: unit === "MONTH" ? (input.hoursIncluded !== undefined ? (input.hoursIncluded && input.hoursIncluded > 0 ? Math.round(input.hoursIncluded) : null) : existing?.hours_included ?? null) : null,
  };
  const row = existing
    ? await prisma.providerService.update({ where: { id: existing.id }, data })
    : await prisma.providerService.create({ data: { ...data, provider_profile_id: p.id, service_type_id: t.id, service_type: "SERVICE_BY_QTY", payment_event: "TIMESHEET" } });
  return { id: row.id, rateCents: row.rate_cents, unit: row.uom, published: !!row.published_at, expenses: row.expenses, hoursIncluded: row.hours_included };
}

/** MC-E005: rate types "on by default" start on for a new provider, filled from the onsite/offsite rate given at registration.
 *  Runs once per type — a provider who turns one off keeps it off (the row stays, inactive). */
export async function ensureDefaultRates(viewer: Viewer) {
  const p = await me(viewer);
  const bts = await personBusinessTypes(p.person_id);
  if (!bts.length) return;
  const [types, have, prof] = await Promise.all([
    prisma.serviceType.findMany({ where: { kind: "SERVICE", default_on: true, ...LIVE_TYPE, serviceCategory: { AND: [await sellerCategoryWhere(p.person_id), { hidden: false }] } }, select: { id: true, units: true, delivery: true } }),
    prisma.providerService.findMany({ where: { provider_profile_id: p.id, service_type_id: { not: null } }, select: { service_type_id: true } }),
    prisma.providerProfile.findUniqueOrThrow({ where: { id: p.id }, select: { onsite_rate_cents: true, remote_rate_cents: true, hourly_rate_cents: true } }),
  ]);
  const seen = new Set(have.map((h) => h.service_type_id));
  for (const t of types.filter((t) => !seen.has(t.id))) {
    const rate = registrationRate(prof, t.delivery);
    await saveCatalogService(viewer, { serviceTypeId: t.id, on: true, rateCents: rate, unit: t.units[0] ?? "HOUR" });
  }
}

/** The rate a provider gave at registration for this delivery (onsite / offsite), if any. */
export function registrationRate(prof: { onsite_rate_cents: number | null; remote_rate_cents: number | null; hourly_rate_cents: number | null }, delivery: string | null) {
  return delivery === "ONSITE" ? prof.onsite_rate_cents : delivery === "OFFSITE" ? prof.remote_rate_cents ?? prof.hourly_rate_cents : null;
}

/** Publish My Catalog: every active, priced service goes live (needs a linked company). */
export async function publishCatalog(viewer: Viewer) {
  const p = await me(viewer);
  const gate = await publishGate(p.person_id);
  if (!gate.ok) throw new Error(gate.reason ?? "Add your company to publish");
  const r = await prisma.providerService.updateMany({ where: { provider_profile_id: p.id, active: true, rate_cents: { not: null }, published_at: null }, data: { published_at: new Date() } });
  return r.count;
}

/** "+ Add a Rate Type" (Scott 2026-10-12): live for this provider at once; also lands in the admin's suggestions to approve, merge or rename. */
export async function addCustomRate(viewer: Viewer, input: { name: string; unit: ServiceUnit; delivery: "ONSITE" | "OFFSITE" | "EITHER" }) {
  const p = await me(viewer);
  const name = input.name.trim().replace(/\s+/g, " ").slice(0, 60);
  if (name.length < 3) throw new Error("Give it a name");
  const bts = await personBusinessTypes(p.person_id);
  if (!bts.length) throw new Error("Pick your company's business type first");
  const hit = await sellerTypeByName(p.person_id, name);
  if (hit && hit.status !== "SUGGESTED") throw new Error(`"${hit.name}" is already a rate type — turn it on above`);
  const cat = await prisma.serviceCategory.findFirst({ where: { AND: [await sellerCategoryWhere(p.person_id), { kind: "SERVICE", hidden: false }] }, orderBy: [{ commodity_group_id: { sort: "asc", nulls: "last" } }, { sort_order: "asc" }], select: { id: true } });
  const t = hit ?? (await prisma.serviceType.create({ data: { name, kind: "SERVICE", status: "SUGGESTED", created_by_person_id: p.person_id, service_category_id: cat?.id ?? null, units: [input.unit], delivery: input.delivery, pricing_model: input.unit === "MONTH" ? "RECURRING" : "TIME", sort_order: 900 } }));
  return saveCatalogService(viewer, { serviceTypeId: t.id, on: true });
}

/** "Suggest a Service Type" / "Suggest a Service Product Type" — goes to Admin › Service Taxonomy as SUGGESTED. */
export async function suggestType(viewer: Viewer, name: string, kind: ServiceKind) {
  const p = await me(viewer);
  const clean = name.trim().replace(/\s+/g, " ").slice(0, 60);
  if (clean.length < 3) throw new Error("Give it a name");
  const hit = await sellerTypeByName(p.person_id, clean);
  if (hit) return { existing: true };
  await prisma.serviceType.create({ data: { name: clean, kind, status: "SUGGESTED", created_by_person_id: p.person_id } });
  return { existing: false };
}
