import { NextResponse } from "next/server";
import { z } from "zod";
import { guardApi } from "@/lib/guard";
import { acceptOffer, denyOffer } from "@/lib/service-product-offers";
import { SourcingError } from "@/lib/sourcing";

const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("accept"), offerId: z.string().uuid() }),
  z.object({
    action: z.literal("deny"),
    offerId: z.string().uuid(),
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
    if (e instanceof SourcingError) {
      const status = e.code === "NOT_YOURS" ? 403 : e.code === "NOT_FOUND" ? 404 : 409;
      return NextResponse.json({ error: e.message, code: e.code }, { status });
    }
    throw e;
  }
}
