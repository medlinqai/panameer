import { NextResponse } from "next/server";
import { guardApi } from "@/lib/guard";
import { acceptOrder, OrderError } from "@/lib/orders";

/**
 * POST /api/orders/[id]/accept — the PROVIDER accepts (`P1-J4-E393` WS-2).
 *
 * ⚠⚠ THE BOUNDARY, NOT THE BUTTON. The detail page renders Accept only when
 * `availableActions` returns it; this route calls THE SAME FUNCTION server-side,
 * because the route is reachable without ever loading the page. A buyer POSTing
 * here gets 403 with "Only the provider can accept a work order".
 *
 * ⚠ GATED `authenticated`, NOT `canHireTalent`. Accepting is the PROVIDER's act
 * and a provider is not a buyer — the party check inside `acceptOrder` is the
 * real gate, and it is per-ORDER rather than per-role, which is the only thing
 * that can be correct when one person is a buyer on one order and a provider on
 * another.
 */
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
