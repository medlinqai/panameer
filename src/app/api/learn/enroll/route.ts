import { NextResponse } from "next/server";
import { z } from "zod";
import { notify } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { getSessionViewer } from "@/lib/session";

const BODY = z.object({
  pathId: z.string().uuid(),
  /** false = un-enroll. */
  enroll: z.boolean().default(true),
});

/**
 * POST /api/learn/enroll — free enrollment in a learning path.
 *
 * OWNER-SCOPED BY CONSTRUCTION: the user id comes from the session and is never
 * read from the body. The client sends which PATH to join and nothing about
 * WHO is joining, so there is no shape of request that enrolls someone else.
 *
 * Un-enrolling deletes the LearnEnrollment and deliberately leaves
 * LessonProgress alone. Those rows are a record of what someone watched, not a
 * property of the enrollment — deleting them would mean an accidental un-enroll
 * silently erased months of progress, and re-enrolling restores the picture
 * exactly.
 */
export async function POST(request: Request) {
  const viewer = await getSessionViewer();
  if (!viewer) {
    return NextResponse.json(
      { error: "Sign in to enroll — it's free and keeps your place." },
      { status: 401 }
    );
  }

  const parsed = BODY.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "That isn't a valid request." }, { status: 400 });
  }
  const { pathId, enroll } = parsed.data;

  const path = await prisma.learningPath.findFirst({
    where: { id: pathId, status: "PUBLISHED" },
    select: { id: true, title: true, slug: true },
  });
  if (!path) {
    return NextResponse.json({ error: "That learning path isn't available." }, { status: 404 });
  }

  if (!enroll) {
    await prisma.learnEnrollment.deleteMany({
      where: { user_id: viewer.userId, learning_path_id: pathId },
    });
    return NextResponse.json({ ok: true, enrolled: false });
  }

  // Idempotent: enrolling twice is a no-op, not a unique-constraint error.
  await prisma.learnEnrollment.upsert({
    where: {
      user_id_learning_path_id: { user_id: viewer.userId, learning_path_id: pathId },
    },
    create: { user_id: viewer.userId, learning_path_id: pathId },
    update: {},
  });

  /*
    ⚠ THE DUPLICATE-SIGNUP FIX SCOTT ASKED FOR ON THE LEARN WALK — *"add the
    prevent for duplicate sign up"*. The enrollment itself was already idempotent
    (the upsert above); the NOTIFICATION would not have been, so `dedupeKey` makes
    enrolling twice produce one row, not two.
    ⚠ `notify()` NEVER THROWS INTO THIS HANDLER — a failed notification must not
    fail an enrollment. It catches internally; no try/catch is needed here.
    ⚠ KEYED ON THE PERSON, NOT THE USER. Notifications address a `Person`.
  */
  const person = await prisma.person.findUnique({
    where: { user_id: viewer.userId },
    select: { id: true },
  });
  if (person) {
    await notify({
      event: "learn.path_enrolled",
      personId: person.id,
      entityType: "LearningPath",
      entityId: path.id,
      dedupeKey: `learn.path_enrolled:${path.id}`,
      vars: { pathTitle: path.title, pathSlug: path.slug },
    });
  }
  return NextResponse.json({ ok: true, enrolled: true });
}
