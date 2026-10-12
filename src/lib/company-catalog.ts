import { prisma } from "@/lib/prisma";
import { ownedProviderProfile, type Viewer } from "@/lib/access";

// BT-E005: the company owns the catalog. A provider may override the company rate for themselves; buyers see the
// override when set, else the company rate. The override is offered only when the company has more than one provider.

/** The seller company a provider profile belongs to (approved membership), or null. */
export async function companyIdForProfile(profileId: string): Promise<string | null> {
  const m = await prisma.companyMembership.findFirst({ where: { status: "APPROVED", person: { providerProfile: { id: profileId } } }, select: { company_id: true } });
  return m?.company_id ?? null;
}

export async function companyProviderCount(companyId: string): Promise<number> {
  return prisma.companyMembership.count({ where: { company_id: companyId, status: "APPROVED", person: { is_service_provider: true } } });
}

/** Rate buyers see per service for one provider: their override if set, else the service's own (company) rate. */
export async function effectiveRates<T extends { id: string; rate_cents: number | null; uom: string | null }>(personId: string | null, rows: T[]): Promise<T[]> {
  if (!personId || !rows.length) return rows;
  const ov = await prisma.providerRateOverride.findMany({ where: { person_id: personId, service_id: { in: rows.map((r) => r.id) } }, select: { service_id: true, rate_cents: true, unit: true } });
  if (!ov.length) return rows;
  const by = new Map(ov.map((o) => [o.service_id, o]));
  return rows.map((r) => { const o = by.get(r.id); return o ? { ...r, rate_cents: o.rate_cents, uom: o.unit } : r; });
}

/** Override My Rate — only for a company service, only when the company has more than one provider. Null clears it. */
export async function setRateOverride(viewer: Viewer, serviceId: string, rateCents: number | null, unit: string | null) {
  const p = await prisma.providerProfile.findFirst({ where: ownedProviderProfile(viewer), select: { id: true, person_id: true } });
  if (!p) throw new Error("No provider profile");
  const companyId = await companyIdForProfile(p.id);
  const svc = companyId ? await prisma.providerService.findFirst({ where: { id: serviceId, company_id: companyId, active: true }, select: { id: true, uom: true } }) : null;
  if (!companyId || !svc) throw new Error("That isn't one of your company's services");
  if ((await companyProviderCount(companyId)) < 2) throw new Error("Rate overrides are for companies with more than one provider");
  const key = { person_id_service_id: { person_id: p.person_id, service_id: svc.id } };
  if (rateCents == null) return prisma.providerRateOverride.deleteMany({ where: { person_id: p.person_id, service_id: svc.id } });
  const u = unit ?? svc.uom ?? "HOUR";
  return prisma.providerRateOverride.upsert({ where: key, create: { company_id: companyId, person_id: p.person_id, service_id: svc.id, rate_cents: rateCents, unit: u }, update: { rate_cents: rateCents, unit: u } });
}
