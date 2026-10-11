import type { PricingModel, ServiceDelivery, ServiceUnit } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// TX-E005: Admin › Service Taxonomy — the tree, the universal fields, order, hide, and the Suggested queue.
export async function taxonomyTree() {
  const [groups, suggested] = await Promise.all([
    prisma.commodityGroup.findMany({
      orderBy: { sort_order: "asc" },
      include: {
        businessTypes: {
          orderBy: { sort_order: "asc" },
          include: {
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
    const c = await prisma.serviceCategory.findUniqueOrThrow({ where: { id }, select: { business_type_id: true } });
    return prisma.serviceCategory.findMany({ where: { business_type_id: c.business_type_id }, orderBy: { sort_order: "asc" }, select: { id: true } });
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

export async function setHidden(level: "group" | "businessType", id: string, hidden: boolean) {
  if (level === "group") await prisma.commodityGroup.update({ where: { id }, data: { hidden } });
  else await prisma.businessType.update({ where: { id }, data: { hidden } });
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
