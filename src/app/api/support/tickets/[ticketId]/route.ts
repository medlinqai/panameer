import { NextResponse } from "next/server";
import { guardApi } from "@/lib/guard";
import { updateTicket, SupportError } from "@/lib/support";

/**
 * PATCH /api/support/tickets/[ticketId] — triage (`P2-J1.1-E032` WS-4).
 *
 * ⚠ `canAdminister`, NOT `authenticated`. Status, priority, assignment and the
 * resolution are the ADMIN's half of the ticket; a reporter changes their own
 * ticket by replying to it, which is what the messages route is for.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ ticketId: string }> }
) {
  const gate = await guardApi("canAdminister");
  if (gate instanceof NextResponse) return gate;

  const { ticketId } = await params;
  const body = await request.json().catch(() => ({}));

  try {
    await updateTicket(gate, ticketId, {
      status: typeof body?.status === "string" ? body.status : undefined,
      priority: typeof body?.priority === "string" ? body.priority : undefined,
      assignToSelf: body?.assignToSelf === true,
      unassign: body?.unassign === true,
      resolution: typeof body?.resolution === "string" ? body.resolution : undefined,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof SupportError) {
      return NextResponse.json(
        { error: e.message, code: e.code },
        { status: e.code === "NOT_FOUND" ? 404 : 400 }
      );
    }
    console.error("[support] update failed:", e);
    return NextResponse.json({ error: "Could not update that ticket" }, { status: 500 });
  }
}
