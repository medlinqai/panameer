// Read-only export for the four-list taxonomy map (Scott 10-14): roles, areas, pillars › offerings › applications,
// skills (with role/pillar/app/area/business type + how many providers hold each), domains and the skill→domain bridge.
// Writes scripts/out/taxonomy_map_export.json. Changes nothing.
// Run: npx tsx --env-file=.env.local scripts/export-taxonomy-map.ts
import { mkdirSync, writeFileSync } from "node:fs";
import { prisma } from "@/lib/prisma";

async function main() {
  const [roles, areas, pillars, offerings, applications, skills, domains, bridges, businessTypes] = await Promise.all([
    prisma.role.findMany({ orderBy: { sort_order: "asc" }, select: { id: true, code: true, name: true, display: true } }),
    prisma.area.findMany({ orderBy: { sort_order: "asc" }, select: { id: true, code: true, label: true, hidden: true } }),
    prisma.pillar.findMany({ orderBy: { sort_order: "asc" }, select: { id: true, code: true, name: true, role_id: true, area_id: true, retired_at: true, business_type_id: true } }),
    prisma.offering.findMany({ select: { id: true, name: true, pillar_id: true, area_id: true } }),
    prisma.application.findMany({ select: { id: true, name: true, app_group: true, offering_id: true, is_custom: true } }),
    prisma.skill.findMany({
      where: { merged_into_id: null, rejected_at: null },
      select: { id: true, name: true, role_id: true, pillar_id: true, application_id: true, area_id: true, area: true, category: true, business_type_id: true, status: true, is_custom: true, origin: true, _count: { select: { providerSkills: true } } },
    }),
    prisma.domain.findMany({ orderBy: [{ process: "asc" }, { sort_order: "asc" }], select: { id: true, process: true, name: true, key: true } }),
    prisma.domainModuleBridge.findMany({ select: { domain_id: true, suite: true, module_name: true, skill_id: true } }),
    prisma.businessType.findMany({ select: { id: true, code: true, name: true } }),
  ]);
  mkdirSync("scripts/out", { recursive: true });
  const out = { exported_at: new Date().toISOString(), roles, areas, pillars, offerings, applications, skills, domains, bridges, businessTypes };
  writeFileSync("scripts/out/taxonomy_map_export.json", JSON.stringify(out));
  console.log(JSON.stringify({ roles: roles.length, areas: areas.length, pillars: pillars.length, offerings: offerings.length, applications: applications.length, skills: skills.length, domains: domains.length, bridges: bridges.length, file: "scripts/out/taxonomy_map_export.json" }));
}
main().finally(() => prisma.$disconnect());
