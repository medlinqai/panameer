import { prisma } from "@/lib/prisma";
import type { Viewer } from "@/lib/access";
import { myCompany } from "@/lib/business-types";

// TX-E006: What We Buy — a buyer company switches commodity groups / business types on or off.
// No row = the default: on, except parked (hidden) groups. A business type follows its group unless set itself.
export async function whatWeBuy(companyId: string | null) {
  const [groups, rows] = await Promise.all([
    prisma.commodityGroup.findMany({ orderBy: { sort_order: "asc" }, select: { id: true, name: true, hidden: true, businessTypes: { orderBy: { sort_order: "asc" }, select: { id: true, name: true, hidden: true } } } }),
    companyId ? prisma.buySetting.findMany({ where: { company_id: companyId } }) : Promise.resolve([]),
  ]);
  const g = new Map(rows.filter((r) => r.commodity_group_id && !r.business_type_id).map((r) => [r.commodity_group_id!, r.enabled]));
  const b = new Map(rows.filter((r) => r.business_type_id).map((r) => [r.business_type_id!, r.enabled]));
  return groups.map((x) => {
    const on = g.get(x.id) ?? !x.hidden;
    return { id: x.id, name: x.name, parked: x.hidden, on, businessTypes: x.businessTypes.filter((t) => !t.hidden).map((t) => ({ id: t.id, name: t.name, on: on && (b.get(t.id) ?? true) })) };
  });
}

/** Business types this person's company has switched off (directly or through its group). */
export async function offBusinessTypeIds(userId: string): Promise<Set<string>> {
  const m = await prisma.companyMembership.findFirst({ where: { person: { user_id: userId }, status: "APPROVED" }, select: { company_id: true } });
  const list = await whatWeBuy(m?.company_id ?? null);
  return new Set(list.flatMap((g) => g.businessTypes.filter((t) => !t.on).map((t) => t.id)));
}

export async function setWhatWeBuy(viewer: Viewer, input: { commodityGroupId?: string | null; businessTypeId?: string | null; enabled: boolean }) {
  const co = await myCompany(viewer);
  if (!co) throw new Error("Add your company first");
  if (!co.isAdmin) throw new Error("Only a company admin can change this");
  const where = { company_id: co.companyId, commodity_group_id: input.businessTypeId ? null : input.commodityGroupId ?? null, business_type_id: input.businessTypeId ?? null };
  if (!where.commodity_group_id && !where.business_type_id) throw new Error("Pick a commodity group or business type");
  const hit = await prisma.buySetting.findFirst({ where });
  if (hit) await prisma.buySetting.update({ where: { id: hit.id }, data: { enabled: input.enabled } });
  else await prisma.buySetting.create({ data: { ...where, enabled: input.enabled } });
  return whatWeBuy(co.companyId);
}
