import { prisma } from "@/lib/prisma";
import type { Viewer } from "@/lib/access";

/** TL-E007: a real company — not a "MyCo Test…" fixture, and with at least one approved member whose sign-in isn't a test account. */
export const REAL_COMPANY = { NOT: { name: { startsWith: "MyCo Test" } }, memberships: { some: { status: "APPROVED" as const, person: { user: { is: { is_test: false } } } } } };

// TX-E003: business types a provider company sells under (more than one allowed). Only seeded, visible types are offered.
export async function offeredBusinessTypes() {
  const rows = await prisma.businessType.findMany({
    where: { hidden: false, commodity_group_id: { not: null } },
    orderBy: [{ sort_order: "asc" }, { name: "asc" }],
    select: { id: true, name: true, uses_skills: true, commodityGroup: { select: { name: true, sort_order: true } } },
  });
  // Group order first (stable sort keeps type order inside a group).
  return rows.sort((a, b) => (a.commodityGroup?.sort_order ?? 0) - (b.commodityGroup?.sort_order ?? 0));
}

export async function companyBusinessTypeIds(companyId: string): Promise<string[]> {
  return (await prisma.companyBusinessType.findMany({ where: { company_id: companyId }, select: { business_type_id: true } })).map((r) => r.business_type_id);
}

/** The viewer's company and whether they may change it (a company admin). */
export async function myCompany(viewer: Viewer) {
  const m = await prisma.companyMembership.findFirst({ where: { person: { user_id: viewer.userId }, status: "APPROVED" }, select: { company_id: true, role: true } });
  return m ? { companyId: m.company_id, isAdmin: m.role === "ADMIN" } : null;
}

export async function setCompanyBusinessType(viewer: Viewer, businessTypeId: string, on: boolean) {
  const co = await myCompany(viewer);
  if (!co) throw new Error("Add your company first");
  if (!co.isAdmin) throw new Error("Only a company admin can change this");
  const bt = await prisma.businessType.findFirst({ where: { id: businessTypeId, hidden: false, commodity_group_id: { not: null } }, select: { id: true } });
  if (!bt) throw new Error("That business type isn't offered");
  if (on) await prisma.companyBusinessType.upsert({ where: { company_id_business_type_id: { company_id: co.companyId, business_type_id: bt.id } }, create: { company_id: co.companyId, business_type_id: bt.id }, update: {} });
  else {
    const n = await prisma.companyBusinessType.count({ where: { company_id: co.companyId } });
    if (n <= 1) throw new Error("Keep at least one business type");
    await prisma.companyBusinessType.deleteMany({ where: { company_id: co.companyId, business_type_id: bt.id } });
  }
  return companyBusinessTypeIds(co.companyId);
}

/** The business types the provider (person) sells under — their company's. */
export async function personBusinessTypes(personId: string) {
  const m = await prisma.companyMembership.findFirst({ where: { person_id: personId, status: "APPROVED" }, select: { company_id: true } });
  if (!m) return [];
  return prisma.businessType.findMany({ where: { companies: { some: { company_id: m.company_id } } }, orderBy: { sort_order: "asc" }, select: { id: true, name: true } });
}

/** BT-E001: a seller company — it has a business type, or a member who sells. Sellers get Industries You Serve; buyers keep Industry. */
export async function companyIsSeller(companyId: string): Promise<boolean> {
  const [bt, provider] = await Promise.all([
    prisma.companyBusinessType.count({ where: { company_id: companyId } }),
    prisma.companyMembership.count({ where: { company_id: companyId, status: "APPROVED", person: { is_service_provider: true } } }),
  ]);
  return bt + provider > 0;
}

export async function industriesServed(companyId: string): Promise<string[]> {
  return (await prisma.companyIndustry.findMany({ where: { company_id: companyId }, select: { specialization_id: true } })).map((r) => r.specialization_id);
}

export async function setIndustryServed(viewer: Viewer, specializationId: string, on: boolean) {
  const co = await myCompany(viewer);
  if (!co) throw new Error("Add your company first");
  if (!co.isAdmin) throw new Error("Only a company admin can change this");
  const ind = await prisma.specialization.findFirst({ where: { id: specializationId, kind: "INDUSTRY", status: "ACTIVE" }, select: { id: true } });
  if (!ind) throw new Error("Pick an industry from the list");
  if (on) await prisma.companyIndustry.upsert({ where: { company_id_specialization_id: { company_id: co.companyId, specialization_id: ind.id } }, create: { company_id: co.companyId, specialization_id: ind.id }, update: {} });
  else await prisma.companyIndustry.deleteMany({ where: { company_id: co.companyId, specialization_id: ind.id } });
  return industriesServed(co.companyId);
}
