import { NextResponse } from "next/server";
import { guardApi } from "@/lib/guard";
import { createSettlement, SettlementError } from "@/lib/settlements";

export async function POST(request: Request) {
  const gate = await guardApi("authenticated");
  if (gate instanceof NextResponse) return gate;
  const body = await request.json().catch(() => null);
  if (!body?.orderId)
    return NextResponse.json({ error: "Which work order?" }, { status: 400 });
  try {
    return NextResponse.json(
      await createSettlement(gate, body.orderId, {
        periodStart: body.periodStart,
        periodEnd: body.periodEnd,
        lines: Array.isArray(body.lines) ? body.lines : [],
        resubmitsId: typeof body.resubmitsId === "string" ? body.resubmitsId : null,
      })
    );
  } catch (e) {
    if (e instanceof SettlementError) {
      const status = e.code === "NOT_FOUND" ? 404 : e.code === "FORBIDDEN" ? 403 : 400;
      return NextResponse.json({ error: e.message, code: e.code }, { status });
    }
    if (e instanceof Error && (e.name === "SpineError" || e.name === "OrderError"))
      return NextResponse.json({ error: e.message, code: "INVALID" }, { status: 400 });
    console.error("[settlements] create failed:", e);
    return NextResponse.json({ error: "Could not raise that payment request" }, { status: 500 });
  }
}
