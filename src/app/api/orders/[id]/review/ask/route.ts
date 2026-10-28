import { NextResponse } from "next/server";
import { guardApi } from "@/lib/guard";
import { askBuyerForRecommendation, ReviewError } from "@/lib/order-reviews";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await guardApi("authenticated");
  if (gate instanceof NextResponse) return gate;
  const { id } = await params;
  try {
    await askBuyerForRecommendation(gate, id, request.headers.get("origin"));
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof ReviewError) return NextResponse.json({ error: e.message }, { status: 400 });
    console.error("[order-review] ask failed:", e);
    return NextResponse.json({ error: "Couldn't send that — try again." }, { status: 500 });
  }
}
