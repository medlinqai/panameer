import { NextResponse } from "next/server";
import { guardApi } from "@/lib/guard";
import { OrderError, releaseOrder } from "@/lib/orders";

/**
 * POST /api/orders/[id]/release — the BUYER releases (`P1-J4-E393` WS-2).
 *
 * ⚠⚠ THE SECOND OF TWO EVENTS BY TWO PARTIES, AND IT IS A SEPARATE ROUTE FOR
 * THAT REASON. One `/activate` endpoint taking a party argument would have made
 * the party a PARAMETER — something the caller states — when it is a fact about
 * who is signed in. A provider POSTing here gets 403.
 *
 * ⚠ RELEASE IS WHAT OPENS SETTLEMENT (`E388`). It cannot run before the provider
 * has accepted, and `availableActions` is where that is decided — once.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await guardApi("authenticated");
  if (gate instanceof NextResponse) return gate;
  const { id } = await params;
  try {
    return NextResponse.json(await releaseOrder(gate, id));
  } catch (e) {
    if (e instanceof OrderError) {
      const status = e.code === "NOT_FOUND" ? 404 : e.code === "FORBIDDEN" ? 403 : 400;
      return NextResponse.json({ error: e.message, code: e.code }, { status });
    }
    console.error("[orders] release failed:", e);
    return NextResponse.json({ error: "Could not release that order" }, { status: 500 });
  }
}
