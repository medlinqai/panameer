import { NextResponse } from "next/server";
import { z } from "zod";
import { guardApi } from "@/lib/guard";
import {
  MAX_BODY,
  MessageError,
  listConversations,
  markRead,
  searchConversations,
  sendMessage,
} from "@/lib/messages";

const Body = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("send"),
    toUserId: z.string().uuid(),
    body: z.string().trim().min(1, "Write something first.").max(MAX_BODY),
  }),
  z.object({ action: z.literal("read"), otherUserId: z.string().uuid() }),
]);

export async function GET(req: Request) {
  const gate = await guardApi("authenticated");
  if (gate instanceof NextResponse) return gate;
  const q = new URL(req.url).searchParams.get("q");
  if (q !== null) return NextResponse.json({ matches: await searchConversations(gate, q) });
  const conversations = await listConversations(gate);
  return NextResponse.json({ conversations });
}

export async function POST(req: Request) {
  const gate = await guardApi("authenticated");
  if (gate instanceof NextResponse) return gate;
  const viewer = gate;

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Bad request." },
      { status: 400 }
    );
  }
  const b = parsed.data;

  try {
    if (b.action === "read") {
      await markRead(viewer, b.otherUserId);
      return NextResponse.json({ ok: true });
    }
    const row = await sendMessage(viewer, b.toUserId, b.body);
    return NextResponse.json({ ok: true, id: row.id });
  } catch (e) {
    if (e instanceof MessageError) {
      const status = e.code === "EMPTY" || e.code === "TOO_LONG" ? 400 : 403;
      return NextResponse.json({ error: e.message, code: e.code }, { status });
    }
    throw e;
  }
}
