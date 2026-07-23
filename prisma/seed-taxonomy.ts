import type { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

/**
 * Seeds the ERP service-catalog taxonomy from prisma/seed-data/erp-catalog.json
 * (parsed from Scott's real Work Data File). Everything here is REFERENCE data —
 * global, not PAccount-scoped. Fully idempotent: every write is an upsert keyed
 * on a natural unique, so re-running changes nothing.
 */

type CatalogJson = {
  catalog: { code: string; name: string; description?: string };
  roleTypes: { code: string; name: string; display: string }[];
  pillars: { code: string; name: string }[];
  applicationHierarchy: {
    pillar: string;
    offering: string;
    application: string;
    appGroup: string;
  }[];
  skillsByRoleType: Record<string, string[]>;
  nonOracleApplications: string[];
  regions: { name: string; desc?: string }[];
  engagementTypes: { code: string; name: string; detail?: string }[];
  freelancerMapping: {
    action: string;
    jobReqSkill: string;
    roleType: string;
    pillar: string | null;
    panameerSkill: string | null;
    sellingAgent: string | null;
  }[];
};

export type TaxonomyCounts = {
  catalog: number;
  roleTypes: number;
  pillars: number;
  offerings: number;
  applications: number;
  skills: number;
  tags: number;
  regions: number;
  engagementTypes: number;
  nonOracleApplications: number;
};

export async function seedTaxonomy(
  prisma: PrismaClient
): Promise<TaxonomyCounts> {
  const file = path.resolve(__dirname, "seed-data", "erp-catalog.json");
  const data = JSON.parse(fs.readFileSync(file, "utf8")) as CatalogJson;

  // --- Catalog -----------------------------------------------------------
  const catalog = await prisma.serviceCatalog.upsert({
    where: { code: data.catalog.code },
    update: { name: data.catalog.name, description: data.catalog.description },
    create: {
      code: data.catalog.code,
      name: data.catalog.name,
      description: data.catalog.description,
    },
  });

  // --- Role types (global) -----------------------------------------------
  // Looked up two ways: by code (skillsByRoleType keys) and by name-or-display
  // (the freelancerMapping uses a mix, e.g. "Project-Specific" and "Operational").
  const roleTypeByCode = new Map<string, string>();
  const roleTypeByLabel = new Map<string, string>();
  for (const rt of data.roleTypes) {
    const row = await prisma.roleType.upsert({
      where: { code: rt.code },
      update: { name: rt.name, display: rt.display },
      create: { code: rt.code, name: rt.name, display: rt.display },
    });
    roleTypeByCode.set(rt.code, row.id);
    roleTypeByLabel.set(rt.name.toLowerCase(), row.id);
    roleTypeByLabel.set(rt.display.toLowerCase(), row.id);
  }
  const resolveRoleType = (label: string | null | undefined): string | null =>
    label ? roleTypeByLabel.get(label.toLowerCase()) ?? null : null;

  // --- Pillars -----------------------------------------------------------
  const pillarByCode = new Map<string, string>();
  for (const p of data.pillars) {
    const row = await prisma.pillar.upsert({
      where: { catalog_id_code: { catalog_id: catalog.id, code: p.code } },
      update: { name: p.name },
      create: { catalog_id: catalog.id, code: p.code, name: p.name },
    });
    pillarByCode.set(p.code, row.id);
  }

  // --- Offerings + Applications (the pillar → offering → application tree) --
  // applicationId keyed by name only ("first application wins" when a name like
  // "Projects" appears under two offerings — matches the name-normalized Skill).
  const offeringKey = (pillarCode: string, name: string) =>
    `${pillarCode}::${name}`;
  const offeringByKey = new Map<string, string>();
  const applicationIdByName = new Map<string, string>();

  for (const row of data.applicationHierarchy) {
    const pillarId = pillarByCode.get(row.pillar);
    if (!pillarId) continue; // pillar not in the pillar list — skip defensively

    const oKey = offeringKey(row.pillar, row.offering);
    let offeringId = offeringByKey.get(oKey);
    if (!offeringId) {
      const offering = await prisma.offering.upsert({
        where: { pillar_id_name: { pillar_id: pillarId, name: row.offering } },
        update: {},
        create: { pillar_id: pillarId, name: row.offering },
      });
      offeringId = offering.id;
      offeringByKey.set(oKey, offeringId);
    }

    const application = await prisma.application.upsert({
      where: {
        offering_id_name: { offering_id: offeringId, name: row.application },
      },
      update: { app_group: row.appGroup },
      create: {
        offering_id: offeringId,
        name: row.application,
        app_group: row.appGroup,
      },
    });
    if (!applicationIdByName.has(row.application)) {
      applicationIdByName.set(row.application, application.id);
    }
  }

  // --- Skills (normalized; merged from three sources, deduped by name) ------
  // Precedence: functional (applicationHierarchy) first — it carries pillar +
  // application and its APPLICATION role type wins. Then the per-role-type
  // lists, then freelancerMapping.panameerSkill fills any remaining names.
  type SkillSpec = {
    name: string;
    roleTypeId: string;
    pillarId: string | null;
    applicationId: string | null;
  };
  const skillByName = new Map<string, SkillSpec>();

  const appRoleTypeId = roleTypeByCode.get("APPLICATION")!;
  for (const row of data.applicationHierarchy) {
    if (skillByName.has(row.application)) continue;
    skillByName.set(row.application, {
      name: row.application,
      roleTypeId: appRoleTypeId,
      pillarId: pillarByCode.get(row.pillar) ?? null,
      applicationId: applicationIdByName.get(row.application) ?? null,
    });
  }

  for (const [code, names] of Object.entries(data.skillsByRoleType)) {
    const roleTypeId = roleTypeByCode.get(code);
    if (!roleTypeId) continue;
    for (const name of names) {
      if (skillByName.has(name)) continue;
      skillByName.set(name, {
        name,
        roleTypeId,
        pillarId: null,
        applicationId: null,
      });
    }
  }

  for (const m of data.freelancerMapping) {
    const name = m.panameerSkill;
    if (!name) continue;
    const roleTypeId = resolveRoleType(m.roleType);
    if (skillByName.has(name)) {
      // Already sourced; only backfill a missing pillar.
      const spec = skillByName.get(name)!;
      if (!spec.pillarId && m.pillar) {
        spec.pillarId = pillarByCode.get(m.pillar) ?? null;
      }
      continue;
    }
    if (!roleTypeId) continue; // no resolvable role type — can't create a Skill
    skillByName.set(name, {
      name,
      roleTypeId,
      pillarId: m.pillar ? pillarByCode.get(m.pillar) ?? null : null,
      applicationId: null,
    });
  }

  for (const spec of skillByName.values()) {
    await prisma.skill.upsert({
      where: { catalog_id_name: { catalog_id: catalog.id, name: spec.name } },
      update: {
        role_type_id: spec.roleTypeId,
        pillar_id: spec.pillarId,
        application_id: spec.applicationId,
      },
      create: {
        catalog_id: catalog.id,
        name: spec.name,
        role_type_id: spec.roleTypeId,
        pillar_id: spec.pillarId,
        application_id: spec.applicationId,
      },
    });
  }

  // --- Skill tags (freelancerMapping: incoming job-req term → normalized) ----
  // `selling_agent` is preserved as a raw annotation only. Coordinator-coverage
  // (linking the agent to a Person) is out of scope until the profiles brief.
  const seenTag = new Set<string>();
  for (const m of data.freelancerMapping) {
    const roleTypeId = resolveRoleType(m.roleType);
    if (!roleTypeId || !m.jobReqSkill) continue;
    const dedupe = `${roleTypeId}::${m.jobReqSkill}`;
    if (seenTag.has(dedupe)) continue; // first mapping row wins on collision
    seenTag.add(dedupe);
    await prisma.skillTag.upsert({
      where: {
        catalog_id_role_type_id_name: {
          catalog_id: catalog.id,
          role_type_id: roleTypeId,
          name: m.jobReqSkill,
        },
      },
      update: {
        pillar_id: m.pillar ? pillarByCode.get(m.pillar) ?? null : null,
        panameer_skill: m.panameerSkill,
        selling_agent: m.sellingAgent,
      },
      create: {
        catalog_id: catalog.id,
        role_type_id: roleTypeId,
        name: m.jobReqSkill,
        pillar_id: m.pillar ? pillarByCode.get(m.pillar) ?? null : null,
        panameer_skill: m.panameerSkill,
        selling_agent: m.sellingAgent,
      },
    });
  }

  // --- Flat lookups ------------------------------------------------------
  for (const r of data.regions) {
    await prisma.region.upsert({
      where: { name: r.name },
      update: { description: r.desc },
      create: { name: r.name, description: r.desc },
    });
  }
  for (const e of data.engagementTypes) {
    await prisma.engagementType.upsert({
      where: { code: e.code },
      update: { name: e.name, detail: e.detail },
      create: { code: e.code, name: e.name, detail: e.detail },
    });
  }
  for (const name of data.nonOracleApplications) {
    await prisma.nonOracleApplication.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  return {
    catalog: await prisma.serviceCatalog.count(),
    roleTypes: await prisma.roleType.count(),
    pillars: await prisma.pillar.count(),
    offerings: await prisma.offering.count(),
    applications: await prisma.application.count(),
    skills: await prisma.skill.count(),
    tags: await prisma.skillTag.count(),
    regions: await prisma.region.count(),
    engagementTypes: await prisma.engagementType.count(),
    nonOracleApplications: await prisma.nonOracleApplication.count(),
  };
}
