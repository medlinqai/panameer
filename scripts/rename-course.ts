// Rename one course. Dry run by default; --apply writes.
// Usage: npx tsx --env-file=.env.local scripts/rename-course.ts "<path title>" "<current course title>" "<new title>" [--apply]
import { prisma } from "@/lib/prisma";
const [path, oldT, newT] = process.argv.slice(2).filter((a) => !a.startsWith("--")); const APPLY = process.argv.includes("--apply");
(async () => {
  const hits = await prisma.course.findMany({ where: { title: oldT, learningPath: { title: path } }, select: { id: true, title: true } });
  if (hits.length !== 1) { console.log(`Found ${hits.length} matches — tell Claude.`); return prisma.$disconnect(); }
  console.log(`${path} › "${hits[0].title}"  →  "${newT}"`);
  if (APPLY) await prisma.course.update({ where: { id: hits[0].id }, data: { title: newT } });
  console.log(APPLY ? "APPLIED" : "DRY RUN — nothing written. Re-run with --apply.");
  await prisma.$disconnect();
})();
