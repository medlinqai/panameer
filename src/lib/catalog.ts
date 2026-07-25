import { prisma } from "@/lib/prisma";

/** Role types (global lookup) — the "one main category" a provider picks. */
export async function getRoleTypes() {
  return prisma.roleType.findMany({
    orderBy: { display: "asc" },
    select: { id: true, code: true, name: true, display: true },
  });
}

/**
 * The provider category / field picker (brief_P / E013) — the start of the
 * service catalog.
 *
 * Driven by the SEEDED ERP taxonomy, not generic marketplace categories.
 * Ordering is `sort_order` then name, which pins Enterprise Resource Planning
 * at the top (it's the day-1 core delivery) with AI directly beneath it.
 *
 * "Not Applicable" is a data-cleaning bucket rather than a real field, and a
 * pillar with no skills would dead-end the next step, so both are filtered out.
 */
export async function getProviderFields() {
  const pillars = await prisma.pillar.findMany({
    where: { code: { not: "NA" } },
    orderBy: [{ sort_order: "asc" }, { name: "asc" }],
    select: {
      id: true,
      code: true,
      name: true,
      sort_order: true,
      _count: { select: { skills: true } },
    },
  });

  return pillars
    .filter((p) => p._count.skills > 0)
    .map((p) => ({
      id: p.id,
      code: p.code,
      name: p.name,
      skillCount: p._count.skills,
    }));
}

/**
 * Skills within one field (E014) — conditional on the pillar chosen at the
 * previous step, which is the whole point of that step ordering.
 */
export async function getSkillsForPillar(pillarId: string) {
  return prisma.skill.findMany({
    where: { pillar_id: pillarId },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      image_url: true,
      roleType: { select: { id: true, code: true, display: true } },
    },
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
