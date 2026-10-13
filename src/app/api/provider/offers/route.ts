import { NextResponse } from "next/server";
import { z } from "zod";
import { guardApi } from "@/lib/guard";
import { acceptOffer, counterOffer, denyOffer } from "@/lib/service-product-offers";
import { SourcingError } from "@/lib/sourcing";

const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("accept"), offerId: z.string().uuid() }),
  z.object({ action: z.literal("counter"), offerId: z.string().uuid(), amountCents: z.number().int().positive().max(1_000_000_000), message: z.string().trim().max(500).nullable().optional() }),
  z.object({ action: z.literal("deny"), offerId: z.string().uuid(), message: z.string().trim().max(500).nullable().optional(), floorCents: z.number().int().positive().nullable().optional() }),
]);

// MO-E003: the seller answers an offer — Accept · Counter (once) · Decline. Owner-scoped in the lib.
export async function POST(req: Request) {
  const viewer = await guardApi("canProvideServices");
  if (viewer instanceof NextResponse) return viewer;
  const p = Body.safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ error: "That didn't look right." }, { status: 400 });
  try {
    const d = p.data;
    const r = d.action === "accept" ? await acceptOffer(viewer, d) : d.action === "counter" ? await counterOffer(viewer, d) : await denyOffer(viewer, { offerId: d.offerId, message: d.message ?? null, floorCents: d.floorCents ?? null });
    return NextResponse.json({ ok: true, ...r });
  } catch (e) {
    if (e instanceof SourcingError) return NextResponse.json({ error: e.message, code: e.code }, { status: e.code === "NOT_YOURS" ? 403 : e.code === "NOT_FOUND" ? 404 : 409 });
    throw e;
  }
}
