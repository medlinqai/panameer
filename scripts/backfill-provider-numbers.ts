// AN-E001: give every existing provider a Provider Number in join order (P-1001…). Dry run by default.
// Usage: npx tsx --env-file=.env.local scripts/backfill-provider-numbers.ts [--apply]
import { prisma } from "@/lib/prisma";
import { ensureProviderNumber } from "@/lib/provider-number";

(async () => {
  const apply = process.argv.includes("--apply");
  const todo = await prisma.providerProfile.findMany({ where: { provider_number: null }, orderBy: { created_at: "asc" }, select: { id: true } });
  console.log(`${todo.length} providers without a number.`);
  if (apply) for (const p of todo) await ensureProviderNumber(p.id);
  const sample = await prisma.providerProfile.findMany({ where: { provider_number: { not: null } }, orderBy: { created_at: "asc" }, take: 3, select: { provider_number: true } });
  console.log(apply ? `Applied. First: ${sample.map((s) => s.provider_number).join(", ")}` : "Dry run — add --apply.");
  await prisma.$disconnect();
})();
