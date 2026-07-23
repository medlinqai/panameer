import { prisma } from "@/lib/prisma";

/** Role types (global lookup) — the "one main category" a provider picks. */
export async function getRoleTypes() {
  return prisma.roleType.findMany({
    orderBy: { display: "asc" },
    select: { id: true, code: true, name: true, display: true },
  });
}

/** World regions (global lookup). */
export async function getRegions() {
  return prisma.region.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, description: true },
  });
}

/**
 * Skills within a single RoleType — the choices shown after the provider picks
 * their one main category. Includes the pillar name + image where seeded.
 */
export async function getSkillsForRoleType(roleTypeId: string) {
  return prisma.skill.findMany({
    where: { role_type_id: roleTypeId },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      image_url: true,
      pillar: { select: { code: true, name: true } },
    },
  });
}

/**
 * The catalog taxonomy as a nested tree, plus the flat lookups a browse/match
 * screen needs alongside it. Reference data — global, NOT PAccount-scoped — so
 * this takes no viewer. Sets the shape for future browse/match endpoints.
 *
 * Returns null if the catalog code isn't seeded.
 */
export async function getCatalogTree(code: string) {
  const catalog = await prisma.serviceCatalog.findUnique({
    where: { code },
    include: {
      pillars: {
        orderBy: { code: "asc" },
        include: {
          offerings: {
            orderBy: { name: "asc" },
            include: {
              applications: {
                orderBy: { name: "asc" },
                select: { id: true, name: true, app_group: true },
              },
            },
          },
        },
      },
    },
  });

  if (!catalog) return null;

  // Flat lookups are global; role types are shared across catalogs.
  const [roleTypes, regions, engagementTypes] = await Promise.all([
    prisma.roleType.findMany({
      orderBy: { code: "asc" },
      select: { id: true, code: true, name: true, display: true },
    }),
    prisma.region.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, description: true },
    }),
    prisma.engagementType.findMany({
      orderBy: { code: "asc" },
      select: { id: true, code: true, name: true, detail: true },
    }),
  ]);

  return {
    catalog: {
      id: catalog.id,
      code: catalog.code,
      name: catalog.name,
      description: catalog.description,
    },
    pillars: catalog.pillars.map((p) => ({
      id: p.id,
      code: p.code,
      name: p.name,
      offerings: p.offerings.map((o) => ({
        id: o.id,
        name: o.name,
        applications: o.applications.map((a) => ({
          id: a.id,
          name: a.name,
          appGroup: a.app_group,
        })),
      })),
    })),
    roleTypes,
    regions,
    engagementTypes,
  };
}
