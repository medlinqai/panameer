import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { setPathInterest } from "@/lib/path-interest";
import { getSessionViewer } from "@/lib/session";

const BODY = z.object({
  pathId: z.string().uuid(),
  /** false = withdraw. ⚠ The row survives either way. */
  wanted: z.boolean().default(true),
});

/**
 * POST /api/learn/interest — "I Want This One" (`P2-A4-E611` WS-C).
 *
 * ⚠ OWNER-SCOPED BY CONSTRUCTION: the user id comes from the session and is
 * never read from the body. The client sends which PATH, never who is asking.
 *
 * ── ⚠⚠⚠ SIGNED-OUT MEMBERS GET NOTHING, AND THAT IS A RULING ─────────────
 *
 * ⚠⚠ SCOTT, 2026-09-23: *"Do not build an anonymous counter without ruling — a
 * count anybody can inflate is worse than no count."*
 * ⚠ So this refuses with 401 and the page shows a sign-in prompt instead of a
 * button. **The count this feeds is a production decision with real hours
 * behind it; a figure anyone can press repeatedly is not evidence.**
 *
 * ⚠⚠ THIS IS NOT THE ENROLMENT DOOR AND MUST NOT BECOME ONE. It writes
 * `PathInterest` and nothing else — no `LearnEnrollment`, so it grants no forum
 * membership and `check:learn-enrol` has nothing to say about it. ⚠ Wanting a
 * path that does not exist yet is the opposite of joining one.
 */
export async function POST(request: Request) {
  const viewer = await getSessionViewer();
  if (!viewer) {
    return NextResponse.json(
      { error: "Sign in to tell us you want this one." },
      { status: 401 }
    );
  }

  const parsed = BODY.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "That isn't a valid request." }, { status: 400 });
  }
  const { pathId, wanted } = parsed.data;

  /* ⚠ The path has to be real and published. ⚠⚠ NO PLAYABILITY CHECK — the
     whole point is to ask for a path that has nothing to watch yet. */
  const path = await prisma.learningPath.findFirst({
    where: { id: pathId, status: "PUBLISHED" },
    select: { id: true },
  });
  if (!path) {
    return NextResponse.json({ error: "That learning path isn't available." }, { status: 404 });
  }

  await setPathInterest(viewer.userId, pathId, wanted);

  const count = await prisma.pathInterest.count({
    where: { learning_path_id: pathId, wanted: true },
  });
  return NextResponse.json({ ok: true, wanted, count });
}
