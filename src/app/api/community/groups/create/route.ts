import { NextResponse } from "next/server";
import { z } from "zod";
import { createGroup, GroupError } from "@/lib/group-membership";
import { guardApi } from "@/lib/guard";
import { getSessionViewer } from "@/lib/session";

/**
 * POST /api/community/groups/create — start a group (`P2-A3-E619` WS-A).
 *
 * ⚠ SCOTT, RULING 2, 2026-09-22: *"Anyone can start a group."* ⚠⚠ Ruling 12
 * confirmed the schema already allowed it; the premise check found **no writer
 * anywhere**, so this route and `createGroup` are that mechanism.
 *
 * ── ⚠⚠⚠ IT IS A SEPARATE ROUTE, NOT A THIRD `action` ─────────────────────
 *
 * ⚠ `/api/community/groups` takes `{ boardId, action: join | leave }` — every
 * one of its actions is **about a board that already exists**, and its Zod
 * schema requires a `boardId` uuid. ⚠⚠ A `create` action would have to make
 * that field optional, which weakens the validation on the two actions that
 * genuinely need it. **One shape per route beats one route with a hole in it.**
 *
 * ⚠⚠ OWNER-SCOPED, LIKE EVERY WRITE: the host is resolved from the SESSION and
 * never accepted from the body (load-bearing rule 5). A client cannot create a
 * group owned by somebody else.
 *
 * ⚠⚠⚠ NO PRICE IS ACCEPTED, AND THAT IS NOT AN OMISSION. `price_cents` exists
 * on the model, but **no `Payment` row is created anywhere in the codebase and
 * `PAID` is never written** — so a route that accepted a price would let a
 * member advertise a charge nothing can collect. ⚠ Pricing a group is the
 * mentor rail's own work, and it is out of scope here by the brief.
 */
export async function POST(request: Request) {
  const gate = await guardApi("authenticated");
  if (gate instanceof NextResponse) return gate;
  const viewer = await getSessionViewer();
  if (!viewer) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }

  const BODY = z.object({
    title: z.string().min(1).max(200),
    description: z.string().max(400).optional(),
  });
  const parsed = BODY.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "That isn't a valid request." }, { status: 400 });
  }

  try {
    const { slug } = await createGroup(viewer.userId, parsed.data);
    return NextResponse.json({ ok: true, slug });
  } catch (err) {
    if (err instanceof GroupError) {
      /* ⚠ THE REFUSAL CARRIES ITS REASON so the form can say what to change.
         ⚠⚠ 400 here, not 409: a name too short IS something about the request,
         which is the opposite of the join route's case. */
      return NextResponse.json({ error: err.message, code: err.code }, { status: 400 });
    }
    throw err;
  }
}
