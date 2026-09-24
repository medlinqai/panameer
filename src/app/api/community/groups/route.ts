import { NextResponse } from "next/server";
import { z } from "zod";
import { GroupError, joinGroup } from "@/lib/group-membership";
import { guardApi } from "@/lib/guard";
import { getSessionViewer } from "@/lib/session";

const BODY = z.object({
  boardId: z.string().uuid(),
  action: z.enum(["join", "leave"]),
});

/**
 * POST /api/community/groups — join, ask to join, or leave (`P2-A3-E612`).
 *
 * ⚠⚠ OWNER-SCOPED: the person is resolved from the session, never from the body.
 *
 * ⚠⚠⚠ IT MOVES NO MONEY AND OFFERS NO PURCHASE. A priced group is refused with
 * `NOT_PURCHASABLE` and the sentence names the MECHANISM, not the member:
 * nothing can be bought yet because no `Payment` row is ever created anywhere in
 * the codebase. ⚠ Buying happens in Shop, when Shop can sell.
 *
 * ⚠ THE TYPE RULES ARE ENFORCED IN THE LIB, NOT HERE. A page that does not
 * render a Join control is not a boundary; `joinGroup` is.
 */
export async function POST(request: Request) {
  const gate = await guardApi("authenticated");
  if (gate instanceof NextResponse) return gate;
  const viewer = await getSessionViewer();
  if (!viewer) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }

  const parsed = BODY.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "That isn't a valid request." }, { status: 400 });
  }
  const { boardId, action } = parsed.data;

  try {
    const res = await joinGroup(viewer.userId, boardId, action === "leave");
    return NextResponse.json({ ok: true, state: res.state });
  } catch (err) {
    if (err instanceof GroupError) {
      /* ⚠ THE REFUSAL CARRIES ITS REASON, so the page can explain rather than
         just failing. ⚠⚠ 409, not 403: nothing about the MEMBER is wrong. */
      return NextResponse.json({ error: err.message, code: err.code }, { status: 409 });
    }
    throw err;
  }
}
