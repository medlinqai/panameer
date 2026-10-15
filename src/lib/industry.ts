import { prisma } from "@/lib/prisma";

// IN-E001: Industry matters for professional services — required for sellers whose company sells in these commodities.
export const INDUSTRY_COMMODITIES = ["Professional Services", "Technology", "Marketing & Creative"];

/** True when the person's company has a Business Type in Professional Services, Technology or Marketing & Creative. */
export async function industryRequired(personId: string): Promise<boolean> {
  const m = await prisma.companyMembership.findFirst({ where: { person_id: personId, status: "APPROVED" }, select: { company_id: true } });
  if (!m) return false;
  return (await prisma.companyBusinessType.count({ where: { company_id: m.company_id, businessType: { commodityGroup: { name: { in: INDUSTRY_COMMODITIES } } } } })) > 0;
}

/** Profiles (of those) that already have ≥1 INDUSTRY specialization. */
export async function hasIndustry(profileId: string): Promise<boolean> {
  return (await prisma.providerProfileSpecialization.count({ where: { provider_profile_id: profileId, specialization: { kind: "INDUSTRY" } } })) > 0;
}

/** IN-E002: the gap, if any — used by sign-up (publish profile) and catalog publishing. */
export async function industryGap(personId: string, profileId: string): Promise<string | null> {
  if (!(await industryRequired(personId))) return null;
  return (await hasIndustry(profileId)) ? null : "the industries you've worked in";
}

/** IN-E002: profile ids (from a set) whose sellers need an industry and have none — completeness counts them as missing. */
export async function profilesMissingIndustry(profileIds: string[]): Promise<Set<string>> {
  if (!profileIds.length) return new Set();
  const rows = await prisma.providerProfile.findMany({
    where: { id: { in: profileIds }, specializations: { none: { specialization: { kind: "INDUSTRY" } } } },
    select: { id: true, person: { select: { companyMemberships: { where: { status: "APPROVED" }, take: 1, select: { company: { select: { businessTypes: { select: { businessType: { select: { commodityGroup: { select: { name: true } } } } } } } } } } } } },
  });
  return new Set(rows.filter((r) => r.person.companyMemberships[0]?.company.businessTypes.some((b) => INDUSTRY_COMMODITIES.includes(b.businessType.commodityGroup?.name ?? ""))).map((r) => r.id));
}

/** IN-E002: add industries to a seller's profile (keeps every specialization they already have). */
export async function addIndustries(profileId: string, ids: string[]) {
  const valid = await prisma.specialization.findMany({ where: { id: { in: ids }, kind: "INDUSTRY" }, select: { id: true } });
  await prisma.providerProfileSpecialization.createMany({ data: valid.map((v) => ({ provider_profile_id: profileId, specialization_id: v.id })), skipDuplicates: true });
  return valid.length;
}
