import { NextResponse } from "next/server";
import { guardApi } from "@/lib/guard";
import { OrderError, requestOrderChanges } from "@/lib/orders";

// WA-E003: the buyer asks for changes before accepting — the Work Request reopens.
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await guardApi("authenticated");
  if (gate instanceof NextResponse) return gate;
  try {
    return NextResponse.json(await requestOrderChanges(gate, (await params).id));
  } catch (e) {
    if (e instanceof OrderError) return NextResponse.json({ error: e.message }, { status: e.code === "NOT_FOUND" ? 404 : 400 });
    console.error("[orders] request changes failed:", e);
    return NextResponse.json({ error: "Could not reopen that Work Request." }, { status: 500 });
  }
}
