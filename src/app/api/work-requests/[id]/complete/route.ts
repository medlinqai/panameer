import { NextResponse } from "next/server";
import { TRANSACT_MESSAGE } from "@/lib/transact-message";
import { checkTransact, guardApi } from "@/lib/guard";
import { WorkRequestError } from "@/lib/work-request";
import { completeWorkRequest } from "@/lib/work-request-lines";

/**
 * POST /api/work-requests/[id]/complete (`P1-J4-E392` WS-2).
 *
 * ⚠⚠ THIS IS THE COMPLETE GATE'S BOUNDARY. The detail page greys its button out
 * of `completenessFor`; this route REFUSES out of the same function, so a client
 * that skipped the page cannot complete a half-sourced request. **The refusal it
 * returns is word for word what the page was already showing** — one function,
 * one sentence, two readers.
 */
export async function POST(
  _request: Request,
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
  try {
    return NextResponse.json(await completeWorkRequest(gate, id));
  } catch (e) {
    if (e instanceof WorkRequestError) {
      const status = e.code === "NOT_A_BUYER" ? 403 : e.code === "NOT_FOUND" ? 404 : 400;
      return NextResponse.json({ error: e.message, code: e.code }, { status });
    }
    console.error("[work-request] complete failed:", e);
    return NextResponse.json({ error: "Could not complete that request" }, { status: 500 });
  }
}
