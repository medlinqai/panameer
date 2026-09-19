import { NextResponse } from "next/server";
import { z } from "zod";
import { guardApi } from "@/lib/guard";
import {
  MAX_BODY,
  MessageError,
  listConversations,
  markRead,
  sendMessage,
} from "@/lib/messages";

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

/**
 * ── ⚠⚠ GET /api/messages — THE DRAWER'S CONVERSATION LIST (`P2-ALL-E560`) ────
 *
 * ⚠ THE DRAWER IS A CLIENT COMPONENT and `listConversations` is a server read,
 * so the drawer needs an endpoint. ⚠⚠ IT ADDS NO RULE OF ITS OWN — it calls the
 * SAME `listConversations` the `/messages` page calls, so the two surfaces
 * cannot drift into two different lists. One definition, two callers, which is
 * the rule `teachesPathWhere` exists to state.
 *
 * ⚠⚠ THE VIEWER IS THE SESSION, NEVER THE QUERY. There is no shape of request
 * that reads somebody else's conversations — `guardApi` resolves the viewer and
 * `listConversations` scopes every row to it.
 *
 * ⚠ `canMessage` IS NOT CONSULTED HERE AND MUST NOT BE. This lists conversations
 * that ALREADY EXIST; permission governs SENDING, which is POST's job. Gating a
 * read on it would hide a message somebody already received if the relationship
 * later changed — losing a real message from the list is worse than showing it.
 *
 * ⚠ `lastAt` IS SERIALISED AS AN ISO STRING by `NextResponse.json`. The client
 * parses it back; it must not assume a `Date` survives the wire.
 */
export async function GET() {
  const gate = await guardApi("authenticated");
  if (gate instanceof NextResponse) return gate;
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
      /* ⚠ 403 FOR A REFUSED PERMISSION, 400 FOR A MALFORMED BODY. A caller
         needs to tell "you may not" from "you sent nonsense". */
      const status = e.code === "EMPTY" || e.code === "TOO_LONG" ? 400 : 403;
      return NextResponse.json({ error: e.message, code: e.code }, { status });
    }
    throw e;
  }
}
