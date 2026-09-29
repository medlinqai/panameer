import { NextResponse } from "next/server";
import { z } from "zod";
import { guardApi } from "@/lib/guard";
import { acceptOffer, denyOffer } from "@/lib/service-product-offers";
import { SourcingError } from "@/lib/sourcing";

/**
 * The seller answers an offer on one of their service products (`P2-A6-E705`, WS-C of
 * `brief_shop_offer_flow`, rulings 94 / 94a).
 *
 *   POST { action: "accept", offerId }
 *        { action: "deny",   offerId, message?, floorCents? }
 *
 * ── ⚠⚠⚠ TWO ACTIONS. NOT THREE. ────────────────────────────────────────────
 *
 * ⚠⚠ **SCOTT, 2026-09-28:** *"either it is an accept or deny. if the provider denies it,
 * the requester either buys it at list or removes it from their cart."*
 * ⚠⚠⚠ **THERE IS NO `counter` ACTION AND NO PLACE TO ADD ONE.** A deny may carry a
 * message and an optional minimum; the buyer's next offer is a NEW row that must clear
 * that floor — and **may still be denied.** The seller never names a price they are bound
 * to, which is the thing Scott did not want.
 *
 * ── ⚠⚠ OWNER-SCOPED IN THE LIBRARY, NOT HERE ───────────────────────────────
 *
 * ⚠ `acceptOffer` and `denyOffer` both resolve the seller from the SESSION and refuse an
 * offer that is not theirs. **This route validates shape and translates errors; it does
 * not decide who may answer** (load-bearing rule 5 — access goes through one place).
 *
 * ⚠⚠ **NO MONEY MOVES HERE.** Accepting writes a cart LINE at the offered amount; it
 * creates no payment and computes no cut. `check:offers` asserts that as an absence.
 */
const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("accept"), offerId: z.string().uuid() }),
  z.object({
    action: z.literal("deny"),
    offerId: z.string().uuid(),
    /* ⚠ Both OPTIONAL — Scott's *"the provider might tell them"* is a MAY, not a MUST. */
    message: z.string().trim().max(500).nullable().optional(),
    floorCents: z.number().int().positive().nullable().optional(),
  }),
]);

export async function POST(req: Request) {
  const viewer = await guardApi("canProvideServices");
  if (viewer instanceof NextResponse) return viewer;

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "That didn't look right." }, { status: 400 });
  }

  try {
    if (parsed.data.action === "accept") {
      const r = await acceptOffer(viewer, { offerId: parsed.data.offerId });
      return NextResponse.json({ ok: true, ...r });
    }
    const r = await denyOffer(viewer, {
      offerId: parsed.data.offerId,
      message: parsed.data.message ?? null,
      floorCents: parsed.data.floorCents ?? null,
    });
    return NextResponse.json({ ok: true, ...r });
  } catch (e) {
    /*
      ⚠⚠ THE LIBRARY'S REFUSALS ARE SENTENCES, AND THEY REACH THE SELLER AS SENTENCES.
      ⚠ `NOT_OPEN` in particular is the one that matters: two tabs open, both answering
      the same offer — the second must be told it was already answered, not shown a
      generic failure.
    */
    if (e instanceof SourcingError) {
      const status = e.code === "NOT_YOURS" ? 403 : e.code === "NOT_FOUND" ? 404 : 409;
      return NextResponse.json({ error: e.message, code: e.code }, { status });
    }
    throw e;
  }
}
