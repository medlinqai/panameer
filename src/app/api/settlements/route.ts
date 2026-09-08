import { NextResponse } from "next/server";
import { guardApi } from "@/lib/guard";
import { createSettlement, SettlementError } from "@/lib/settlements";

/**
 * ⚠⚠ POST /api/settlements — **THE ONE CREATE ENDPOINT** (`P1-J4-E394` WS-1).
 *
 * **BOTH RENDERINGS POST HERE.** A timesheet arrives as many lines naming one
 * work-order line with a `serviceDate` and hours each; a milestone arrives as one
 * line naming an AMOUNT order line with neither. **There is no `type` field in
 * this body, no branch on one, and no second endpoint** — the ORDER LINE's
 * `basis` decides everything, server-side.
 *
 * ⚠ `check:settle` ASSERTS THIS IS THE ONLY CREATE ROUTE and that no
 * `settlement_type` column exists. `E388` forbids exactly that shape, and the
 * second endpoint is how it would arrive: someone builds `/api/timesheets`
 * because the form looks different, and then two paths write one table.
 *
 * ⚠ GATED `authenticated`, NOT A CAPABILITY. Raising a payment request is the
 * PROVIDER's act; the party check inside `createSettlement` is the real gate and
 * it is per-ORDER, because one person can be the buyer on one order and the
 * provider on another.
 */
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
      })
    );
  } catch (e) {
    if (e instanceof SettlementError) {
      const status = e.code === "NOT_FOUND" ? 404 : e.code === "FORBIDDEN" ? 403 : 400;
      return NextResponse.json({ error: e.message, code: e.code }, { status });
    }
    /*
      ⚠ `SpineError` AND `OrderError` REACH HERE WITH THEIR OWN MESSAGES, and
      they are passed through rather than flattened. "A settlement may only be
      raised against a RELEASED work order" and "Drawing 60 would exceed the
      ordered quantity (40 of 100 already drawn)" are the actual answers; "could
      not create" is the non-answer this codebase keeps removing.
    */
    if (e instanceof Error && (e.name === "SpineError" || e.name === "OrderError"))
      return NextResponse.json({ error: e.message, code: "INVALID" }, { status: 400 });
    console.error("[settlements] create failed:", e);
    return NextResponse.json({ error: "Could not raise that payment request" }, { status: 500 });
  }
}
