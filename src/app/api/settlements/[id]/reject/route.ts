import { NextResponse } from "next/server";
import { guardApi } from "@/lib/guard";
import { rejectSettlement, SettlementError } from "@/lib/settlements";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await guardApi("authenticated");
  if (gate instanceof NextResponse) return gate;
  const { id } = await params;
  const body = await request.json().catch(() => null);
  try {
    return NextResponse.json(await rejectSettlement(gate, id, body?.reason ?? ""));
  } catch (e) {
    if (e instanceof SettlementError) {
      const status = e.code === "NOT_FOUND" ? 404 : e.code === "FORBIDDEN" ? 403 : 400;
      return NextResponse.json({ error: e.message, code: e.code }, { status });
    }
    console.error("[settlements] reject failed:", e);
    return NextResponse.json({ error: "Could not reject that request" }, { status: 500 });
  }
}
