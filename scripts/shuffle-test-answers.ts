// Scott 2026-10-10: existing tests have the right answer on "A" every time. Re-order each question's options at random (correct answer tracked).
// Dry run by default (shows the A/B/C/D spread before → after). Apply: npx tsx --env-file=.env.local scripts/shuffle-test-answers.ts --apply
import { prisma } from "@/lib/prisma";
import { shuffleOptions } from "@/lib/learn-assessment";
const APPLY = process.argv.includes("--apply");
type Q = { options: string[]; correctIndex: number };
const spread = (qs: Q[]) => "ABCD".split("").map((L, i) => `${L}:${qs.filter((q) => q.correctIndex === i).length}`).join(" ");
(async () => {
  const tests = await prisma.certificationTest.findMany({ select: { id: true, status: true, questions: true, learningPath: { select: { title: true } }, _count: { select: { attempts: true } } } });
  for (const t of tests) {
    const qs = (t.questions as unknown as Q[]) ?? [];
    if (!Array.isArray(qs) || qs.length === 0) continue;
    const next = qs.map((q) => shuffleOptions(q));
    console.log(`${t.learningPath.title} (${t.status}, ${qs.length} q, ${t._count.attempts} attempts): ${spread(qs)}  →  ${spread(next)}`);
    if (APPLY) await prisma.certificationTest.update({ where: { id: t.id }, data: { questions: next as never } });
  }
  console.log(APPLY ? "APPLIED" : "DRY RUN — nothing written. Re-run with --apply.");
  await prisma.$disconnect();
})();
