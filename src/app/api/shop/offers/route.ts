import { NextResponse } from "next/server";
import { checkTransact, guardApi } from "@/lib/guard";
import { TRANSACT_MESSAGE } from "@/lib/transact-message";
import { makeOffer } from "@/lib/service-product-offers";
import { SourcingError } from "@/lib/sourcing";

// Buyer makes an offer on a published service product; the seller accepts or declines in /services/offers.
export async function POST(req: Request) {
  const gate = await guardApi("canHireTalent");
  if (gate instanceof NextResponse) return gate;
  const transact = await checkTransact(gate);
  if (!transact.ok) return NextResponse.json({ error: TRANSACT_MESSAGE[transact.reason], code: transact.reason }, { status: 403 });
  const b = await req.json().catch(() => null);
  if (!b?.serviceProductId) return NextResponse.json({ error: "Which service product?" }, { status: 400 });
  try {
    const r = await makeOffer(gate, { serviceProductId: String(b.serviceProductId), amountCents: Number(b.amountCents) });
    return NextResponse.json({ ok: true, ...r });
  } catch (e) {
    if (e instanceof SourcingError) return NextResponse.json({ ok: false, error: e.message, code: e.code }, { status: 409 });
    console.error("[shop/offers] failed:", e);
    return NextResponse.json({ ok: false, error: "Could not send that offer" }, { status: 500 });
  }
}
