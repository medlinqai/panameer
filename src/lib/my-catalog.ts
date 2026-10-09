import { prisma } from "@/lib/prisma";
import { companyChecklist } from "@/lib/your-path";
import { termsLine } from "@/lib/billing-terms";

// My Catalog (2026-10-09): what a provider sells — services, service products, cost estimates.
export const BASELINE_SERVICE_TYPES = ["Onsite Consulting", "Offsite Consulting", "Mentoring", "Training", "Staff Augmentation", "AI Agent Support"];

/** CAT-E004: publishing needs no Panameer review, only a validated seller company. */
export async function publishGate(personId: string): Promise<{ ok: boolean; href: string; reason: string | null }> {
  const m = await prisma.companyMembership.findFirst({ where: { person_id: personId, status: "APPROVED" }, select: { company_id: true } });
  if (!m) return { ok: false, href: "/company?join=1#join", reason: "Add your company first." };
  const c = await companyChecklist(m.company_id, { payout: true });
  return c?.ready ? { ok: true, href: "", reason: null } : { ok: false, href: "/company/legal", reason: `Finish ${c?.items.filter((i) => !i.done).map((i) => i.item.toLowerCase()).join(", ") || "your company details"}.` };
}

/** CAT-E002: baseline types (created on first read) plus the ones providers added, merged ones folded away. */
export async function listServiceTypes() {
  const n = await prisma.serviceType.count({ where: { is_baseline: true } });
  if (n < BASELINE_SERVICE_TYPES.length)
    for (const [i, name] of BASELINE_SERVICE_TYPES.entries())
      await prisma.serviceType.upsert({ where: { name }, create: { name, is_baseline: true, sort_order: i, reviewed_at: new Date() }, update: { is_baseline: true } });
  return prisma.serviceType.findMany({ where: { merged_into_id: null }, orderBy: [{ is_baseline: "desc" }, { sort_order: "asc" }, { name: "asc" }], select: { id: true, name: true, is_baseline: true } });
}

/** "Add your own" — reused if the name already exists (case-insensitive). */
export async function addServiceType(name: string, personId: string) {
  const clean = name.trim().replace(/\s+/g, " ").slice(0, 60);
  if (clean.length < 3) throw new Error("Give the service type a name");
  const hit = await prisma.serviceType.findFirst({ where: { name: { equals: clean, mode: "insensitive" } } });
  if (hit) return hit.merged_into_id ? (await prisma.serviceType.findUnique({ where: { id: hit.merged_into_id } }))! : hit;
  return prisma.serviceType.create({ data: { name: clean, created_by_person_id: personId } });
}

export type CatalogService = { id: string; name: string; typeName: string | null; rateCents: number; uom: string; published: boolean; terms: string | null };

/** CAT-E001: services on a profile — the owner sees drafts too; visitors only published. */
export async function catalogServicesFor(profileId: string, owner: boolean): Promise<CatalogService[]> {
  const rows = await prisma.providerService.findMany({ where: { provider_profile_id: profileId, active: true, rate_cents: { not: null }, ...(owner ? {} : { published_at: { not: null } }) }, orderBy: [{ sort_order: "asc" }, { created_at: "asc" }] });
  const types = new Map((await prisma.serviceType.findMany({ where: { id: { in: rows.map((r) => r.service_type_id).filter((x): x is string => !!x) } }, select: { id: true, name: true } })).map((t) => [t.id, t.name]));
  return rows.map((r) => ({ id: r.id, name: r.name, typeName: r.service_type_id ? types.get(r.service_type_id) ?? null : null, rateCents: r.rate_cents ?? 0, uom: r.uom ?? "HOUR", published: !!r.published_at, terms: termsLine(r) }));
}
