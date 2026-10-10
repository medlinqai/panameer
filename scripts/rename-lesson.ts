// Rename one lesson. Dry run by default; --apply writes. Lists every match so you can see which one changes.
// Usage: npx tsx --env-file=.env.local scripts/rename-lesson.ts "<path title>" "<words in course title>" "<current lesson title>" "<new title>" [--apply]
import { prisma } from "@/lib/prisma";
const [path, course, oldT, newT] = process.argv.slice(2).filter((a) => !a.startsWith("--")); const APPLY = process.argv.includes("--apply");
(async () => {
  const hits = await prisma.lesson.findMany({ where: { title: { equals: oldT, mode: "insensitive" }, section: { course: { title: { contains: course, mode: "insensitive" }, learningPath: { title: path } } } }, select: { id: true, title: true, section: { select: { course: { select: { title: true } } } } } });
  if (hits.length !== 1) { console.log(`Found ${hits.length} matches — tell Claude.`); hits.forEach((h) => console.log(` · ${h.section.course.title} › ${h.title}`)); return prisma.$disconnect(); }
  console.log(`${path} › ${hits[0].section.course.title} › "${hits[0].title}"  →  "${newT}"`);
  if (APPLY) await prisma.lesson.update({ where: { id: hits[0].id }, data: { title: newT } });
  console.log(APPLY ? "APPLIED" : "DRY RUN — nothing written. Re-run with --apply.");
  await prisma.$disconnect();
})();
