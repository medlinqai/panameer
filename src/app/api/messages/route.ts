import { NextResponse } from "next/server";
import { z } from "zod";
import { guardApi } from "@/lib/guard";
import { MAX_BODY, MessageError, markRead, sendMessage } from "@/lib/messages";

/**
 * POST /api/messages — send, and mark a conversation read (`P1-ALL-E379`).
 *
 * ⚠⚠ THIS ROUTE DECIDES NOTHING. Every rule is in `lib/messages.ts` where
 * `check:messages` can see it: who may message whom, that a MENTOR connection
 * grants nothing, that `available_for_messages` overrides an accepted
 * colleague, and that only a recipient marks a row read.
 *
 * ⚠ THE SENDER IS THE SESSION, NEVER THE PAYLOAD. There is no shape of request
 * that sends as somebody else or marks somebody else's rows read.
 *
 * ⚠ `sendMessage` RE-CHECKS THE PERMISSION even though the composer already
 * asked `canMessage` — a UI that hides the box is not a permission, and this
 * endpoint is reachable with curl.
 */
const Body = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("send"),
    toUserId: z.string().uuid(),
    body: z.string().trim().min(1, "Write something first.").max(MAX_BODY),
  }),
  z.object({ action: z.literal("read"), otherUserId: z.string().uuid() }),
]);

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
      /* ⚠ 403 FOR A REFUSED PERMISSION, 400 FOR A MALFORMED BODY. A caller
         needs to tell "you may not" from "you sent nonsense". */
      const status = e.code === "EMPTY" || e.code === "TOO_LONG" ? 400 : 403;
      return NextResponse.json({ error: e.message, code: e.code }, { status });
    }
    throw e;
  }
}
