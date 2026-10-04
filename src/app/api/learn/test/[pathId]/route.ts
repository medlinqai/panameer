import { NextResponse } from "next/server";
import { pathHasPlayableLessons, pathIsOpenTo } from "@/lib/learn";
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

async function notReadyResponse(pathId: string): Promise<NextResponse | null> {
  const path = await prisma.learningPath.findFirst({
    where: { id: pathId, status: "PUBLISHED" },
    select: {
      courses: {
        select: {
          sections: {
            select: { lessons: { select: { vimeo_ref: true, production_status: true } } },
          },
        },
      },
    },
  });
  if (!path) return null; 
  if (pathIsOpenTo(pathHasPlayableLessons(path), false)) return null;
  return NextResponse.json(
    {
      error: "That path has no videos yet, so there is no test to take.",
      code: "PATH_NOT_READY",
    },
    { status: 409 }
  );
}

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
  const notReadyGet = await notReadyResponse(pathId);
  if (notReadyGet) return notReadyGet;

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

  const notReadyPost = await notReadyResponse(pathId);
  if (notReadyPost) return notReadyPost;

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
