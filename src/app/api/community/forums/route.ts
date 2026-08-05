import { NextResponse } from "next/server";
import { z } from "zod";
import { guardApi } from "@/lib/guard";
import { ForumError, createPost, createThread } from "@/lib/forums";

/**
 * POST /api/community/forums — start a thread or reply to one (WS2-C).
 *
 * One route, two actions. AUTHORSHIP IS NEVER IN THE BODY: the lib resolves the
 * poster from the session, so there is no shape of request that posts as
 * somebody else.
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
    const result =
      parsed.data.action === "thread"
        ? await createThread(gate, parsed.data)
        : await createPost(gate, parsed.data);
    return NextResponse.json({ ok: true, id: result.id });
  } catch (e) {
    if (e instanceof ForumError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    console.error("[forums] write failed:", e);
    return NextResponse.json(
      { error: "We couldn't post that. Please try again." },
      { status: 500 }
    );
  }
}
