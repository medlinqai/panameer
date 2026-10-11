import { prisma } from "@/lib/prisma";
import type { Viewer } from "@/lib/access";

// TX-E003: business types a provider company sells under (more than one allowed). Only seeded, visible types are offered.
export async function offeredBusinessTypes() {
  return prisma.businessType.findMany({
    where: { hidden: false, commodity_group_id: { not: null } },
    orderBy: [{ sort_order: "asc" }, { name: "asc" }],
    select: { id: true, name: true, uses_skills: true, commodityGroup: { select: { name: true } } },
  });
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
