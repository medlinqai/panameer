import { NextResponse } from "next/server";
import { z } from "zod";
import { ensureEnrolmentMembership, removeEnrolmentMembership } from "@/lib/group-membership";
import { learnEnrolmentRefusal } from "@/lib/learn-enrolment-gate";
import { notify } from "@/lib/notifications";
import { notifyInstructorEnrolled } from "@/lib/learn-instructor";
import { prisma } from "@/lib/prisma";
import { getSessionViewer } from "@/lib/session";

const BODY = z.object({
  pathId: z.string().uuid(),
  /** false = un-enroll. */
  enroll: z.boolean().default(true),
});

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
    select: {
      id: true,
      title: true,
      slug: true,
    },
  });
  if (!path) {
    return NextResponse.json({ error: "That learning path isn't available." }, { status: 404 });
  }

  if (!enroll) {
    await prisma.learnEnrollment.deleteMany({
      where: { user_id: viewer.userId, learning_path_id: pathId },
    });
    await removeEnrolmentMembership(viewer.userId, pathId);
    return NextResponse.json({ ok: true, enrolled: false });
  }

  const refusal = await learnEnrolmentRefusal(viewer.userId, pathId);
  if (refusal) {
    const { status, ...body } = refusal;
    return NextResponse.json(body, { status });
  }

  // Idempotent: enrolling twice is a no-op, not a unique-constraint error.
  await prisma.learnEnrollment.upsert({
    where: {
      user_id_learning_path_id: { user_id: viewer.userId, learning_path_id: pathId },
    },
    create: { user_id: viewer.userId, learning_path_id: pathId },
    update: {},
  });
  await ensureEnrolmentMembership(viewer.userId, pathId);

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
  await notifyInstructorEnrolled(viewer.userId, path.id);
  return NextResponse.json({ ok: true, enrolled: true });
}
