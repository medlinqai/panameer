import { NextResponse } from "next/server";
import { guardApi } from "@/lib/guard";
import { ReviewError, submitReview } from "@/lib/order-reviews";

// OR-E002: submit or edit this side's Order Review (owner-scoped from the session).
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await guardApi("authenticated");
  if (gate instanceof NextResponse) return gate;
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  try {
    await submitReview(gate, id, body);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof ReviewError) return NextResponse.json({ error: e.message }, { status: 400 });
    console.error("[order-review] submit failed:", e);
    return NextResponse.json({ error: "Couldn't save your review — try again." }, { status: 500 });
  }
}
