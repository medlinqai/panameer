import type { PricingModel, ServiceDelivery, ServiceUnit } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// TX-E005: Admin › Service Taxonomy — the tree, the universal fields, order, hide, and the Suggested queue.
export async function taxonomyTree() {
  const [groups, suggested] = await Promise.all([
    prisma.commodityGroup.findMany({
      orderBy: { sort_order: "asc" },
      include: {
        // TX2-E003: the commodity's own Rates (commodity-level categories).
        serviceCategories: { orderBy: { sort_order: "asc" }, include: { serviceTypes: { where: { merged_into_id: null, status: { in: ["STOCK", "APPROVED"] } }, orderBy: { sort_order: "asc" }, include: { _count: { select: { serviceProducts: true } } } } }, },
        businessTypes: {
          orderBy: { sort_order: "asc" },
          include: {
            _count: { select: { companies: true } },
            serviceCategories: {
              orderBy: { sort_order: "asc" },
              include: { serviceTypes: { where: { merged_into_id: null, status: { in: ["STOCK", "APPROVED"] } }, orderBy: { sort_order: "asc" }, include: { _count: { select: { serviceProducts: true } } } } },
            },
          },
        },
      },
    }),
    prisma.serviceType.findMany({ where: { status: "SUGGESTED", merged_into_id: null }, orderBy: { created_at: "asc" } }),
  ]);
  // TL-E006: pillars still without an area or role (the AI ones carry an admin note).
  const homeless = await prisma.pillar.findMany({ where: { visible_to_members: true, area_id: null, role_id: null, retired_at: null }, orderBy: { name: "asc" }, select: { id: true, name: true, admin_note: true, _count: { select: { skills: true } } } });
  const used = new Map((await prisma.providerService.groupBy({ by: ["service_type_id"], where: { active: true }, _count: { _all: true } })).map((g) => [g.service_type_id, g._count._all]));
  return { groups, suggested, used, homeless };
}

export type TypeFields = { pricing_model?: PricingModel | null; units?: ServiceUnit[]; delivery?: ServiceDelivery | null; lead_time_days?: number | null; commodity_code?: string | null; required?: boolean; description?: string | null };

export async function updateType(id: string, f: TypeFields) {
  if (f.commodity_code && !/^\d{8}$/.test(f.commodity_code)) throw new Error("A commodity code is 8 digits (UNSPSC)");
  await prisma.serviceType.update({ where: { id }, data: f });
}

type Level = "group" | "businessType" | "category" | "type";
async function siblings(level: Level, id: string) {
  if (level === "group") return prisma.commodityGroup.findMany({ orderBy: { sort_order: "asc" }, select: { id: true } });
  if (level === "businessType") {
    const b = await prisma.businessType.findUniqueOrThrow({ where: { id }, select: { commodity_group_id: true } });
    return prisma.businessType.findMany({ where: { commodity_group_id: b.commodity_group_id }, orderBy: { sort_order: "asc" }, select: { id: true } });
  }
  if (level === "category") {
    const c = await prisma.serviceCategory.findUniqueOrThrow({ where: { id }, select: { business_type_id: true, commodity_group_id: true } });
    return prisma.serviceCategory.findMany({ where: c.business_type_id ? { business_type_id: c.business_type_id } : { commodity_group_id: c.commodity_group_id }, orderBy: { sort_order: "asc" }, select: { id: true } });
  }
  const t = await prisma.serviceType.findUniqueOrThrow({ where: { id }, select: { service_category_id: true } });
  return prisma.serviceType.findMany({ where: { service_category_id: t.service_category_id, merged_into_id: null }, orderBy: { sort_order: "asc" }, select: { id: true } });
}

/** Move up or down among its siblings; rewrites the siblings' sort_order 1..n. */
export async function move(level: Level, id: string, dir: -1 | 1) {
  const list = (await siblings(level, id)).map((r) => r.id);
  const i = list.indexOf(id), j = i + dir;
  if (i < 0 || j < 0 || j >= list.length) return;
  [list[i], list[j]] = [list[j], list[i]];
  const model = { group: prisma.commodityGroup, businessType: prisma.businessType, category: prisma.serviceCategory, type: prisma.serviceType }[level] as unknown as { update: (a: { where: { id: string }; data: { sort_order: number } }) => Promise<unknown> };
  for (const [k, rid] of list.entries()) await model.update({ where: { id: rid }, data: { sort_order: k + 1 } });
}

export async function setHidden(level: Level, id: string, hidden: boolean) {
  if (level === "group") await prisma.commodityGroup.update({ where: { id }, data: { hidden } });
  else if (level === "businessType") await prisma.businessType.update({ where: { id }, data: { hidden } });
  else if (level === "category") await prisma.serviceCategory.update({ where: { id }, data: { hidden } });
  else await prisma.serviceType.update({ where: { id }, data: { hidden } });
}

// MC-E007: Add · Rename · Hide · Delete at Business Type, Category and Type. Delete only when nothing uses it; otherwise Hide.
const cleanName = (name: string) => {
  const n = name.trim().replace(/\s+/g, " ").slice(0, 60);
  if (n.length < 2) throw new Error("Give it a name");
  return n;
};
const nextSort = (rows: { sort_order: number }[]) => rows.reduce((m, r) => Math.max(m, r.sort_order), 0) + 1;

export async function addBusinessType(groupId: string, name: string) {
  const n = cleanName(name);
  const code = `${n.toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 40)}_${Date.now().toString(36).toUpperCase()}`;
  const sibs = await prisma.businessType.findMany({ where: { commodity_group_id: groupId }, select: { sort_order: true } });
  await prisma.businessType.create({ data: { code, name: n, commodity_group_id: groupId, uses_skills: false, sort_order: nextSort(sibs) } });
}
export async function addCategory(businessTypeId: string, name: string, kind: "SERVICE" | "SERVICE_PRODUCT") {
  const n = cleanName(name);
  const sibs = await prisma.serviceCategory.findMany({ where: { business_type_id: businessTypeId }, select: { sort_order: true, name: true } });
  if (sibs.some((c) => c.name.toLowerCase() === n.toLowerCase())) throw new Error("That category already exists here");
  return prisma.serviceCategory.create({ data: { business_type_id: businessTypeId, name: n, kind, sort_order: nextSort(sibs) } });
}
/** A Rate Type goes into the business type's SERVICE category (created as "Rates" when it has none). */
export async function addType(target: { categoryId: string } | { businessTypeId: string } | { commodityGroupId: string }, name: string) {
  const n = cleanName(name);
  const cat = "categoryId" in target
    ? await prisma.serviceCategory.findUniqueOrThrow({ where: { id: target.categoryId }, select: { id: true, kind: true } })
    : "commodityGroupId" in target
    ? (await prisma.serviceCategory.findFirst({ where: { commodity_group_id: target.commodityGroupId, kind: "SERVICE" }, orderBy: { sort_order: "asc" }, select: { id: true, kind: true } })) ??
      (await prisma.serviceCategory.create({ data: { commodity_group_id: target.commodityGroupId, name: "Rates", kind: "SERVICE", sort_order: 1 }, select: { id: true, kind: true } }))
    : (await prisma.serviceCategory.findFirst({ where: { business_type_id: target.businessTypeId, kind: "SERVICE" }, orderBy: { sort_order: "asc" }, select: { id: true, kind: true } })) ?? (await addCategory(target.businessTypeId, "Rates", "SERVICE"));
  // TX2-E001: names are unique within a category.
  if (await prisma.serviceType.findFirst({ where: { service_category_id: cat.id, name: { equals: n, mode: "insensitive" } }, select: { id: true } })) throw new Error("A type with that name already exists here");
  const sibs = await prisma.serviceType.findMany({ where: { service_category_id: cat.id }, select: { sort_order: true } });
  await prisma.serviceType.create({
    data: { name: n, kind: cat.kind, status: "STOCK", is_baseline: true, service_category_id: cat.id, sort_order: nextSort(sibs), ...(cat.kind === "SERVICE" ? { pricing_model: "TIME", units: ["HOUR"], delivery: "OFFSITE" } : { pricing_model: "FIXED", units: ["EACH"], delivery: "OFFSITE" }) },
  });
}
export async function renameAt(level: Exclude<Level, "group">, id: string, name: string) {
  const n = cleanName(name);
  if (level === "businessType") await prisma.businessType.update({ where: { id }, data: { name: n } });
  else if (level === "category") await prisma.serviceCategory.update({ where: { id }, data: { name: n } });
  else {
    const cur = await prisma.serviceType.findUniqueOrThrow({ where: { id }, select: { service_category_id: true } });
    if (await prisma.serviceType.findFirst({ where: { service_category_id: cur.service_category_id, name: { equals: n, mode: "insensitive" }, NOT: { id } }, select: { id: true } })) throw new Error("A type with that name already exists here");
    await prisma.serviceType.update({ where: { id }, data: { name: n } });
  }
}
/** TX2-E004: the plain-words description (examples) behind the ? on a commodity or business type. */
export async function setDescription(level: "group" | "businessType", id: string, text: string) {
  const description = text.trim().slice(0, 300) || null;
  if (level === "group") await prisma.commodityGroup.update({ where: { id }, data: { description } });
  else await prisma.businessType.update({ where: { id }, data: { description } });
}

export async function setDefaultOn(id: string, on: boolean) {
  await prisma.serviceType.update({ where: { id }, data: { default_on: on } });
}

/** Everything that points at these types — services (active or not), service products, résumé suggestions. */
async function typeUse(ids: string[]) {
  if (!ids.length) return 0;
  const [a, b, c] = await Promise.all([
    prisma.providerService.count({ where: { service_type_id: { in: ids } } }),
    prisma.serviceProduct.count({ where: { service_type_id: { in: ids } } }),
    prisma.catalogSuggestion.count({ where: { service_type_id: { in: ids } } }),
  ]);
  return a + b + c;
}
export async function removeAt(level: Exclude<Level, "group">, id: string) {
  const inUse = () => new Error("It's in use — hide it instead");
  if (level === "type") {
    if (await typeUse([id])) throw inUse();
    await prisma.serviceType.delete({ where: { id } });
    return;
  }
  const catIds = level === "category" ? [id] : (await prisma.serviceCategory.findMany({ where: { business_type_id: id }, select: { id: true } })).map((c) => c.id);
  const typeIds = (await prisma.serviceType.findMany({ where: { service_category_id: { in: catIds } }, select: { id: true } })).map((t) => t.id);
  if (await typeUse(typeIds)) throw inUse();
  if (level === "businessType") {
    const b = await prisma.businessType.findUniqueOrThrow({ where: { id }, select: { _count: { select: { companies: true, skills: true, pillars: true, specializations: true, tags: true, buySettings: true } } } });
    if (Object.values(b._count).some((n) => n > 0)) throw inUse();
  }
  await prisma.$transaction([
    prisma.serviceType.deleteMany({ where: { id: { in: typeIds } } }),
    prisma.serviceCategory.deleteMany({ where: { id: { in: catIds } } }),
    ...(level === "businessType" ? [prisma.businessType.delete({ where: { id } })] : []),
  ]);
}

/** Suggested queue: approve into a category, rename, or merge into an existing type (its services and products move over). */
export async function approve(id: string, categoryId: string) {
  const cat = await prisma.serviceCategory.findUniqueOrThrow({ where: { id: categoryId }, select: { kind: true } });
  await prisma.serviceType.update({ where: { id }, data: { status: "APPROVED", service_category_id: categoryId, kind: cat.kind, reviewed_at: new Date() } });
}
export async function rename(id: string, name: string) {
  const clean = name.trim().replace(/\s+/g, " ").slice(0, 60);
  if (clean.length < 3) throw new Error("Give it a name");
  await prisma.serviceType.update({ where: { id }, data: { name: clean } });
}
export async function merge(id: string, into: string) {
  if (id === into) throw new Error("Pick a different type");
  await prisma.$transaction([
    prisma.providerService.updateMany({ where: { service_type_id: id }, data: { service_type_id: into } }),
    prisma.serviceProduct.updateMany({ where: { service_type_id: id }, data: { service_type_id: into } }),
    prisma.serviceType.update({ where: { id }, data: { status: "MERGED", merged_into_id: into, reviewed_at: new Date() } }),
  ]);
}
