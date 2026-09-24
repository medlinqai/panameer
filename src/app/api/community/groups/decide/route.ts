import { NextResponse } from "next/server";
import { z } from "zod";
import { decideJoinRequest, GroupError } from "@/lib/group-membership";
import { guardApi } from "@/lib/guard";
import { getSessionViewer } from "@/lib/session";

/**
 * POST /api/community/groups/decide — answer a join request (`P2-A3-E619` WS-B).
 *
 * ⚠ THE BRIEF: *"people asking to join groups you run (approve or decline, and
 * they're told either way)."*
 *
 * ⚠⚠⚠ IT IS THE EXIT FOR A STATE THAT HAD NONE. Measured at the premise check:
 * `joinGroup` wrote `PENDING` and **nothing in the product could move that row**
 * — the only API took `join | leave`. ⚠ That is why `createGroup` shipped
 * `OPEN`-only in WS-A and accepts `REQUEST` only now.
 *
 * ── ⚠⚠ A SEPARATE ROUTE, FOR THE REASON `create` IS ONE ──────────────────
 *
 * ⚠ `/api/community/groups` is keyed on a `boardId`; a decision is keyed on the
 * **membership row**, because that is the thing being answered. Folding it in
 * would make both ids optional and weaken the validation on every action.
 *
 * ⚠⚠⚠ OWNER-SCOPED IN THE LIB, NOT HERE. `decideJoinRequest` resolves the
 * decider from the session and compares them against the board's host, so a
 * crafted `membershipId` for somebody else's group is refused at the writer
 * rather than by this route remembering to ask (load-bearing rule 5).
 */
export async function POST(request: Request) {
  const gate = await guardApi("authenticated");
  if (gate instanceof NextResponse) return gate;
  const viewer = await getSessionViewer();
  if (!viewer) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }

  const BODY = z.object({
    membershipId: z.string().uuid(),
    decision: z.enum(["approve", "decline"]),
  });
  const parsed = BODY.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "That isn't a valid request." }, { status: 400 });
  }

  try {
    const res = await decideJoinRequest(
      viewer.userId,
      parsed.data.membershipId,
      parsed.data.decision === "approve"
    );
    return NextResponse.json({ ok: true, state: res.state });
  } catch (err) {
    if (err instanceof GroupError) {
      /* ⚠⚠ 403 WHEN IT IS NOT YOUR GROUP, 409 OTHERWISE. The distinction is the
         one `joinGroup`'s route already draws: `NOT_OWNER` genuinely IS about
         the caller, so it earns a 403 — while "already answered" is about the
         row's state and is nobody's fault. */
      const status = err.code === "NOT_OWNER" ? 403 : 409;
      return NextResponse.json({ error: err.message, code: err.code }, { status });
    }
    throw err;
  }
}
