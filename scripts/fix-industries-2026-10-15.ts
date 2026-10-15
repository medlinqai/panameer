// Industry list (Scott 10-15): add Professional & Business Services; fix "Industry Products" → "Industrial Products".
// Dry run by default; --apply to write. Run: npx tsx --env-file=.env.local scripts/fix-industries-2026-10-15.ts [--apply]
import { prisma } from "@/lib/prisma";
const APPLY = process.argv.includes("--apply");
async function main() {
  const any = await prisma.specialization.findFirst({ where: { kind: "INDUSTRY", status: "ACTIVE" } });
  if (!any) throw new Error("No INDUSTRY rows found");
  const typo = await prisma.specialization.findFirst({ where: { kind: "INDUSTRY", name: "Industry Products & Manufacturing" } });
  const has = await prisma.specialization.findFirst({ where: { kind: "INDUSTRY", name: "Professional & Business Services" } });
  if (APPLY) {
    if (typo) await prisma.specialization.update({ where: { id: typo.id }, data: { name: "Industrial Products & Manufacturing" } });
    if (!has) await prisma.specialization.create({ data: { kind: "INDUSTRY", name: "Professional & Business Services", business_type_id: any.business_type_id, status: "ACTIVE", origin: "SEED", is_custom: false } });
  }
  console.log(JSON.stringify({ applied: APPLY, renamed: !!typo, added: !has }));
}
main().finally(() => prisma.$disconnect());
