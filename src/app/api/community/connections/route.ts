import { NextResponse } from "next/server";
import { z } from "zod";
import { guardApi } from "@/lib/guard";
import {
  ConnectionError,
  acceptColleague,
  declineColleague,
  followMentor,
  requestColleague,
  unfollowMentor,
} from "@/lib/connections";

/**
 * POST /api/community/connections — the five relationship actions (`P1-ALL-E374`).
 *
 * ⚠⚠ THIS ROUTE DECIDES NOTHING. Every rule lives in `lib/connections.ts`, which
 * is where `check:community` can see it: who may accept, that a decline UPDATES
 * rather than deletes, that a MENTOR row is created ACCEPTED, and that nobody
 * connects to themselves. This file is transport — parse, delegate, map errors.
 * `E374`'s brief is explicit that a rule in a component or a route is a bug.
 *
 * ⚠⚠ THE ACTOR IS NEVER IN THE BODY. Every action takes the viewer from the
 * session and the lib resolves the owning user from it. There is no shape of
 * request that connects, accepts or declines AS SOMEBODY ELSE — the same
 * owner-scoped rule the forums route follows.
 *
 * ⚠ `accept` AND `decline` TAKE A CONNECTION ID, AND THAT IS NOT A HOLE. Both
 * lib calls scope their update to `{ id, to_user_id: me, status: "PENDING" }`,
 * so a guessed id belonging to somebody else's request matches zero rows and
 * throws NOT_FOUND. The id is a selector, never an authorisation.
 *
 * ── ⚠ WHY THERE IS NO CONFIRMATION STEP ANYWHERE ──────────────────────────
 *
 * `E374`: *"SINGLE-CLICK IS THE SPECIFICATION. No modal, no message box, no
 * confirmation step. Building a community must cost nothing."* Not even
 * `decline` gets one — a decline is reversible in the only way that matters
 * (the person can be found again through search), and DECLINED rows are kept
 * rather than deleted so nothing is destroyed by a mis-click.
 *
 * ⚠ AND THERE IS NO `invite` ACTION. Inviting a non-member is blocked on the
 * mail pipe (`E371`) and a dead invite makes a member think they vouched for
 * somebody who never heard. Not stubbed, deliberately.
 */
const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("colleague"), toUserId: z.string().uuid() }),
  z.object({ action: z.literal("mentor"), toUserId: z.string().uuid() }),
  z.object({ action: z.literal("unmentor"), toUserId: z.string().uuid() }),
  z.object({ action: z.literal("accept"), connectionId: z.string().uuid() }),
  z.object({ action: z.literal("decline"), connectionId: z.string().uuid() }),
]);

export async function POST(req: Request) {
  /* ⚠ `guardApi` RETURNS THE VIEWER OR THE REFUSAL, not a boolean — verified
     against `lib/guard.ts:47` rather than assumed. Narrowing on the response
     type is what makes the viewer non-null for the rest of this handler. */
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
    switch (b.action) {
      case "colleague": {
        const row = await requestColleague(viewer, b.toUserId);
        /* ⚠ THE STATUS IS RETURNED, NOT ASSUMED. `requestColleague` accepts a
           REVERSE pending request instead of duplicating it, so this can come
           back ACCEPTED rather than PENDING — the button has to read what
           actually happened, not what it expected. */
        return NextResponse.json({ ok: true, status: row.status });
      }
      case "mentor":
        await followMentor(viewer, b.toUserId);
        /* ⚠ ACCEPTED ON THE SPOT — a mentor connection needs no permission. */
        return NextResponse.json({ ok: true, status: "FOLLOWING" });
      case "unmentor":
        await unfollowMentor(viewer, b.toUserId);
        return NextResponse.json({ ok: true, status: null });
      case "accept":
        await acceptColleague(viewer, b.connectionId);
        return NextResponse.json({ ok: true, status: "ACCEPTED" });
      case "decline":
        await declineColleague(viewer, b.connectionId);
        /* ⚠ DECLINED, NOT DELETED. The row is kept so the same request cannot
           be re-sent forever — `check:community` asserts it. */
        return NextResponse.json({ ok: true, status: "DECLINED" });
    }
  } catch (e) {
    if (e instanceof ConnectionError) {
      /* ⚠ SELF IS A 400, NOT A 403. It is a malformed request, not a denied
         one — there is no permission that would let it through. */
      return NextResponse.json({ error: e.message, code: e.code }, { status: 400 });
    }
    throw e;
  }
}
