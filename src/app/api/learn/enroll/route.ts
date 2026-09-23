import { NextResponse } from "next/server";
import { pathHasPlayableLessons, pathIsOpenTo } from "@/lib/learn";
import { z } from "zod";
import { notify } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { getSessionViewer } from "@/lib/session";
import { gapSentence, learnGaps } from "@/lib/gate-reads";

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

  /*
    ── ⚠⚠ THE `LEARN` GATE (`P1-ALL-E034`) ────────────────────────────────────

    **A field is required by the NEXT THING THE PLATFORM MUST DO FOR YOU.**
    Enrolling means the platform starts keeping your place and telling you about
    courses — and `learn.course_published` is addressed to *"every provider whose
    skills match the course's tags"*, so with no skill that broadcast can never
    reach you. That is the member-interest reason, and it is why a SKILL is in
    this set and a company is not.

    ⚠ SERVER-SIDE, AND THIS IS THE BOUNDARY. The button mirrors it.
    ⚠ BROWSING, READING AND WATCHING ARE UNTOUCHED — Learn is the top of the
    funnel and gating discovery costs the audience for everything downstream.
  */
  const gaps = await learnGaps(viewer.userId);
  if (gaps.length > 0) {
    return NextResponse.json(
      { error: gapSentence(gaps), code: "IDENTITY_REQUIRED", fields: gaps },
      { status: 403 }
    );
  }


  const path = await prisma.learningPath.findFirst({
    where: { id: pathId, status: "PUBLISHED" },
    /* ⚠ THE LESSON ROWS COME BACK SO `pathHasPlayableLessons` CAN BE ASKED —
       the same helper discovery uses, not a second query shaped like it. */
    select: {
      id: true,
      title: true,
      slug: true,
      courses: {
        select: {
          sections: {
            select: { lessons: { select: { vimeo_ref: true, production_status: true } } },
          },
        },
      },
    },
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

  /*
    ── ⚠⚠⚠ YOU CANNOT ENROL IN A PATH YOU CANNOT START (`P2-A4-E608`) ────────

    ⚠ SCOTT, 2026-09-23: *"The enrolment clause in `pathIsOpenTo` exists to
    protect someone who enrolled BEFORE the videos went missing — not to admit
    new members. Enrolling in a path you cannot start is a dead end, and
    enrolment then becomes the thing that keeps it open to you."*

    ⚠⚠ SO THE SECOND ARGUMENT IS `false`, DELIBERATELY. It is not a mistake and
    it is not shorthand for "ignore that clause": it is the statement that **a
    new enrolment does not get to count itself as the reason it is allowed.**
    Passing `true` here would make the rule circular — enrol, therefore
    enrollable.

    ⚠ IT SITS AFTER THE UN-ENROL BRANCH. Somebody already enrolled in a path
    whose videos vanished must still be able to LEAVE it; blocking that would
    trap them in exactly the dead end this prevents.
    ⚠ `pathIsOpenTo` AND `pathHasPlayableLessons` ARE BOTH IMPORTED. The
    condition is not restated here — a hand-rolled copy agrees until the rule
    changes, which is what cost two gates at `E603`.

    ⚠ MEASURED 2026-09-23: **11 of 23 published paths are in this state**, every
    one because not a single lesson has a `vimeo_ref`.
  */
  if (!pathIsOpenTo(pathHasPlayableLessons(path), false)) {
    return NextResponse.json(
      {
        error:
          "That path has no videos yet, so there is nothing to start. You can still read its outline.",
        code: "PATH_NOT_READY",
      },
      { status: 409 }
    );
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
