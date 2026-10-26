import { NextResponse } from "next/server";
import { guardApi } from "@/lib/guard";
import { declineMyRequest, stillWaiting } from "@/lib/request-approval";

// JR-E004: the buyer's Request — Still Waiting (resets the 60-day PO clock once) or It Was Declined (with a reason).
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await guardApi("canHireTalent");
  if (gate instanceof NextResponse) return gate;
  const { id } = await params;
  const b = (await request.json().catch(() => ({}))) as { action?: string; reason?: string };
  try {
    if (b.action === "still-waiting") await stillWaiting(gate, id);
    else if (b.action === "decline") await declineMyRequest(gate, id, String(b.reason ?? ""));
    else return NextResponse.json({ error: "Unknown action." }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "That didn't work." }, { status: 400 });
  }
}
