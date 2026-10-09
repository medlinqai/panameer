// L-E042: a DRAFT certification test for every published path that has a lesson with a video and no test yet.
// Questions come only from lessons with a video. Existing tests are skipped, never overwritten.
// Usage: npx tsx --env-file=.env.local scripts/generate-certification-tests.ts [--path=<slug>] [--apply]
// Dry run by default (lists what it would generate; no AI calls). Scott runs --apply.
import { prisma } from "@/lib/prisma";
import { isPlayable } from "@/lib/learn";
import { aiAssessmentAvailable, generateAssessment } from "@/lib/learn-assessment";

(async () => {
  const apply = process.argv.includes("--apply");
  const only = process.argv.find((a) => a.startsWith("--path="))?.slice(7);
  const paths = await prisma.learningPath.findMany({
    where: { status: "PUBLISHED", ...(only ? { slug: only } : {}) },
    orderBy: { title: "asc" },
    select: { id: true, slug: true, title: true, assessment: { select: { status: true } }, courses: { select: { sections: { select: { lessons: { where: { retired_at: null }, select: { vimeo_ref: true, production_status: true } } } } } } },
  });
  if (apply && !aiAssessmentAvailable()) throw new Error("AI question generation isn't configured (ANTHROPIC_API_KEY).");
  let made = 0, skipped = 0, failed = 0;
  for (const p of paths) {
    const out = p.courses.flatMap((c) => c.sections.flatMap((s) => s.lessons)).filter(isPlayable).length;
    if (p.assessment) { console.log(`skip  ${p.slug} — already has a ${p.assessment.status} test`); skipped++; continue; }
    if (!out) { console.log(`skip  ${p.slug} — no lesson with a video yet`); skipped++; continue; }
    if (!apply) { console.log(`would ${p.slug} — ${out} lessons with a video`); continue; }
    // One path per call: generate, write as DRAFT, log, then the next.
    const r = await generateAssessment(p.id);
    if (!r.ok) { console.log(`FAIL  ${p.slug} — ${r.message}`); failed++; continue; }
    await prisma.certificationTest.create({ data: { learning_path_id: p.id, questions: r.questions, model: r.model, source_note: r.docSources.length ? r.docSources.join(" ") : null } });
    console.log(`made  ${p.slug} — ${r.questions.length} questions (DRAFT)`);
    made++;
  }
  console.log(apply ? `Done: ${made} drafted, ${skipped} skipped, ${failed} failed.` : "DRY RUN — re-run with --apply to generate (Scott runs it).");
  await prisma.$disconnect();
})();
