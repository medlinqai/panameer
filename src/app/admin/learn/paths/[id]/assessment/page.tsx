import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { guardPage } from "@/lib/guard";
import {
  MIN_REVIEWED_QUESTIONS,
  readQuestions,
} from "@/lib/learn-assessment";
import { AssessmentReview } from "@/components/admin/AssessmentReview";
import { BackLink } from "@/components/console/BackLink";

export const dynamic = "force-dynamic";

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

  const row = await prisma.certificationTest.findUnique({
    where: { learning_path_id: id },
  });
  const reviewer = row?.reviewed_by
    ? await prisma.person.findUnique({
        where: { id: row.reviewed_by },
        select: { first_name: true, last_name: true },
      })
    : null;

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
      <BackLink href="/admin/learn" label="Learn" />
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
