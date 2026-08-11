import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as dotenv from "dotenv";
import * as path from "path";
import { seedTaxonomy } from "./seed-taxonomy";

/*
  Same bootstrap as `seed.ts`: the pg adapter needs DATABASE_URL at construction
  time, and ts-node does not read .env.local on its own — without this it falls
  back to localhost:5432 and fails with a connection error that looks nothing
  like the missing-env it actually is.
*/
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

/**
 * Reseed the SERVICE CATALOG only (brief_seed_ai_catalog).
 *
 * `npm run seed` also creates the admin user, the Learn curriculum and the
 * whole demo org. Adding one role to the taxonomy should not require running
 * any of that — on a populated environment it is a lot of write traffic to
 * achieve a nine-skill change, and every extra thing touched is another thing
 * that can go wrong on a database with real data in it.
 *
 * `seedTaxonomy` is fully idempotent: every write is an upsert keyed on a
 * natural unique, and its retirement pass only removes rows the JSON no longer
 * contains. Adding a role therefore touches nothing that already exists, and
 * re-running it is a no-op.
 */
async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const prisma = new PrismaClient({ adapter });
  try {
    const c = await seedTaxonomy(prisma);
    report(c);
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Print before→after, not just after.
 *
 * A JSON dump of the counts was fine while this seed only ever added rows. The
 * expanded catalog restructures, so the number that matters is not "157 skills"
 * — it is which of the previous 103 were moved, which were merged, which were
 * dropped and who was holding them. Anything the seed took away is printed by
 * name; anything it saved is printed as a count, because saving is the
 * uninteresting case.
 */
function report(c: Awaited<ReturnType<typeof seedTaxonomy>>) {
  const arrow = (was: number, now: number) =>
    `${String(was).padStart(4)} → ${String(now).padEnd(4)}${
      now === was ? "" : `  (${now > was ? "+" : ""}${now - was})`
    }`;

  const lines: string[] = [
    "",
    "SERVICE CATALOG — before → after",
    `  roles          ${arrow(c.before.roles, c.roles)}`,
    `  domains        ${arrow(c.before.domains, c.domains)}`,
    `  skills         ${arrow(c.before.skills, c.skills)}`,
    `  custom skills  ${String(c.before.customSkills).padStart(4)}       (preserved — never touched)`,
    `  specializations${String(c.specializations).padStart(4)}`,
    "",
    "BUYER VOCABULARY (v5)",
    `  capability domains ${String(c.capabilityDomains).padStart(4)}`,
    `  bridge rows        ${String(c.bridgeRows).padStart(4)}  (capability → module, per suite)`,
    `  stale rows retired ${String(c.bridgeRetired).padStart(4)}`,
    `  unresolved modules ${String(c.bridgeUnresolved).padStart(4)}  (named in the sheet, no matching Skill)`,
    ...c.bridgeUnresolvedNames.map((n) => `    ${n}`),
    "",
    "PRESERVED",
    `  domains renamed in place   ${c.renamedDomains.length}`,
    ...c.renamedDomains.map((r) => `    ${r}`),
    `  skills renamed in place    ${c.renamedSkills.length}`,
    ...c.renamedSkills.map((r) => `    ${r}`),
    `  skills moved to a new domain (links kept)  ${c.rehomedSkills}`,
    `  links merged onto a surviving skill        ${c.mergedSkillLinks}`,
    "",
    "RETIRED",
    `  domains  ${c.retiredPillars}`,
    ...c.retiredPillarNames.map((n) => `    ${n}`),
    `  skills   ${c.retiredSkills}`,
    ...c.retiredSkillNames.map((n) => `    ${n}`),
    `  roles    ${c.retiredRoleTypes}`,
    "",
    "ORPHANED",
    `  provider-skill links dropped      ${c.orphanedProviderSkills}`,
    ...c.orphanedSkillDetail.map((d) => `    ${d}`),
    `  work-request-skill links dropped  ${c.orphanedWorkRequestSkills}`,
    `  providers whose DOMAIN split      ${c.providersDetachedFromDomain}  (pillar_id → null; they re-pick)`,
    `  work requests whose DOMAIN split  ${c.workRequestsDetachedFromDomain}`,
    "",
    "Restart the dev server (rm -rf .next) — the catalog is reference data and the",
    "running app is holding the old tree.",
    "",
  ];
  console.log(lines.join("\n"));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
