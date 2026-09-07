import { NextResponse } from "next/server";
import { guardApi } from "@/lib/guard";
import { postMessage, SupportError } from "@/lib/support";
import { canAdminister } from "@/lib/access";

/**
 * POST /api/support/tickets/[ticketId]/messages — reply on a ticket
 * (`P2-J1.1-E032` WS-4).
 *
 * ⚠⚠ REPLY IS THE HALF THAT MAKES THIS A TICKETING SYSTEM RATHER THAN A
 * SUGGESTION BOX. Scott chose "report + reply thread" explicitly.
 *
 * ⚠⚠ ONE ROUTE FOR BOTH SIDES, AND `author_side` IS DECIDED BY CAPABILITY, NEVER
 * BY THE BODY. An admin's reply is always `panameer`; anyone else's is always
 * `user`, and `postMessage` additionally refuses a `user` post on somebody
 * else's ticket. If the side came from the request, the thread's record of who
 * said what would be client-controlled — which would make it evidence of
 * nothing, on the one surface whose whole job is being a record.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ ticketId: string }> }
) {
  const gate = await guardApi("authenticated");
  if (gate instanceof NextResponse) return gate;
  const viewer = gate;

  const { ticketId } = await params;
  const body = await request.json().catch(() => null);
  const text = typeof body?.body === "string" ? body.body : "";

  try {
    await postMessage(viewer, ticketId, text, canAdminister(viewer) ? "panameer" : "user");
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof SupportError) {
      const status = e.code === "NOT_FOUND" ? 404 : e.code === "FORBIDDEN" ? 403 : 400;
      return NextResponse.json({ error: e.message, code: e.code }, { status });
    }
    console.error("[support] reply failed:", e);
    return NextResponse.json({ error: "Could not post that reply" }, { status: 500 });
  }
}
