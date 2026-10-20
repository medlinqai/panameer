// NB-E000: give every company a code from its name (dry run by default). Usage: npx tsx --env-file=.env.local scripts/backfill-company-codes.ts [--apply]
import { prisma } from "@/lib/prisma";
import { ensureCompanyCode, suggestCode } from "@/lib/company-code";
(async () => {
  const apply = process.argv.includes("--apply");
  const todo = await prisma.company.findMany({ where: { code: null }, orderBy: { created_at: "asc" }, select: { id: true, name: true } });
  console.log(`${todo.length} companies without a code.`);
  for (const c of todo.slice(0, apply ? todo.length : 8)) {
    const code = apply ? await ensureCompanyCode(c.id) : await suggestCode(c.name, c.id);
    if (!apply || todo.indexOf(c) < 8) console.log(`  ${c.name} → ${code}`);
  }
  const dup = await prisma.$queryRaw<{ n: bigint }[]>`SELECT count(*) n FROM (SELECT code FROM companies WHERE code IS NOT NULL GROUP BY code HAVING count(*) > 1) d`;
  console.log(apply ? `Applied. Duplicate codes: ${dup[0].n}` : "Dry run — add --apply.");
  await prisma.$disconnect();
})();
