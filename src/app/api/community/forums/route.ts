import { NextResponse } from "next/server";
import { z } from "zod";
import { guardApi } from "@/lib/guard";
import {
  ForumError,
  confirmAnswer,
  createPost,
  createThread,
  markHelpful,
  unconfirmAnswer,
  unmarkHelpful,
} from "@/lib/forums";

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
  z.object({ action: z.literal("helpful"), postId: z.string().uuid() }),
  z.object({ action: z.literal("unhelpful"), postId: z.string().uuid() }),
  z.object({ action: z.literal("confirm"), postId: z.string().uuid() }),
  z.object({ action: z.literal("unconfirm"), postId: z.string().uuid() }),
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
    if (d.action === "confirm" || d.action === "unconfirm") {
      const r =
        d.action === "confirm"
          ? await confirmAnswer(gate, d.postId)
          : await unconfirmAnswer(gate, d.postId);
      return NextResponse.json({
        ok: true,
        id: r.id,
        instructorConfirmedAt: r.instructorConfirmedAt,
      });
    }
    const result =
      d.action === "thread" ? await createThread(gate, d) : await createPost(gate, d);
    return NextResponse.json({ ok: true, id: result.id });
  } catch (e) {
    if (e instanceof ForumError) {
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
