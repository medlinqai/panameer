import { prisma } from "@/lib/prisma";
import {
  aiAssessmentAvailable,
  buildAssessmentSource,
  generateAssessment,
} from "@/lib/learn-assessment";

/**
 * THE BATCH RUN (brief_learn_assessments_generate WS5).
 *
 *   npm run learn:assessments                      # dry run, every path
 *   npm run learn:assessments -- --path=<slug>     # one path
 *   npm run learn:assessments -- --apply           # write
 *
 * ── ⚠ IT NEVER OVERWRITES A PUBLISHED SET ───────────────────────────────────
 *
 * A PUBLISHED assessment has been read by a human and may already have awarded
 * certificates. Regenerating over it would silently change the test a credential
 * was earned against — which is exactly what `LearnAssessment`'s own caching
 * comment exists to prevent: *"every learner sitting the same test is the only
 * way a pass means the same thing twice."* DRAFTs are replaced; PUBLISHED is
 * refused, loudly, and the run continues.
 *
 * ── ⚠ CHECKPOINTED BY CONSTRUCTION ──────────────────────────────────────────
 *
 * There is no separate checkpoint file: the DATABASE is the checkpoint. A path
 * that already has a set is skipped unless `--regenerate`, so a crash at path 19
 * costs one path, not eighteen. That also makes the whole thing re-runnable with
 * no flags to remember.
 *
 * ── ⚠ IT REFUSES TO WRITE A THIN TEST ───────────────────────────────────────
 *
 * The WS3 filters remove production notes and mis-imported rows. If a path has
 * (almost) nothing left, a generated test would be a certificate awarded for
 * answering four questions about a title. Below MIN_LESSONS it says so and skips.
 */

/** Sonnet list pricing, USD per million tokens, for the cost line. */
const PRICE_IN_PER_MTOK = 3;
const PRICE_OUT_PER_MTOK = 15;

/**
 * ⚠ A JUDGEMENT, AND A DELIBERATELY LOW ONE. Two lessons is the floor at which a
 * question can plausibly test understanding rather than a title. The one-lesson
 * paths — three of them — are reported and skipped rather than given a
 * five-question exam over a single video, which is the case most likely to
 * embarrass. Raising this is Scott's call; `pass_threshold` and `max_attempts`
 * are deliberately left at their column defaults for the same reason.
 */
const MIN_LESSONS = 2;

const arg = (name: string): string | null => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : null;
};
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const apply = process.argv.includes("--apply");
  const regenerate = process.argv.includes("--regenerate");
  const only = arg("path");
  const limit = Number(arg("limit") ?? "0") || 0;

  if (!aiAssessmentAvailable()) {
    /* ⚠ A DISABLED FEATURE, NOT A FAILURE — the existing contract. */
    console.log("ANTHROPIC_API_KEY is not configured, so question generation is disabled here.");
    console.log("Nothing to do. This is not an error.");
    await prisma.$disconnect();
    return;
  }

  const paths = await prisma.learningPath.findMany({
    where: { status: "PUBLISHED", ...(only ? { slug: only } : {}) },
    orderBy: { title: "asc" },
    select: { id: true, slug: true, title: true, assessment: { select: { id: true, status: true } } },
  });
  if (paths.length === 0) {
    console.error(only ? `No published path with slug "${only}".` : "No published paths.");
    process.exit(1);
  }

  console.log(`${apply ? "APPLYING" : "DRY RUN (pass --apply to write)"} — ${paths.length} path(s)\n`);
  let generated = 0;
  let skipped = 0;
  let refused = 0;
  let inTok = 0;
  let outTok = 0;
  let done = 0;

  for (const p of paths) {
    if (limit && done >= limit) {
      console.log(`\n(stopping at --limit=${limit}; ${paths.length - done} path(s) untouched)`);
      break;
    }

    /* ⚠ PUBLISHED IS UNTOUCHABLE. */
    if (p.assessment?.status === "PUBLISHED") {
      console.log(`  REFUSE  ${p.slug} — its assessment is PUBLISHED. Not regenerating.`);
      refused += 1;
      continue;
    }
    if (p.assessment && !regenerate) {
      console.log(`  skip    ${p.slug} — a DRAFT already exists (pass --regenerate to replace).`);
      skipped += 1;
      continue;
    }

    const source = await buildAssessmentSource(p.id);
    const removed = source.excluded.ideasForFuture + source.excluded.pathOverview + source.excluded.emptyCourse;
    const note =
      `lessons ${source.lessons}` +
      (removed > 0
        ? ` (filtered out ${removed}: ideas-for-future ${source.excluded.ideasForFuture}, path-overview ${source.excluded.pathOverview}, empty-course ${source.excluded.emptyCourse})`
        : "") +
      (source.docSources.length > 0 ? `, docs from ${source.docSources.length} course(s)` : "");

    if (source.lessons < MIN_LESSONS) {
      console.log(`  TOO THIN ${p.slug} — ${note}. A test here would not be worth passing. SKIPPED.`);
      skipped += 1;
      continue;
    }

    if (!apply) {
      console.log(`  would generate  ${p.slug} — ${note}`);
      done += 1;
      continue;
    }

    const outcome = await generateAssessment(p.id);
    done += 1;
    if (!outcome.ok) {
      console.log(`  FAILED  ${p.slug} — ${outcome.message}`);
      continue;
    }
    inTok += outcome.usage.inputTokens;
    outTok += outcome.usage.outputTokens;

    await prisma.learnAssessment.upsert({
      where: { learning_path_id: p.id },
      update: {
        questions: outcome.questions,
        model: outcome.model,
        generated_at: new Date(),
        /* ⚠ AN UPSERT MUST NOT PROMOTE. A replaced DRAFT is still a DRAFT, and
           any prior review is void because the questions changed. */
        status: "DRAFT",
        reviewed_by: null,
        reviewed_at: null,
        source_note: outcome.docSources.join(" ") || null,
      },
      create: {
        learning_path_id: p.id,
        questions: outcome.questions,
        model: outcome.model,
        source_note: outcome.docSources.join(" ") || null,
      },
    });
    generated += 1;
    console.log(
      `  wrote   ${p.slug} — ${outcome.questions.length} question(s), ${note}` +
        `\n            rejected: ${outcome.rejected.unanswerable} unanswerable, ${outcome.rejected.orphanedLesson} naming a lesson outside the path` +
        `\n            spread: ${outcome.spread.courses} course(s), worst ${(outcome.spread.concentration * 100).toFixed(0)}%` +
        (outcome.spread.overCap ? "  ⚠ OVER THE 40% CAP — flag at review" : "") +
        `\n            ${outcome.usage.inputTokens} in / ${outcome.usage.outputTokens} out tokens, ${outcome.ms}ms`
    );

    /* Polite, and it makes a rate-limit reply unlikely rather than handled. */
    await sleep(1_500);
  }

  const cost = (inTok / 1e6) * PRICE_IN_PER_MTOK + (outTok / 1e6) * PRICE_OUT_PER_MTOK;
  console.log(`\ngenerated ${generated} · skipped ${skipped} · refused (PUBLISHED) ${refused}`);
  console.log(`tokens ${inTok} in / ${outTok} out  →  ~$${cost.toFixed(4)} at list price`);
  console.log(`⚠ EVERYTHING WRITTEN IS DRAFT. Nothing awards a certificate until a human publishes it.`);
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
