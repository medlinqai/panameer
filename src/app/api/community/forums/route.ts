import { NextResponse } from "next/server";
import { z } from "zod";
import { guardApi } from "@/lib/guard";
import { ForumError, createPost, createThread, markHelpful, unmarkHelpful } from "@/lib/forums";

/**
 * POST /api/community/forums — start a thread or reply to one (WS2-C).
 *
 * ⚠ `guardApi("authenticated")` IS STILL THE ONLY CAPABILITY, AND DELIBERATELY SO
 * (`P1-ALL-E033`). Requiring name, photo and job title before writing is a
 * PROFILE-COMPLETENESS check, not a role; modelling it as a capability would put
 * a mutable data question into the permission system. The check lives in
 * `lib/forums.ts`, which is the boundary for all four actions.
 * ⚠ AND IT GATES WRITING ONLY. `helpful`/`unhelpful` pass through ungated —
 * marking an answer helpful is a reader's act and it is the signal the board
 * runs on.
 *
 * One route, four actions. AUTHORSHIP IS NEVER IN THE BODY: the lib resolves the
 * poster from the session, so there is no shape of request that posts as
 * somebody else.
 *
 * ⚠ `helpful` / `unhelpful` CARRY NO ACTOR EITHER (brief_community_signal WS1).
 * Only the thread's author may mark a reply helpful, and never their own — both
 * checked in `lib/forums.ts` against the SESSION on every call. The thread page
 * hides the button for everyone else, and that hiding is cosmetic: a hidden
 * control is not a permission, so the refusal has to live server-side and be
 * testable by calling this route directly.
 */
const Body = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("thread"),
    boardSlug: z.string().min(1),
    title: z.string().trim().min(5, "Give the question a title people can scan.").max(200),
    body: z.string().trim().min(15, "Add a bit more detail so someone can answer.").max(8000),
  }),
  z.object({
    action: z.literal("reply"),
    threadId: z.string().uuid(),
    body: z.string().trim().min(2, "Say something first.").max(8000),
  }),
  /*
    ⚠ NO `personId`, DELIBERATELY. The only thing a caller may name is WHICH
    REPLY; who is marking it is the session's business.
  */
  z.object({ action: z.literal("helpful"), postId: z.string().uuid() }),
  z.object({ action: z.literal("unhelpful"), postId: z.string().uuid() }),
]);

export async function POST(request: Request) {
  const gate = await guardApi("authenticated");
  if (gate instanceof NextResponse) return gate;

  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Check the form." },
      { status: 400 }
    );
  }

  try {
    const d = parsed.data;
    if (d.action === "helpful" || d.action === "unhelpful") {
      const r =
        d.action === "helpful"
          ? await markHelpful(gate, d.postId)
          : await unmarkHelpful(gate, d.postId);
      return NextResponse.json({ ok: true, id: r.id, markedHelpfulAt: r.markedHelpfulAt });
    }
    const result =
      d.action === "thread" ? await createThread(gate, d) : await createPost(gate, d);
    return NextResponse.json({ ok: true, id: result.id });
  } catch (e) {
    if (e instanceof ForumError) {
      /*
        ⚠ `fields` TRAVELS WITH THE REFUSAL (`P1-ALL-E033`). Without it the
        composer can only say "complete your profile", which is the exact
        non-answer the brief forbids — the named field, its reason and its link
        all come from the server so the UI cannot paraphrase them into something
        vaguer.
      */
      return NextResponse.json(
        { error: e.message, code: e.code, ...(e.fields ? { fields: e.fields } : {}) },
        { status: 400 }
      );
    }
    console.error("[forums] write failed:", e);
    return NextResponse.json(
      { error: "We couldn't post that. Please try again." },
      { status: 500 }
    );
  }
}
