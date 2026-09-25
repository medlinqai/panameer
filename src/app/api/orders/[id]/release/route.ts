import { NextResponse } from "next/server";
import { guardApi } from "@/lib/guard";

/**
 * ── ⚠⚠⚠ RETIRED BY RULING 43 — AUTO-RELEASE REPLACED IT ─────────────────
 *
 * POST /api/orders/[id]/release — **was** the buyer releasing (`P1-J4-E393` WS-2).
 *
 * ⚠ SCOTT, 2026-09-24: *"both parties are accepting the terms of the WO. Then,
 * when all parties have accepted the terms, the WO can be auto-released."*
 * ⚠⚠ So `RELEASED` is now produced by the buyer's **acceptance**, inside
 * `acceptOrder`, where the second timestamp lands. **There is no release action,
 * no release button and no release writer.**
 *
 * ── ⚠⚠⚠ WHY THIS FILE STILL REFUSES INSTEAD OF SIMPLY BEING GONE ────────
 *
 * ⚠ Ruling 43 says to quote it rather than delete it (`E164`). ⚠⚠ But a quoted
 * route whose handler still WORKED would be worse than either option: the
 * endpoint is reachable without ever loading a page, and the old body wrote
 * `status: "RELEASED"` while setting **`buyer_released_at`** — a column nothing
 * reads any more. ⚠⚠⚠ **A buyer POSTing here would have released the order
 * WITHOUT `buyer_accepted_at` EVER BEING SET**, leaving a released contract that
 * `bothPartiesAccepted` reports as un-accepted. That is not a dead route; it is a
 * live hole behind a retired door.
 *
 * ⚠ So the handler stays, refuses with **410 Gone**, and names its replacement.
 * ⚠⚠ It is deliberately NOT a 404: a 404 says *"no such thing"* to whoever is
 * still calling it, and this thing existed and moved.
 *
 * ⚠ SUPERSEDED, quoted not deleted (`E164`) — the route as it stood:
 * //   import { OrderError, releaseOrder } from "@/lib/orders";
 * //
 * //   ⚠⚠ THE SECOND OF TWO EVENTS BY TWO PARTIES, AND IT IS A SEPARATE ROUTE FOR
 * //   THAT REASON. One `/activate` endpoint taking a party argument would have made
 * //   the party a PARAMETER — something the caller states — when it is a fact about
 * //   who is signed in. A provider POSTing here gets 403.
 * //   ⚠ RELEASE IS WHAT OPENS SETTLEMENT (`E388`). It cannot run before the provider
 * //   has accepted, and `availableActions` is where that is decided — once.
 * //
 * //   export async function POST(
 * //     _request: Request,
 * //     { params }: { params: Promise<{ id: string }> }
 * //   ) {
 * //     const gate = await guardApi("authenticated");
 * //     if (gate instanceof NextResponse) return gate;
 * //     const { id } = await params;
 * //     try {
 * //       return NextResponse.json(await releaseOrder(gate, id));
 * //     } catch (e) {
 * //       if (e instanceof OrderError) {
 * //         const status = e.code === "NOT_FOUND" ? 404 : e.code === "FORBIDDEN" ? 403 : 400;
 * //         return NextResponse.json({ error: e.message, code: e.code }, { status });
 * //       }
 * //       console.error("[orders] release failed:", e);
 * //       return NextResponse.json({ error: "Could not release that order" }, { status: 500 });
 * //     }
 * //   }
 */
export async function POST() {
  /* ⚠ The auth gate is kept so an anonymous caller still gets the ordinary
     unauthenticated answer rather than learning which endpoints have retired. */
  const gate = await guardApi("authenticated");
  if (gate instanceof NextResponse) return gate;
  return NextResponse.json(
    {
      error:
        "Releasing an order is no longer a separate step — both parties accept the terms, and the second acceptance opens the order for settlement.",
      code: "GONE",
    },
    { status: 410 }
  );
}
