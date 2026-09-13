import { prisma } from "@/lib/prisma";

/**
 * Role types (global lookup) — the "one main category" a provider picks.
 *
 * ORDERED BY `sort_order`, NOT ALPHABETICALLY. This ordered by `display` until
 * E229 gave every role the "X-Specific Roles" label, at which point alphabetical
 * put "AI-Specialist Roles" first here while `getProviderFieldTree` — which has
 * always used sort_order — put it last. Two role pickers, two different orders,
 * one catalog. Both read the seeded order now: Application-Specific first (E013,
 * ERP leads), AI-Specialist last.
 */
export async function getRoleTypes() {
  return prisma.roleType.findMany({
    orderBy: [{ sort_order: "asc" }, { name: "asc" }],
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
    /*
      ── ⚠ BASELINE FIRST, PROVIDER-TYPED ROWS AFTER (`P1-A1.5-E470b`) ────────

      ⚠ SUPERSEDED, quoted not deleted: `orderBy: [{ sort_order: "asc" }, { name: "asc" }]`.
      ⚠ `getApplications()` BELOW ALREADY DOES EXACTLY THIS — `[{ is_custom:
      "asc" }, { name: "asc" }]` — so this is the file's own pattern applied to
      the one function that did not use it, not a new idea.
    */
    orderBy: [{ is_custom: "asc" }, { sort_order: "asc" }, { name: "asc" }],
    /*
      ⚠⚠ `is_custom` WAS MISSING FROM THIS SELECT, so the page could not render
      it even if it wanted to. The schema's own contract for the flag is
      *"FLAGGED FOR ADMIN REVIEW so recurring entries can be promoted to
      baseline later"* — and the review it exists for could not happen, because
      nothing surfaced it.
    */
    select: { id: true, name: true, kind: true, is_custom: true },
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


/* ═══════════════════════════════════════════════════════════════════════════
   ⚠⚠ COUNTING PEOPLE — THE RULE BOTH CATALOG PAGES OBEY (`P1-A1.5-E465b`/`E470c`)
   ═══════════════════════════════════════════════════════════════════════════

   ⚠⚠ COUNT DISTINCT PROVIDERS, NEVER JOIN ROWS. A provider holding twelve
   Oracle Fusion skills is ONE person in Application-Specific. Counting rows
   instead of people inflates every number on both pages, and it is the easiest
   mistake here to make.

   ⚠ A PROVIDER WHO SPANS TWO CATEGORIES COUNTS IN BOTH. These are NOT a
   partition and they do NOT sum to the provider total — every caller captions
   that so nobody "fixes" it later.
   ⚠⚠ THIS IS THE SAME TRAP AS `E444`, where a dual-role person was silently
   resolved to whichever test fired first. Do not first-match. Count both.

   ⚠ ONE QUERY PER STRIP, NEVER ONE PER ROW. Each function below issues exactly
   ONE `findMany` and does the grouping in memory — the link tables are small
   (hundreds of rows) and a per-row query would turn a 3-query page into a
   30-query one.
   ⚠ ZERO RENDERS `—`, NEVER `0`, at the call site: a category nobody has
   claimed is honest, not broken — and it is the most actionable row on the page.
*/

export type ClaimCount = {
  key: string;
  label: string;
  /** DISTINCT providers, not links. */
  providers: number;
  /** The most-claimed child, for the leader line. Null when nobody claimed any. */
  top: { name: string; providers: number } | null;
};

/** Distinct providers per ROLE, with the most-claimed DOMAIN inside it. */
export async function getRoleClaims(): Promise<ClaimCount[]> {
  const [roles, links] = await Promise.all([
    prisma.roleType.findMany({
      orderBy: { sort_order: "asc" },
      select: { id: true, name: true, display: true },
    }),
    /* ⚠ ONE QUERY. Every provider-skill link with the two ids that place it. */
    prisma.providerSkill.findMany({
      select: {
        provider_profile_id: true,
        skill: { select: { role_type_id: true, pillar: { select: { name: true } } } },
      },
    }),
  ]);

  return roles.map((r) => {
    const mine = links.filter((l) => l.skill?.role_type_id === r.id);
    /* ⚠ DISTINCT PEOPLE — a Set, not `mine.length`. */
    const providers = new Set(mine.map((l) => l.provider_profile_id)).size;

    const byDomain = new Map<string, Set<string>>();
    for (const l of mine) {
      const name = l.skill?.pillar?.name;
      if (!name) continue;
      if (!byDomain.has(name)) byDomain.set(name, new Set());
      byDomain.get(name)!.add(l.provider_profile_id);
    }
    /* ⚠ TIES BREAK ON NAME so a leader line does not flicker between equals. */
    const top =
      [...byDomain.entries()]
        .map(([name, set]) => ({ name, providers: set.size }))
        .sort((a, b) => b.providers - a.providers || a.name.localeCompare(b.name))[0] ?? null;

    return { key: r.id, label: r.display || r.name, providers, top };
  });
}

/** Distinct providers per specialization KIND, with the most-claimed row in it. */
export async function getSpecializationClaims(): Promise<ClaimCount[]> {
  /* ⚠ ONE QUERY. */
  const links = await prisma.providerProfileSpecialization.findMany({
    select: {
      provider_profile_id: true,
      specialization: { select: { name: true, kind: true } },
    },
  });

  const KINDS: { kind: string; label: string }[] = [
    { kind: "PRODUCT", label: "Products & Platforms" },
    { kind: "METHODOLOGY", label: "Processes & Methodologies" },
    { kind: "INDUSTRY", label: "Industries" },
  ];

  return KINDS.map(({ kind, label }) => {
    const mine = links.filter((l) => l.specialization?.kind === kind);
    const providers = new Set(mine.map((l) => l.provider_profile_id)).size;
    const byItem = new Map<string, Set<string>>();
    for (const l of mine) {
      const name = l.specialization?.name;
      if (!name) continue;
      if (!byItem.has(name)) byItem.set(name, new Set());
      byItem.get(name)!.add(l.provider_profile_id);
    }
    const top =
      [...byItem.entries()]
        .map(([name, set]) => ({ name, providers: set.size }))
        .sort((a, b) => b.providers - a.providers || a.name.localeCompare(b.name))[0] ?? null;
    return { key: kind, label, providers, top };
  });
}

/**
 * Distinct providers per SPECIALIZATION row — the `N providers` column.
 * ⚠ ONE QUERY for the whole grid, keyed by specialization id.
 */
export async function getSpecializationProviderCounts(): Promise<Map<string, number>> {
  const links = await prisma.providerProfileSpecialization.findMany({
    select: { provider_profile_id: true, specialization_id: true },
  });
  const by = new Map<string, Set<string>>();
  for (const l of links) {
    if (!by.has(l.specialization_id)) by.set(l.specialization_id, new Set());
    by.get(l.specialization_id)!.add(l.provider_profile_id);
  }
  return new Map([...by].map(([k, v]) => [k, v.size]));
}

/**
 * Distinct providers per ROLE-DOMAIN PAIR — the ranked drill-in behind a
 * `Most claimed` role tile. Keyed `${role_type_id}::${pillar_id}`.
 *
 * ⚠ THE KEY IS THE PAIR, NOT THE PILLAR (`E462`). Five vendor suites sit under
 * two roles each, and Oracle Fusion Cloud's functional providers are not its
 * technical ones — keying on `pillar_id` alone would merge two genuinely
 * different branches and inflate both.
 * ⚠ ONE QUERY. The caller supplies the full domain list, so pairs nobody has
 * claimed are absent here and render as zero rows at the bottom of the ranking.
 */
export async function getRoleDomainProviderCounts(): Promise<Map<string, number>> {
  const links = await prisma.providerSkill.findMany({
    select: {
      provider_profile_id: true,
      skill: { select: { role_type_id: true, pillar_id: true } },
    },
  });
  const by = new Map<string, Set<string>>();
  for (const l of links) {
    if (!l.skill?.role_type_id || !l.skill?.pillar_id) continue;
    const key = `${l.skill.role_type_id}::${l.skill.pillar_id}`;
    if (!by.has(key)) by.set(key, new Set());
    by.get(key)!.add(l.provider_profile_id);
  }
  return new Map([...by].map(([k, v]) => [k, v.size]));
}

/**
 * Distinct providers per SKILL — the `N providers` column on RDS.
 * ⚠ ONE QUERY for the whole tree.
 */
export async function getSkillProviderCounts(): Promise<Map<string, number>> {
  const links = await prisma.providerSkill.findMany({
    select: { provider_profile_id: true, skill_id: true },
  });
  const by = new Map<string, Set<string>>();
  for (const l of links) {
    if (!by.has(l.skill_id)) by.set(l.skill_id, new Set());
    by.get(l.skill_id)!.add(l.provider_profile_id);
  }
  return new Map([...by].map(([k, v]) => [k, v.size]));
}
