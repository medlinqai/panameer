// Rename one stock Service Type (e.g. "Remote Consulting" → "Offsite Consulting"). Dry run by default; --apply writes.
// Usage: npx tsx --env-file=.env.local scripts/rename-service-type.ts "<current name>" "<new name>" [--apply]
import { prisma } from "@/lib/prisma";
const [oldN, newN] = process.argv.slice(2).filter((a) => !a.startsWith("--")); const APPLY = process.argv.includes("--apply");
(async () => {
  const hits = await prisma.serviceType.findMany({ where: { name: { equals: oldN, mode: "insensitive" } }, select: { id: true, name: true } });
  const clash = await prisma.serviceType.count({ where: { name: { equals: newN, mode: "insensitive" } } });
  if (hits.length !== 1 || clash) { console.log(`Found ${hits.length} named "${oldN}" and ${clash} already named "${newN}" — tell Claude.`); return prisma.$disconnect(); }
  console.log(`"${hits[0].name}"  →  "${newN}"`);
  if (APPLY) await prisma.serviceType.update({ where: { id: hits[0].id }, data: { name: newN } });
  console.log(APPLY ? "APPLIED" : "DRY RUN — nothing written. Re-run with --apply.");
  await prisma.$disconnect();
})();
