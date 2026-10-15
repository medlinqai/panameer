// RC-E004: one profile's unconfirmed LEGACY capabilities are deleted and re-made from its saved résumé picks with the RC fixes.
// Confirmed and SELF rows are untouched. Dry run lists what goes; --apply does it.
// Run: TAXONOMY_V2_FORCE=1 npx tsx --env-file=.env.local scripts/rc-clean-capabilities.ts <email> [--apply]
import { prisma } from "@/lib/prisma";
import { capabilitiesFor, capabilitiesFromSkills } from "@/lib/capabilities";

const email = process.argv[2];
const APPLY = process.argv.includes("--apply");

async function main() {
  const p = await prisma.person.findFirst({ where: { user: { email } }, select: { providerProfile: { select: { id: true } } } });
  const id = p?.providerProfile?.id;
  if (!id) throw new Error(`No seller profile for ${email}`);
  const before = await capabilitiesFor(id);
  const gone = await prisma.providerCapability.findMany({ where: { provider_profile_id: id, source: "LEGACY", confirmed_at: null }, select: { id: true } });
  // The saved picks: each job's skills with that job's own text, then the profile's skills (no system — RC-E001).
  const [employers, projects, skills] = await Promise.all([
    prisma.employer.findMany({ where: { provider_profile_id: id }, select: { name: true, role_title: true, description: true, skills: { select: { skill_id: true } } } }),
    prisma.project.findMany({ where: { provider_profile_id: id }, select: { name: true, client_name: true, description: true, skills: { select: { skill_id: true } } } }),
    prisma.providerSkill.findMany({ where: { provider_profile_id: id }, select: { skill_id: true } }),
  ]);
  const picks = [
    ...employers.map((e) => ({ skillIds: e.skills.map((j) => j.skill_id), text: [e.name, e.role_title, e.description].filter(Boolean).join("\n") })),
    ...projects.map((x) => ({ skillIds: x.skills.map((j) => j.skill_id), text: [x.name, x.client_name, x.description].filter(Boolean).join("\n") })),
    { skillIds: skills.map((s) => s.skill_id), text: "", systems: false },
  ].filter((x) => x.skillIds.length);
  console.log(JSON.stringify({ applied: APPLY, before: before.length, beforeWithSystem: before.filter((c) => c.system).length, deleteUnconfirmedLegacy: gone.length, picks: picks.length }));
  if (!APPLY) {
    for (const c of before.filter((c) => c.source === "LEGACY" && !c.confirmed)) console.log("  would delete:", c.line);
    return;
  }
  await prisma.providerCapability.deleteMany({ where: { id: { in: gone.map((g) => g.id) } } });
  const made = await capabilitiesFromSkills(id, picks);
  const after = await capabilitiesFor(id);
  console.log(JSON.stringify({ made, after: after.length, afterWithSystem: after.filter((c) => c.system).length }));
  for (const c of after) console.log(`  ${c.confirmed ? "confirmed" : "new"} | ${c.line}`);
}

main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
