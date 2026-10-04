import { NextResponse } from "next/server";
import { guardApi } from "@/lib/guard";
import { acceptOrder, OrderError } from "@/lib/orders";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await guardApi("authenticated");
  if (gate instanceof NextResponse) return gate;
  const { id } = await params;
  try {
    return NextResponse.json(await acceptOrder(gate, id));
  } catch (e) {
    if (e instanceof OrderError) {
      const status = e.code === "NOT_FOUND" ? 404 : e.code === "FORBIDDEN" ? 403 : 400;
      return NextResponse.json({ error: e.message, code: e.code }, { status });
    }
    console.error("[orders] accept failed:", e);
    return NextResponse.json({ error: "Could not accept that order" }, { status: 500 });
  }
}
