import { NextResponse } from "next/server";
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
      section: { select: { course: { select: { learning_path_id: true } } } },
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

  return NextResponse.json({ ok: true, completed: true });
}
