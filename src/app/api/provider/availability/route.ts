import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { guardApi } from "@/lib/guard";
import { ownedProviderProfile } from "@/lib/access";

const Body = z.object({ available: z.boolean() });

export async function POST(request: Request) {
  const gate = await guardApi("canProvideServices");
  if (gate instanceof NextResponse) return gate;
  const viewer = gate;

  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Expected { available: boolean }" }, { status: 400 });
  }

  const profile = await prisma.providerProfile.findFirst({
    where: ownedProviderProfile(viewer),
    select: { id: true },
  });
  if (!profile) {
    return NextResponse.json({ error: "No provider profile" }, { status: 403 });
  }

  const updated = await prisma.providerProfile.update({
    where: { id: profile.id },
    data: { available_for_messages: parsed.data.available },
    select: { available_for_messages: true },
  });

  return NextResponse.json({ available: updated.available_for_messages });
}
