import { NextResponse } from "next/server";
import { guardApi } from "@/lib/guard";
import { approveSettlement, SettlementError } from "@/lib/settlements";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await guardApi("authenticated");
  if (gate instanceof NextResponse) return gate;
  const { id } = await params;
  try {
    return NextResponse.json(await approveSettlement(gate, id));
  } catch (e) {
    if (e instanceof SettlementError) {
      const status = e.code === "NOT_FOUND" ? 404 : e.code === "FORBIDDEN" ? 403 : 400;
      return NextResponse.json({ error: e.message, code: e.code }, { status });
    }
    console.error("[settlements] approve failed:", e);
    return NextResponse.json({ error: "Could not approve that request" }, { status: 500 });
  }
}
