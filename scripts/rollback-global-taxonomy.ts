// GT-E006: the way back. Turns taxonomy_v2 off and deletes only rows with origin = 'GT_2026_10_14' (capabilities first).
// Old data (Skill, Role, Pillar, ProviderSkill, existing Domain rows) is never touched, so there is nothing to restore.
// Dry run by default (prints counts); --apply deletes. Run: npx tsx --env-file=.env.local scripts/rollback-global-taxonomy.ts [--apply]
import { prisma } from "@/lib/prisma";
import { setSetting } from "@/lib/platform-settings";

const APPLY = process.argv.includes("--apply");
const ORIGIN = "GT_2026_10_14";
const o = { origin: ORIGIN };

async function main() {
  const gtDomainIds = (await prisma.domain.findMany({ where: o, select: { id: true } })).map((d) => d.id);
  const counts = {
    providerCapabilities: await prisma.providerCapability.count({ where: o }),
    providerAttributeValues: await prisma.providerAttributeValue.count({ where: o }),
    businessTypeAttributes: await prisma.businessTypeAttribute.count({ where: o }),
    businessTypeProcesses: await prisma.businessTypeProcess.count({ where: o }),
    systemItems: await prisma.systemItem.count({ where: o }),
    systemProducts: await prisma.systemProduct.count({ where: o }),
    systemVendors: await prisma.systemVendor.count({ where: o }),
    knowledgeSkills: await prisma.knowledgeSkill.count({ where: o }),
    workRoles: await prisma.workRole.count({ where: o }),
    domains: gtDomainIds.length,
  };
  // Existing tables that may point at a GT domain (they'd lose that one link when the domain goes).
  const touching = {
    serviceProductDomainLinks: await prisma.serviceProductDomain.count({ where: { domain_id: { in: gtDomainIds } } }),
    domainModuleBridges: await prisma.domainModuleBridge.count({ where: { domain_id: { in: gtDomainIds } } }),
  };
  const untouched = { skills: await prisma.skill.count(), providerSkills: await prisma.providerSkill.count(), existingDomains: await prisma.domain.count({ where: { origin: null } }) };
  console.log(JSON.stringify({ applied: APPLY, switchOff: true, delete: counts, linksToGtDomains: touching, untouched }, null, 1));
  if (!APPLY) return;
  await setSetting("taxonomy_v2", false, null);
  await prisma.$transaction([
    prisma.providerCapability.deleteMany({ where: o }),
    prisma.providerAttributeValue.deleteMany({ where: o }),
    prisma.businessTypeAttribute.deleteMany({ where: o }),
    prisma.businessTypeProcess.deleteMany({ where: o }),
    prisma.systemItem.deleteMany({ where: o }),
    prisma.systemProduct.deleteMany({ where: o }),
    prisma.systemVendor.deleteMany({ where: o }),
    prisma.knowledgeSkill.deleteMany({ where: o }),
    prisma.workRole.deleteMany({ where: o }),
    prisma.domain.deleteMany({ where: o }),
  ]);
  console.log("rolled back — taxonomy_v2 off, Global Taxonomy rows removed");
}

main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
