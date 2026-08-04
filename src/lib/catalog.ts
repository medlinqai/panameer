import { prisma } from "@/lib/prisma";

/** Role types (global lookup) — the "one main category" a provider picks. */
export async function getRoleTypes() {
  return prisma.roleType.findMany({
    orderBy: { display: "asc" },
    select: { id: true, code: true, name: true, display: true },
  });
}

/**
 * The provider field picker (brief_R / E013) — the start of the service
 * catalog, driven by the AUTHORITATIVE Service Catalog.
 *
 * The catalog is three levels — **Role → Domain → Skill** — and a Skill belongs
 * to a (Role, Domain) PAIR, so the picker returns the tree rather than a flat
 * list. The same domain name appears under more than one role (Finance &
 * Accounting is both Application-Specific and Operations-Specific) with
 * completely different skills, which is exactly why the pair, not the domain
 * alone, is what a provider chooses.
 *
 * Ordering is `sort_order` then name, keeping the ERP-heavy areas prominent:
 * Application-Specific first, Finance & Accounting first within it.
 *
 * A (role, domain) pair with no skills would dead-end the next step, so only
 * pairs that actually have skills are returned.
 */
export async function getProviderFieldTree() {
  const roles = await prisma.roleType.findMany({
    orderBy: [{ sort_order: "asc" }, { name: "asc" }],
    select: { id: true, code: true, name: true, display: true },
  });

  // One grouped count instead of a query per role.
  const grouped = await prisma.skill.groupBy({
    by: ["role_type_id", "pillar_id"],
    _count: { _all: true },
  });

  const pillars = await prisma.pillar.findMany({
    orderBy: [{ sort_order: "asc" }, { name: "asc" }],
    select: { id: true, code: true, name: true },
  });
  const pillarById = new Map(pillars.map((p) => [p.id, p]));
  // Pillar order drives the domain order inside each role.
  const pillarRank = new Map(pillars.map((p, i) => [p.id, i]));

  return roles
    .map((role) => ({
      id: role.id,
      code: role.code,
      name: role.name,
      display: role.display,
      domains: grouped
        .filter(
          (g) =>
            g.role_type_id === role.id &&
            g.pillar_id !== null &&
            g._count._all > 0
        )
        .map((g) => {
          const pillar = pillarById.get(g.pillar_id!)!;
          return {
            id: pillar.id,
            code: pillar.code,
            name: pillar.name,
            skillCount: g._count._all,
          };
        })
        .sort((a, b) => (pillarRank.get(a.id) ?? 0) - (pillarRank.get(b.id) ?? 0)),
    }))
    .filter((r) => r.domains.length > 0);
}

/**
 * Skills within one FIELD (E014) — the (Role, Domain) pair chosen at the
 * previous step. Both keys are required: filtering on the domain alone would
 * mix Application-Specific "Payables" with Operations-Specific "Payables
 * Specialist" under the same Finance & Accounting heading.
 */
export async function getSkillsForField(roleTypeId: string, pillarId: string) {
  return prisma.skill.findMany({
    where: { role_type_id: roleTypeId, pillar_id: pillarId },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      image_url: true,
      roleType: { select: { id: true, code: true, display: true } },
    },
  });
}

/** Skills across a whole domain, regardless of role. Kept for Settings, which
 *  predates the pair model and scopes by RoleType. */
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

/**
 * The Specialization vocabulary (brief_R) — a cross-cutting axis, grouped for
 * the picker into products, methodologies and industries.
 */
export async function getSpecializations() {
  const rows = await prisma.specialization.findMany({
    orderBy: [{ sort_order: "asc" }, { name: "asc" }],
    select: { id: true, name: true, kind: true },
  });

  const groups: { kind: string; label: string; items: typeof rows }[] = [
    { kind: "PRODUCT", label: "Products & Platforms", items: [] },
    { kind: "METHODOLOGY", label: "Processes & Methodologies", items: [] },
    { kind: "INDUSTRY", label: "Industries", items: [] },
  ];
  for (const r of rows) {
    groups.find((g) => g.kind === r.kind)?.items.push(r);
  }
  return groups.filter((g) => g.items.length > 0);
}

/**
 * The tools / applications vocabulary for the project modal
 * (brief_project_model_v2).
 *
 * Flat and deduped BY NAME, unlike `getProviderFieldTree`: the same application
 * name legitimately appears under several offerings in the ERP hierarchy, and a
 * provider tagging "which tools did you use" is answering about the tool, not
 * about where it sits in the taxonomy. Baseline rows sort first; provider-added
 * customs follow, flagged so the admin catalog editor can promote recurring
 * ones to baseline later.
 */
export async function getApplications() {
  const rows = await prisma.application.findMany({
    orderBy: [{ is_custom: "asc" }, { name: "asc" }],
    select: { id: true, name: true, app_group: true, is_custom: true },
  });

  const seen = new Set<string>();
  const items: { id: string; name: string; appGroup: string | null; isCustom: boolean }[] = [];
  for (const r of rows) {
    const key = r.name.trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    items.push({
      id: r.id,
      name: r.name,
      appGroup: r.app_group,
      isCustom: r.is_custom,
    });
  }
  return items;
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
/**
 * Skills across SEVERAL roles — the union a multi-role provider picks from
 * (brief_onboarding_slimdown WS3).
 *
 * Domain left the UI, so this is deliberately not scoped to one: a provider who
 * claims Application-Specific sees every skill under all of that role's
 * domains, searchable. The DOMAIN IS STILL CARRIED on each row — a skill's
 * identity is its (role, domain) pair, and the picker uses it to group and to
 * disambiguate the same label appearing under two domains.
 */
export async function getSkillsForRoleTypes(roleTypeIds: string[]) {
  if (roleTypeIds.length === 0) return [];
  return prisma.skill.findMany({
    where: { role_type_id: { in: roleTypeIds } },
    orderBy: [{ name: "asc" }],
    select: {
      id: true,
      name: true,
      image_url: true,
      role_type_id: true,
      pillar: { select: { id: true, code: true, name: true } },
      roleType: { select: { id: true, name: true, display: true } },
    },
  });
}

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
