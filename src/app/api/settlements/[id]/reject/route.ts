import { NextResponse } from "next/server";
import { guardApi } from "@/lib/guard";
import { rejectSettlement, SettlementError } from "@/lib/settlements";

/**
 * POST /api/settlements/[id]/reject — the BUYER rejects, WITH A REASON
 * (`P1-J4-E394` WS-3).
 *
 * ⚠⚠ THE REASON IS REQUIRED HERE, NOT ONLY IN THE FORM. `E388`: *"a rejection
 * with no stated reason is unanswerable"* — the provider's only next move would
 * be to guess what to change. A required attribute in a form is a convention;
 * this is the rule, and `rejectSettlement` refuses without one.
 */
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
