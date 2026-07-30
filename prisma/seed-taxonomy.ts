import type { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

/**
 * Seeds the provider taxonomy from the AUTHORITATIVE Service Catalog
 * (`prisma/seed-data/service-catalog.json`, generated from Scott's
 * "Service Catalog.xlsx") — brief_R.
 *
 * Shape is three levels: **Role → Domain → Skill**, plus a cross-cutting
 * **Specializations** vocabulary. Mapped onto the existing models as:
 *
 *   Role   → `RoleType`        (4: Application- / Project- / Technology- /
 *                               Operations-Specific)
 *   Domain → `Pillar`          (8 distinct names, shared across roles)
 *   Skill  → `Skill(role_type_id, pillar_id)` — a skill belongs to the PAIR
 *
 * Everything here is REFERENCE data — global, not PAccount-scoped. Fully
 * idempotent: every write is an upsert keyed on a natural unique, and the
 * retirement pass below is safe to re-run.
 *
 * SUPERSEDES the brief_B/brief_P ERP taxonomy that was seeded from
 * `erp-catalog.json`. That file is left in place as history; nothing reads it.
 */

type CatalogJson = {
  _source?: string;
  _note?: string;
  roles: { name: string; domains: { name: string; skills: string[] }[] }[];
  specializations: string[];
};

export type TaxonomyCounts = {
  roles: number;
  domains: number;
  skills: number;
  specializations: number;
  regions: number;
  engagementTypes: number;
  applications: number;
  /** Non-role entries filtered out of the source catalog (E072). */
  excludedRoleTypes: number;
  retiredSkills: number;
  retiredPillars: number;
  retiredRoleTypes: number;
  orphanedProviderSkills: number;
};

/** The single catalog row everything hangs off. */
const CATALOG = {
  code: "PANAMEER_V1",
  name: "Panameer Service Catalog V1",
  description:
    "Authoritative provider taxonomy: Role → Domain → Skill, plus Specializations.",
};

/**
 * Typos in the source xlsx (brief_R). Scott is fixing the spreadsheet; until a
 * regenerated JSON lands, correct them here so the app never shows them.
 * Keyed on the exact source string.
 */
const TYPO_FIXES: Record<string, string> = {
  "Acounting Hub": "Accounting Hub",
  "Planning & Budgetting": "Planning & Budgeting",
  "Enterprise Business Suite ()EBS)": "Enterprise Business Suite (EBS)",
};

const fixTypo = (s: string) => TYPO_FIXES[s] ?? s;

/**
 * RoleTypes present in the source catalog that are NOT roles (PJv2 WS10 / E072).
 *
 * A RoleType answers "what does this person DO on an engagement" — Functional,
 * Technical, Techno-Functional, Operational. **"Project-Specific" is a property
 * of the PROJECT**, not of the person, and offering it in the Role picker asked
 * providers to classify themselves along the wrong axis.
 *
 * Its one domain ("Project Execution") is worse than merely misplaced: its eight
 * "skills" are JOB TITLES — Project Manager, Technical Architect, Technical
 * Lead, Business Architect, Testing Specialist… That is a third axis again
 * (seniority/title), which the profile already carries as `Employer.role_title`.
 *
 * Filtered HERE rather than edited out of `service-catalog.json`, because that
 * file is generated from Scott's spreadsheet — a hand edit would be silently
 * reverted the next time it is regenerated. The seed's existing retirement pass
 * removes the DB row and its skills, and reports any provider tag left orphaned.
 *
 * AUDIT (E072): the three survivors — Application-Specific, Technology-Specific,
 * Operations-Specific — all answer the "what do you do" question and stay. No
 * other non-role leaks found.
 */
const NON_ROLE_TYPES = new Set(["Project-Specific"]);

/** Stable code from a display name: "Finance & Accounting" → FINANCE_ACCOUNTING. */
function toCode(name: string): string {
  return name
    .toUpperCase()
    .replace(/&/g, " ")
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/**
 * Display order for the Role → Domain picker (E013: keep the ERP-heavy areas
 * prominent). Anything unlisted falls to the default and sorts by name.
 */
const ROLE_SORT: Record<string, number> = {
  "Application-Specific": 10,
  "Technology-Specific": 20,
  "Project-Specific": 30,
  "Operations-Specific": 40,
};

const DOMAIN_SORT: Record<string, number> = {
  "Finance & Accounting": 10, // the ERP core — first, always
  "Supply Chain Management": 20,
  "Human Resources & Training": 30,
  "Enterprise Performance Mgt": 40,
  "Customer Relationship Management": 50,
  "Development & IT": 60,
  "Project Execution": 70,
  "Project Portfolio Management": 80,
};

/**
 * Specialization grouping. The xlsx is a flat list; these buckets drive the
 * picker's section headings. Anything unlisted defaults to PRODUCT.
 */
const METHODOLOGIES = new Set([
  "Procure-to-Pay",
  "Record-to-Report",
  "Order-to-Cash",
  "Hire-to-Fire",
  "Source-to-Pay",
]);
const INDUSTRIES = new Set([
  "Federal Government",
  "State & Local Government",
  "Healthcare",
  "Financial Services",
  "Energy Services",
  "Education Services",
  "Retail",
  "Information Technology Services",
]);

function specializationKind(name: string): "PRODUCT" | "METHODOLOGY" | "INDUSTRY" {
  if (METHODOLOGIES.has(name)) return "METHODOLOGY";
  if (INDUSTRIES.has(name)) return "INDUSTRY";
  return "PRODUCT";
}

export async function seedTaxonomy(
  prisma: PrismaClient
): Promise<TaxonomyCounts> {
  const file = path.resolve(__dirname, "seed-data", "service-catalog.json");
  const raw = JSON.parse(fs.readFileSync(file, "utf8")) as CatalogJson;
  // E072 — drop non-role "roles" before anything downstream sees them, so the
  // picker, the skills tree and the retirement pass all agree.
  const data: CatalogJson = {
    ...raw,
    roles: raw.roles.filter((r) => !NON_ROLE_TYPES.has(fixTypo(r.name.trim()))),
  };
  const excludedRoleTypes = raw.roles.length - data.roles.length;

  // --- Catalog -------------------------------------------------------------
  const catalog = await prisma.serviceCatalog.upsert({
    where: { code: CATALOG.code },
    update: { name: CATALOG.name, description: CATALOG.description },
    create: CATALOG,
  });

  // --- Roles (RoleType) ----------------------------------------------------
  const roleIdByName = new Map<string, string>();
  for (const role of data.roles) {
    const code = toCode(role.name);
    const row = await prisma.roleType.upsert({
      where: { code },
      update: {
        name: role.name,
        display: role.name.replace(/-Specific$/, ""),
        sort_order: ROLE_SORT[role.name] ?? 100,
      },
      create: {
        code,
        name: role.name,
        display: role.name.replace(/-Specific$/, ""),
        sort_order: ROLE_SORT[role.name] ?? 100,
      },
    });
    roleIdByName.set(role.name, row.id);
  }

  // --- Domains (Pillar) — distinct names, shared across roles ---------------
  const domainNames = [
    ...new Set(data.roles.flatMap((r) => r.domains.map((d) => d.name))),
  ];
  const domainIdByName = new Map<string, string>();
  for (const name of domainNames) {
    const code = toCode(name);
    const row = await prisma.pillar.upsert({
      where: { catalog_id_code: { catalog_id: catalog.id, code } },
      update: { name, sort_order: DOMAIN_SORT[name] ?? 100 },
      create: {
        catalog_id: catalog.id,
        code,
        name,
        sort_order: DOMAIN_SORT[name] ?? 100,
      },
    });
    domainIdByName.set(name, row.id);
  }

  // --- Skills, keyed on the (Role, Domain, name) triple ---------------------
  // "Project Manager" exists under two different (role, domain) pairs, so the
  // name alone is NOT a key — see the note on Skill's @@unique in schema.prisma.
  const keptSkillIds = new Set<string>();
  let skillCount = 0;

  for (const role of data.roles) {
    const roleTypeId = roleIdByName.get(role.name)!;
    for (const domain of role.domains) {
      const pillarId = domainIdByName.get(domain.name)!;
      for (const rawName of domain.skills) {
        const name = fixTypo(rawName);
        const row = await prisma.skill.upsert({
          where: {
            catalog_id_role_type_id_pillar_id_name: {
              catalog_id: catalog.id,
              role_type_id: roleTypeId,
              pillar_id: pillarId,
              name,
            },
          },
          update: {},
          create: {
            catalog_id: catalog.id,
            role_type_id: roleTypeId,
            pillar_id: pillarId,
            name,
          },
        });
        keptSkillIds.add(row.id);
        skillCount++;
      }
    }
  }

  // --- Specializations ------------------------------------------------------
  for (const [i, raw] of data.specializations.entries()) {
    const name = fixTypo(raw);
    await prisma.specialization.upsert({
      where: { catalog_id_name: { catalog_id: catalog.id, name } },
      update: { kind: specializationKind(name), sort_order: i },
      create: {
        catalog_id: catalog.id,
        name,
        kind: specializationKind(name),
        sort_order: i,
      },
    });
  }

  // --- Retire everything NOT in the authoritative catalog -------------------
  // brief_R says steps 7–8 must render EXACTLY this catalog, so stale rows from
  // the previous ERP seed (and the provisional brief_Q "AI" pillar, and the 5th
  // "Techno-Functional" role that is absent from Scott's xlsx) have to go.
  //
  // Provider selections pointing at a retired skill are removed FIRST: the FK
  // cascades anyway, but doing it explicitly means the count is reportable
  // rather than silent — a provider losing a skill should be visible.
  const staleSkills = await prisma.skill.findMany({
    where: {
      id: { notIn: [...keptSkillIds] },
      // Provider-authored skills (brief_S / E031) are NOT stale — they were
      // never in the JSON and re-seeding must not delete a provider's data.
      is_custom: false,
    },
    select: { id: true },
  });
  const staleSkillIds = staleSkills.map((s) => s.id);

  let orphanedProviderSkills = 0;
  if (staleSkillIds.length > 0) {
    orphanedProviderSkills = (
      await prisma.providerSkill.deleteMany({
        where: { skill_id: { in: staleSkillIds } },
      })
    ).count;
    await prisma.workRequestSkill.deleteMany({
      where: { skill_id: { in: staleSkillIds } },
    });
  }
  const retiredSkills = (
    await prisma.skill.deleteMany({ where: { id: { in: staleSkillIds } } })
  ).count;

  // SkillTags belonged to the old ERP seed only; nothing reads them now.
  await prisma.skillTag.deleteMany({});

  const keptPillarIds = [...domainIdByName.values()];
  // Offerings/Applications hang off pillars and cascade with them.
  const retiredPillars = (
    await prisma.pillar.deleteMany({ where: { id: { notIn: keptPillarIds } } })
  ).count;

  const keptRoleTypeIds = [...roleIdByName.values()];
  // A RoleType referenced by a WorkRequest can't be deleted; detach nothing and
  // let the delete skip those. Only unreferenced strays disappear.
  const strayRoleTypes = await prisma.roleType.findMany({
    where: {
      id: { notIn: keptRoleTypeIds },
      skills: { none: {} },
      workRequests: { none: {} },
      providerProfiles: { none: {} },
    },
    select: { id: true, name: true },
  });
  const retiredRoleTypes = strayRoleTypes.length
    ? (
        await prisma.roleType.deleteMany({
          where: { id: { in: strayRoleTypes.map((r) => r.id) } },
        })
      ).count
    : 0;

  // --- Regions + engagement types (NOT part of the provider taxonomy) -------
  // These are separate reference lookups still consumed by Settings and the
  // Work Request wizard, so brief_R's catalog replacement must not take them
  // out with it. Sourced from the older ERP file, which remains their home.
  const legacy = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, "seed-data", "erp-catalog.json"), "utf8")
  ) as {
    regions: { name: string; desc?: string }[];
    engagementTypes: { code: string; name: string; detail?: string }[];
    applicationHierarchy: { application: string; appGroup?: string }[];
    nonOracleApplications: string[];
  };

  for (const r of legacy.regions) {
    await prisma.region.upsert({
      where: { name: r.name },
      update: { description: r.desc ?? null },
      create: { name: r.name, description: r.desc ?? null },
    });
  }
  /**
   * Tools / applications vocabulary (brief_project_model_v2).
   *
   * These rows already existed in the ERP source file but were never loaded,
   * so `applications` was empty and the project modal's tools multi-select had
   * nothing to offer. Seeded OFFERING-LESS on purpose: they are a flat picker
   * vocabulary, and hanging them off a pillar would put them into the
   * Role → Domain → Skill tree, which is a different axis.
   *
   * NOT an expansion of the taxonomy — every name here comes from the
   * committed catalog file.
   */
  const appNames = new Map<string, string | null>();
  for (const row of legacy.applicationHierarchy ?? []) {
    const name = fixTypo((row.application ?? "").trim());
    if (name) appNames.set(name.toLowerCase(), row.appGroup?.trim() || null);
  }
  for (const name of legacy.nonOracleApplications ?? []) {
    const n = fixTypo((name ?? "").trim());
    if (n && !appNames.has(n.toLowerCase())) appNames.set(n.toLowerCase(), null);
  }
  let applicationCount = 0;
  for (const [key, appGroup] of appNames) {
    const display = fixTypo(
      (legacy.applicationHierarchy ?? []).find(
        (r) => r.application?.trim().toLowerCase() === key
      )?.application?.trim() ??
        (legacy.nonOracleApplications ?? []).find(
          (n) => n.trim().toLowerCase() === key
        )?.trim() ??
        key
    );
    const existing = await prisma.application.findFirst({
      where: { name: { equals: display, mode: "insensitive" } },
      select: { id: true },
    });
    if (existing) {
      await prisma.application.update({
        where: { id: existing.id },
        data: { app_group: appGroup },
      });
    } else {
      await prisma.application.create({
        data: { name: display, app_group: appGroup, is_custom: false },
      });
    }
    applicationCount++;
  }

  for (const e of legacy.engagementTypes) {
    await prisma.engagementType.upsert({
      where: { code: e.code },
      update: { name: e.name, detail: e.detail ?? null },
      create: { code: e.code, name: e.name, detail: e.detail ?? null },
    });
  }

  return {
    roles: roleIdByName.size,
    domains: domainIdByName.size,
    skills: skillCount,
    specializations: data.specializations.length,
    regions: legacy.regions.length,
    engagementTypes: legacy.engagementTypes.length,
    applications: applicationCount,
    excludedRoleTypes,
    retiredSkills,
    retiredPillars,
    retiredRoleTypes,
    orphanedProviderSkills,
  };
}
