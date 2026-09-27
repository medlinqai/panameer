import { NextResponse } from "next/server";
import { z } from "zod";
import { TRANSACT_MESSAGE } from "@/lib/transact-message";
import { checkTransact, guardApi } from "@/lib/guard";
import { selectProvider } from "@/lib/selection";

/**
 * ── ⚠⚠⚠ POST /api/work-requests/[id]/select — TRANSITION ONE (`P2-A8-E684`) ─
 *
 * ⚠⚠ **`POSTED → ASSIGNED`**: the winning proposal's provider and **its rate**
 * go onto line 1, the bid becomes `AWARDED`, every other open bid becomes
 * `NOT_SELECTED`, and the buyer's proposal worklist items are resolved.
 * ⚠⚠⚠ **IT IS NOT THE ORDER.** Ruling 17 splits the two on purpose: selecting
 * moves to `ASSIGNED`, which `reverseSelection` can still undo; **ordering is
 * the second transition and is what makes it irreversible.**
 *
 * ⚠ **THE RATE COMES FROM THE PROPOSAL, AND A PROPOSAL WITHOUT ONE IS
 * REFUSED** — `selectProvider` throws `PROPOSAL_HAS_NO_RATE` rather than
 * falling back to the provider's advertised profile rate, *"which is what they
 * advertise — not what they proposed for this work."*
 * ⚠⚠ **NO MONEY MOVES.** No `Payment`, no `PAID`, no cut — this writes a
 * requisition line and four statuses.
 */
const bodySchema = z.object({ providerPersonId: z.string().uuid() }).strict();

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await guardApi("canHireTalent");
  if (gate instanceof NextResponse) return gate;
  const transact = await checkTransact(gate);
  if (!transact.ok) {
    return NextResponse.json(
      { error: TRANSACT_MESSAGE[transact.reason], code: transact.reason },
      { status: 403 }
    );
  }
  const { id } = await params;
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "That selection couldn't be read.", code: "BAD_BODY" }, { status: 400 });
  }
  try {
    return NextResponse.json(
      await selectProvider(gate, { workRequestId: id, providerPersonId: parsed.data.providerPersonId })
    );
  } catch (e) {
    if (e instanceof Error && e.name === "SourcingError") {
      const code = (e as Error & { code?: string }).code ?? "INVALID";
      const status = code === "NOT_FOUND" ? 404 : code === "NOT_BUYER" ? 403 : 400;
      return NextResponse.json({ error: e.message, code }, { status });
    }
    console.error("[selection] select failed:", e);
    return NextResponse.json({ error: "Could not select that provider." }, { status: 500 });
  }
}
