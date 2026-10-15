import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { guardApi } from "@/lib/guard";
import { ownedProviderProfile } from "@/lib/access";

const Body = z.object({ openToOffers: z.boolean() });

// Lane 7: the seller's "Open to offers on price and delivery" switch (replaces "I accept orders manually").
export async function POST(request: Request) {
  const gate = await guardApi("canProvideServices");
  if (gate instanceof NextResponse) return gate;
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Expected { openToOffers: boolean }" }, { status: 400 });
  const profile = await prisma.providerProfile.findFirst({ where: ownedProviderProfile(gate), select: { id: true } });
  if (!profile) return NextResponse.json({ error: "No provider profile" }, { status: 403 });
  await prisma.providerProfile.update({ where: { id: profile.id }, data: { open_to_offers: parsed.data.openToOffers } });
  return NextResponse.json({ ok: true, openToOffers: parsed.data.openToOffers });
}
