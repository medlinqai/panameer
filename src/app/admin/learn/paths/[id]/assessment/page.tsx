import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { guardPage } from "@/lib/guard";
import {
  MIN_REVIEWED_QUESTIONS,
  readQuestions,
} from "@/lib/learn-assessment";
import { AssessmentReview } from "@/components/admin/AssessmentReview";

export const dynamic = "force-dynamic";

/**
 * ── ⚠ THE REVIEW SCREEN. `P1-J3-E020`, AND IT IS THE WHOLE BLOCKER ───────────
 *
 * `LearnAssessment.status` has defaulted to `DRAFT` since the review gate landed,
 * and `sitTest` refuses anything that is not `PUBLISHED`. The columns for the human
 * act — `reviewed_by`, `reviewed_at` — existed and NOTHING WROTE THEM, so every
 * generated set was permanently unsittable. Generating all 23 sets would have
 * produced 23 tests nobody could take. This screen is the missing act.
 *
 * ⚠ IT IS A READING SCREEN, NOT AN EDITOR. Scott's constraint: he will not
 * hand-build question banks. So there is no rich text, no "add a question", no way
 * to reword a stem. Read · drop · publish. If a set is bad the action is
 * REGENERATE, not repair.
 *
 * ── ⚠ WHAT A REVIEWER ACTUALLY NEEDS, AND WHY EACH PIECE IS HERE ─────────────
 *
 * · THE EXPECTED ANSWER. Already returned to admins, and the reason is recorded in
 *   the API: "you cannot judge whether a generated question is fair without seeing
 *   which answer it expects."
 * · THE LESSON EACH QUESTION TESTS. `P1-J3-E006` made every question carry a
 *   `lessonId`; surfacing it is the fastest way to spot a title-only guess.
 * · ⚠ WHETHER THAT LESSON HAS A DESCRIPTION. This is the one thing that was NOT
 *   already available and it is the most important column on the page. With no
 *   description the model wrote from a string like "STEP 3 - How to Create a
 *   Qualification Area" and will have produced plausible, well-formed,
 *   confidently-wrong questions that test the TITLE, not the lesson — and a
 *   reviewer skimming them will pass them, because they read fine. That is
 *   `P1-J3-E006` exactly, and it does not announce itself. So the page announces
 *   it: per question, and as a ratio at the top.
 * · `source_note` — which documentation URLs informed the set. Already stored,
 *   never shown.
 *
 * ── ⚠ THE DATA IS FETCHED HERE, ON THE SERVER, NOT BY THE CLIENT ─────────────
 *
 * The GET route exists and returns all of this, but the lesson→description join
 * does not belong in a client round-trip: it is a read of the catalog, it is what
 * the page is FOR, and doing it here means the reviewer never sees a page that
 * renders before it can tell them the one thing they need to know.
 */
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await guardPage("canAdminister");
  const { id } = await params;

  const path = await prisma.learningPath.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      slug: true,
      courses: {
        select: {
          title: true,
          sections: {
            select: { lessons: { select: { id: true, title: true, description: true } } },
          },
        },
      },
    },
  });
  if (!path) notFound();

  const row = await prisma.learnAssessment.findUnique({
    where: { learning_path_id: id },
  });
  const reviewer = row?.reviewed_by
    ? await prisma.person.findUnique({
        where: { id: row.reviewed_by },
        select: { first_name: true, last_name: true },
      })
    : null;

  /*
    ⚠ THE LESSON INDEX IS BUILT FROM THE PATH, NOT FROM THE QUESTIONS. A question
    naming a lesson outside this path is already rejected at generation, so a miss
    here means the catalog moved under a stored set — which is worth showing as
    "unknown lesson" rather than silently rendering a blank.
  */
  const lessons = new Map(
    path.courses.flatMap((c) =>
      c.sections.flatMap((s) =>
        s.lessons.map((l) => [
          l.id,
          {
            title: l.title,
            course: c.title,
            described: Boolean(l.description && l.description.trim().length > 0),
          },
        ] as const)
      )
    )
  );

  const questions = row ? readQuestions(row) : [];
  const rows = questions.map((q) => {
    const lesson = lessons.get(q.lessonId) ?? null;
    return {
      id: q.id,
      question: q.question,
      options: q.options,
      correctIndex: q.correctIndex,
      explanation: q.explanation,
      lessonTitle: lesson?.title ?? null,
      courseTitle: lesson?.course ?? q.courseTitle ?? null,
      described: lesson?.described ?? false,
      sourceKind: q.sourceKind,
    };
  });

  const lessonTotal = lessons.size;
  const lessonDescribed = [...lessons.values()].filter((l) => l.described).length;

  return (
    <div className="mx-auto w-full max-w-5xl">
      <p className="text-[13px]">
        <Link href="/admin/learn" className="font-semibold text-magenta hover:underline">
          ← Learn
        </Link>
      </p>
      <AssessmentReview
        pathId={path.id}
        pathTitle={path.title}
        pathSlug={path.slug}
        status={row?.status ?? null}
        model={row?.model ?? null}
        generatedAt={row?.generated_at?.toISOString() ?? null}
        sourceNote={row?.source_note ?? null}
        reviewedBy={reviewer ? `${reviewer.first_name} ${reviewer.last_name}`.trim() : null}
        reviewedAt={row?.reviewed_at?.toISOString() ?? null}
        threshold={row?.pass_threshold ?? 70}
        minQuestions={MIN_REVIEWED_QUESTIONS}
        lessonTotal={lessonTotal}
        lessonDescribed={lessonDescribed}
        questions={rows}
      />
    </div>
  );
}
