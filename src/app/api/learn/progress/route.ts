import { NextResponse } from "next/server";
import { notify } from "@/lib/notifications";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionViewer } from "@/lib/session";

const BODY = z.object({
  lessonId: z.string().uuid(),
  completed: z.boolean(),
});

/**
 * POST /api/learn/progress — mark a lesson done, or undo it (WS3).
 *
 * OWNER-SCOPED: the user id is the session's. The body says which LESSON and
 * whether it is done — never who did it.
 *
 * Marking a lesson complete ALSO enrolls the learner in its path if they weren't
 * already. Watching a lesson through is a stronger statement of intent than
 * clicking Enrol, and a progress row belonging to a path you aren't enrolled in
 * would be invisible on "My Learning Paths" — the one place the learner would
 * go looking for it.
 */
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
      section: { course: { learningPath: { status: "PUBLISHED" } } },
    },
    select: {
      id: true,
      section: {
        select: {
          course: {
            select: {
              id: true,
              title: true,
              learning_path_id: true,
              learningPath: { select: { slug: true } },
              /* `P1-J3-E048` — a Course has NO instructor column; the only expert
                 signal in the schema is `Lesson.expert_person_id`, so the course's
                 instructor is read from its own lessons. See the completion block. */
              sections: {
                select: { lessons: { select: { id: true, expert_person_id: true } } },
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

  const pathId = lesson.section.course.learning_path_id;
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

  /*
    ── ⚠⚠ FINISHING A COURSE NOTIFIES ITS INSTRUCTOR (`P1-J3-E048`, 2026-09-02) ─

    Scott: *"should it happen automatically for those who create courses? I think
    yes."* and *"When JOE completes my course, I want to know it. I might want to
    give him an at-a-boy… just build a relationship."* AUTOMATIC, NO OPT-IN, AND
    THE LEARNER IS NAMED — he named them himself.

    ⚠ THE EVENT ALREADY EXISTS. `learn.course_completed.learner` and `.instructor`
    are both in `notification-events.ts` from the notification run. This wires the
    TRIGGER; it does not invent a second event.

    ⚠ THE INSTRUCTOR IS RESOLVED FROM THE LESSONS, because `Course` HAS NO
    INSTRUCTOR COLUMN — the only expert signal in the schema is
    `Lesson.expert_person_id`. The course's instructor is the expert holding the
    most of its lessons; a course whose lessons name nobody produces NO ROW AND NO
    ERROR, exactly as briefed.

    ⚠ NEVER WHEN THE INSTRUCTOR IS THE LEARNER. Telling somebody they finished
    their own course is noise, and it is the first thing an instructor would
    notice being wrong.

    ⚠ `dedupeKey` ON (COURSE × LEARNER) so re-completing a lesson — an ordinary
    thing to do — cannot re-notify. ⚠ AND `notify()` NEVER THROWS INTO THIS
    HANDLER: a notification failure must not fail a lesson completion.
  */
  const course = lesson.section.course;
  const courseLessonIds = course.sections.flatMap((s) => s.lessons.map((l) => l.id));
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
          vars: { courseTitle: course.title, learnerName },
        });
      }
    }
  }

  return NextResponse.json({ ok: true, completed: true });
}
