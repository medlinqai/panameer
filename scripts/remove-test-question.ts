// Remove a wrong question from a certification test (matched by words in the question). Dry run by default; --apply writes.
// Usage: npx tsx --env-file=.env.local scripts/remove-test-question.ts "<path title>" "<words from the question>" [--apply]
import { prisma } from "@/lib/prisma";
const [title, words] = process.argv.slice(2).filter((a) => !a.startsWith("--")); const APPLY = process.argv.includes("--apply");
type Q = { id: string; question: string };
(async () => {
  const t = await prisma.certificationTest.findFirst({ where: { learningPath: { title } }, select: { id: true, status: true, questions: true } });
  if (!t) throw new Error(`No test for "${title}"`);
  const qs = t.questions as unknown as Q[];
  const hits = qs.filter((q) => q.question.toLowerCase().includes(words.toLowerCase()));
  if (hits.length !== 1) { console.log(`Found ${hits.length} matching questions — make the words more specific.`); hits.forEach((q) => console.log(" · " + q.question)); return prisma.$disconnect(); }
  console.log(`${title} (${t.status}): remove "${hits[0].question}" → ${qs.length - 1} questions left`);
  if (APPLY) await prisma.certificationTest.update({ where: { id: t.id }, data: { questions: qs.filter((q) => q.id !== hits[0].id) as never } });
  console.log(APPLY ? "APPLIED" : "DRY RUN — nothing written. Re-run with --apply.");
  await prisma.$disconnect();
})();
