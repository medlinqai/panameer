import { NextResponse } from "next/server";
import { z } from "zod";
import { TRANSACT_MESSAGE } from "@/lib/transact-message";
import { checkTransact, guardApi } from "@/lib/guard";
import { hire } from "@/lib/work-orders";

/**
 * ── ⚠⚠⚠ POST /api/work-requests/[id]/order — TRANSITION TWO (`P2-A8-E684`) ─
 *
 * ⚠⚠ **`ASSIGNED → ORDERED`**: a `WorkOrder` is created `ISSUED` with its lines
 * copied field for field from the requisition, the request and its lines move
 * to `ORDERED`, and the provider is told (`work.order_offered`).
 * ⚠⚠⚠ **SEPARATE FROM SELECTING, WHICH IS THE WHOLE POINT OF RULING 17.**
 * Selecting is reversible; **creating the order is what makes it not.** Two
 * buttons, two transitions, and a buyer who selects is not thereby contracted.
 *
 * ⚠ **`work.order_offered` SENDS THE PROVIDER TO `/orders/{id}`, AND THAT WAS
 * CHECKED RATHER THAN ASSUMED** — `/orders` is `requires: "authenticated"` in
 * `route-access.ts`, so unlike `E680(b)`'s interview href it does not bounce
 * them. ⚠⚠ The same question was asked of this event because building its door
 * is exactly what made `E680(b)` live.
 *
 * ⚠⚠⚠ **NO MONEY MOVES. NO `Payment` ROW, NO `PAID`, NO CUT COMPUTED.** An
 * order is a commitment, not a transfer; `fee_bps` is recorded and never
 * arithmetic. ⚠ Acceptance — `provider_accepted_at`, `buyer_accepted_at`,
 * `RELEASED` — is **out of scope by ruling 43** and nothing here writes it.
 */
const bodySchema = z
  .object({
    /** ⚠ The ERP door only: recorded on the order and never branched on. */
    externalRef: z.string().max(120).nullish(),
  })
  .strict();

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await guardApi("canHireTalent");
  if (gate instanceof NextResponse) return gate;
  const transact = await checkTransact(gate);
  if (!transact.ok) {
    return NextResponse.json(
      { error: TRANSACT_MESSAGE[transact.reason], code: transact.reason },
      { status: 403 }
    );
  }
  const { id } = await params;
  /* ⚠ An empty body is legitimate here — `externalRef` is the only field and it
     is optional — so a missing body parses as `{}` rather than failing. */
  const parsed = bodySchema.safeParse((await request.json().catch(() => ({}))) ?? {});
  if (!parsed.success) {
    return NextResponse.json({ error: "That order couldn't be read.", code: "BAD_BODY" }, { status: 400 });
  }
  try {
    return NextResponse.json(await hire(gate, { workRequestId: id }));
  } catch (e) {
    if (e instanceof Error && e.name === "SourcingError") {
      const code = (e as Error & { code?: string }).code ?? "INVALID";
      const status = code === "NOT_FOUND" ? 404 : code === "NOT_BUYER" ? 403 : 400;
      return NextResponse.json({ error: e.message, code }, { status });
    }
    console.error("[work-orders] hire failed:", e);
    return NextResponse.json({ error: "Could not create that work order." }, { status: 500 });
  }
}
