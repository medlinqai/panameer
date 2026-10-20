// MS-E004: test accounts (and companies whose people are all test accounts) record acceptance of the current ToS.
// Real users are never touched (Scott 10-05: no re-accept prompt before public beta). Usage: … scripts/record-test-tos.ts [--apply]
import { prisma } from "@/lib/prisma";
import { COMPANY_TOS_VERSION, USER_TOS_VERSION } from "@/lib/tos";
(async () => {
  const apply = process.argv.includes("--apply");
  const users = await prisma.user.findMany({ where: { is_test: true, OR: [{ tos_version: null }, { tos_version: { not: USER_TOS_VERSION } }] }, select: { id: true } });
  const companies = (await prisma.company.findMany({ where: { OR: [{ company_tos_version: null }, { company_tos_version: { not: COMPANY_TOS_VERSION } }], people: { some: {} } }, select: { id: true, people: { select: { id: true, user: { select: { is_test: true } } } } } }))
    .filter((c) => c.people.length && c.people.every((p) => p.user?.is_test === true));
  console.log(`Test users to record: ${users.length} · test-only companies to record: ${companies.length}`);
  if (apply) {
    const now = new Date();
    await prisma.user.updateMany({ where: { id: { in: users.map((u) => u.id) }, is_test: true }, data: { tos_accepted_at: now, tos_version: USER_TOS_VERSION } });
    for (const c of companies) await prisma.company.update({ where: { id: c.id }, data: { company_tos_accepted_at: now, company_tos_version: COMPANY_TOS_VERSION, company_tos_accepted_by: c.people[0].id } });
    console.log("Applied.");
  } else console.log("Dry run — add --apply.");
  await prisma.$disconnect();
})();
