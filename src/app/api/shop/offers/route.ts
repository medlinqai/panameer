import { NextResponse } from "next/server";
import { z } from "zod";
import { checkTransact, guardApi } from "@/lib/guard";
import { TRANSACT_MESSAGE } from "@/lib/transact-message";
import { answerCounter, makeOffer, withdrawOffer } from "@/lib/service-product-offers";
import { SourcingError } from "@/lib/sourcing";

const Body = z.union([
  z.object({ action: z.literal("make").optional(), serviceProductId: z.string().uuid().nullable().optional(), providerServiceId: z.string().uuid().nullable().optional(), amountCents: z.number().int().positive().max(1_000_000_000).nullable().optional(), deliveryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(), note: z.string().trim().max(500).nullable().optional() }),
  z.object({ action: z.literal("answer"), offerId: z.string().uuid(), accept: z.boolean() }),
  z.object({ action: z.literal("withdraw"), offerId: z.string().uuid() }),
]);

// MO-E003: the buyer makes an offer, answers the seller's counter, or withdraws. Owner-scoped in the lib.
export async function POST(req: Request) {
  const gate = await guardApi("authenticated");
  if (gate instanceof NextResponse) return gate;
  const p = Body.safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ error: "Enter an amount above zero." }, { status: 400 });
  try {
    const d = p.data;
    if (!("offerId" in d)) {
      const transact = await checkTransact(gate);
      if (!transact.ok) return NextResponse.json({ error: TRANSACT_MESSAGE[transact.reason], code: transact.reason }, { status: 403 });
      return NextResponse.json({ ok: true, ...(await makeOffer(gate, d)) });
    }
    if (d.action === "answer") return NextResponse.json({ ok: true, ...(await answerCounter(gate, d)) });
    return NextResponse.json({ ok: true, ...(await withdrawOffer(gate, d)) });
  } catch (e) {
    if (e instanceof SourcingError) return NextResponse.json({ ok: false, error: e.message, code: e.code }, { status: e.code === "NOT_YOURS" ? 403 : 409 });
    console.error("[shop/offers] failed:", e);
    return NextResponse.json({ ok: false, error: "Could not do that" }, { status: 500 });
  }
}
