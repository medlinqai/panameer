import { NextResponse } from "next/server";
import { notify } from "@/lib/notifications";
import { z } from "zod";
import { ensureEnrolmentMembership } from "@/lib/group-membership";
import { learnEnrolmentRefusal } from "@/lib/learn-enrolment-gate";
import { prisma } from "@/lib/prisma";
import { getSessionViewer } from "@/lib/session";
import { isPlayable } from "@/lib/learn";
import { notifyInstructorEnrolled, notifyPathCompletedIfDone } from "@/lib/learn-instructor";

const BODY = z.object({
  lessonId: z.string().uuid(),
  completed: z.boolean(),
});

export async function POST(request: Request) {
  const viewer = await getSessionViewer();
  if (!viewer) {
    return NextResponse.json(
      { error: "Sign in to keep track of what you've finished." },
      { status: 401 }
    );
  }

  const parsed = BODY.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "That isn't a valid request." }, { status: 400 });
  }
  const { lessonId, completed } = parsed.data;

  const lesson = await prisma.lesson.findFirst({
    where: {
      id: lessonId,
      retired_at: null,
      section: { course: { learningPath: { status: "PUBLISHED" } } },
    },
    select: {
      id: true,
      vimeo_ref: true,
      production_status: true,
      section: {
        select: {
          course: {
            select: {
              id: true,
              title: true,
              learning_path_id: true,
              learningPath: { select: { slug: true } },
              sections: {
                select: { lessons: { where: { retired_at: null }, select: { id: true, expert_person_id: true, vimeo_ref: true, production_status: true } } },
              },
            },
          },
        },
      },
    },
  });
  if (!lesson) {
    return NextResponse.json({ error: "That lesson isn't available." }, { status: 404 });
  }

  if (!completed) {
    await prisma.lessonProgress.deleteMany({
      where: { user_id: viewer.userId, lesson_id: lessonId },
    });
    return NextResponse.json({ ok: true, completed: false });
  }

  // No credit for a lesson with no video yet (Scott 2026-10-08).
  if (!isPlayable(lesson)) {
    return NextResponse.json({ error: "This lesson isn't out yet, so it can't be marked complete." }, { status: 409 });
  }

  const pathId = lesson.section.course.learning_path_id;

  const refusal = await learnEnrolmentRefusal(viewer.userId, pathId);
  if (refusal) {
    const { status, ...body } = refusal;
    return NextResponse.json(body, { status });
  }

  const wasEnrolled = await prisma.learnEnrollment.findUnique({ where: { user_id_learning_path_id: { user_id: viewer.userId, learning_path_id: pathId } }, select: { id: true } });
  await prisma.$transaction([
    prisma.lessonProgress.upsert({
      where: { user_id_lesson_id: { user_id: viewer.userId, lesson_id: lessonId } },
      create: { user_id: viewer.userId, lesson_id: lessonId },
      update: {},
    }),
    prisma.learnEnrollment.upsert({
      where: {
        user_id_learning_path_id: { user_id: viewer.userId, learning_path_id: pathId },
      },
      create: { user_id: viewer.userId, learning_path_id: pathId },
      update: {},
    }),
  ]);
  await ensureEnrolmentMembership(viewer.userId, pathId);
  if (!wasEnrolled) await notifyInstructorEnrolled(viewer.userId, pathId);

  const course = lesson.section.course;
  // L-E036: a course is finished when every lesson with a video is done (Coming Soon lessons don't count).
  const courseLessonIds = course.sections.flatMap((s) => s.lessons.filter(isPlayable).map((l) => l.id));
  const doneCount = await prisma.lessonProgress.count({
    where: { user_id: viewer.userId, lesson_id: { in: courseLessonIds } },
  });

  if (courseLessonIds.length > 0 && doneCount === courseLessonIds.length) {
    const learner = await prisma.person.findUnique({
      where: { user_id: viewer.userId },
      select: { id: true, first_name: true, last_name: true },
    });
    if (learner) {
      await notify({
        event: "learn.course_completed.learner",
        personId: learner.id,
        entityType: "Course",
        entityId: course.id,
        dedupeKey: `learn.course_completed:${course.id}:${learner.id}`,
        vars: { courseTitle: course.title, pathSlug: course.learningPath?.slug ?? null },
      });

      const tally = new Map<string, number>();
      for (const s of course.sections) {
        for (const l of s.lessons) {
          if (l.expert_person_id) {
            tally.set(l.expert_person_id, (tally.get(l.expert_person_id) ?? 0) + 1);
          }
        }
      }
      const instructorId =
        [...tally.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

      if (instructorId && instructorId !== learner.id) {
        const learnerName =
          `${learner.first_name ?? ""} ${learner.last_name ?? ""}`.trim() || "Someone";
        await notify({
          event: "learn.course_completed.instructor",
          personId: instructorId,
          entityType: "Course",
          entityId: course.id,
          dedupeKey: `learn.course_completed:${course.id}:${learner.id}:instructor`,
          vars: { courseTitle: course.title, learnerName, learnerUserId: viewer.userId },
        });
      }
    }
  }

  await notifyPathCompletedIfDone(viewer.userId, pathId);
  return NextResponse.json({ ok: true, completed: true });
}
