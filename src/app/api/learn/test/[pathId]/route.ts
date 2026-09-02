import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionViewer } from "@/lib/session";
import { gapSentence, learnGaps } from "@/lib/gate-reads";
import {
  AssessmentNotReady,
  getPublishedAssessment,
  getTestState,
  gradeAttempt,
  readQuestions,
  toPublicQuestions,
} from "@/lib/learn-assessment";

/**
 * ⚠⚠ `LEARN` IS THE ONLY BAR ON SITTING A TEST (`P1-ALL-E034`). There is NO
 * COMPLETION GATE and Scott wants none: *"I want to allow every panameerian to
 * take the certification without having taken the courses."* Nothing here reads
 * `LessonProgress`, and nothing may start to.
 *
 * GET  /api/learn/test/[pathId] — the question set, WITHOUT the answers.
 * POST /api/learn/test/[pathId] — submit answers, get graded, maybe get a badge.
 *
 * The answer key never leaves the server: GET strips correctIndex, POST takes
 * only the learner's choices and compares against the stored set here. Anything
 * else makes the test decorative, and this one issues a credential that goes on
 * a professional profile.
 *
 * ── ⚠ BOTH VERBS REFUSE A DRAFT (brief_learn_assessments_generate WS4) ────────
 *
 * A generated set nobody has read must not award a certificate, so GET does not
 * serve its questions and POST does not grade against it. 409, not 500: "still
 * being reviewed" is a state of the world, and a 500 would put it in the error
 * log as a fault every time a learner clicked.
 *
 * ⚠ GET ALSO NO LONGER GENERATES. It used to call `getOrCreateAssessment`, so a
 * learner clicking Take the test could trigger a model call — which under the
 * review gate would spend money to produce something the same request then
 * refuses. Generation is the admin trigger and the batch script; this is a read.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ pathId: string }> }
) {
  const viewer = await getSessionViewer();
  if (!viewer) {
    return NextResponse.json({ error: "Sign in to take the test." }, { status: 401 });
  }
  const { pathId } = await params;

  const path = await prisma.learningPath.findFirst({
    where: { id: pathId, status: "PUBLISHED" },
    select: { id: true },
  });
  if (!path) {
    return NextResponse.json({ error: "That path isn't available." }, { status: 404 });
  }

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

  try {
    const assessment = await getPublishedAssessment(pathId);
    const state = await getTestState(viewer.userId, pathId);
    return NextResponse.json({
      ...state,
      questions: toPublicQuestions(readQuestions(assessment)),
    });
  } catch (e) {
    /* Not ready is not an outage. No console.error, no 5xx, no questions. */
    if (e instanceof AssessmentNotReady) {
      return NextResponse.json({ error: e.message, kind: e.kind }, { status: 409 });
    }
    console.error("[learn-test] load failed:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Could not load the test." },
      { status: 503 }
    );
  }
}

const SUBMIT = z.object({
  /** questionId → chosen option index. */
  answers: z.record(z.string(), z.number().int().min(0)),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ pathId: string }> }
) {
  const viewer = await getSessionViewer();
  if (!viewer) {
    return NextResponse.json({ error: "Sign in to take the test." }, { status: 401 });
  }
  const { pathId } = await params;

  const parsed = SUBMIT.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "That isn't a valid submission." }, { status: 400 });
  }

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

  try {
    return NextResponse.json(await gradeAttempt(viewer.userId, pathId, parsed.data.answers));
  } catch (e) {
    if (e instanceof AssessmentNotReady) {
      return NextResponse.json({ error: e.message, kind: e.kind }, { status: 409 });
    }
    console.error("[learn-test] grade failed:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Could not grade that attempt." },
      { status: 409 }
    );
  }
}
