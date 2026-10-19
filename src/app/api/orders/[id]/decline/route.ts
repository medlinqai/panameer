import { NextResponse } from "next/server";
import { guardApi } from "@/lib/guard";
import { declineWorkOrder } from "@/lib/work-orders";

// WA-E004: the provider declines (with a reason) — the order is cancelled, the buyer is told, the Job reopens.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await guardApi("authenticated");
  if (gate instanceof NextResponse) return gate;
  const { reason } = ((await request.json().catch(() => ({}))) ?? {}) as { reason?: string };
  try {
    await declineWorkOrder(gate, (await params).id, reason?.slice(0, 1000) ?? null);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Error && e.name === "SourcingError") return NextResponse.json({ error: e.message }, { status: 400 });
    console.error("[orders] decline failed:", e);
    return NextResponse.json({ error: "Could not decline that order." }, { status: 500 });
  }
}
