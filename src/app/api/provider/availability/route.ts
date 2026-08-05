import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { guardApi } from "@/lib/guard";
import { ownedProviderProfile } from "@/lib/access";

/**
 * POST /api/provider/availability — the persona menu's "Online for messages"
 * toggle (J2.4 WS-B / E008).
 *
 * OWNER-SCOPED the same way every other profile write is: the target profile is
 * resolved from the session through `ownedProviderProfile`, never accepted from
 * the body. The request carries one boolean and nothing that names a record.
 *
 * DELIBERATELY NOT the visibility pause. `paused_at` decides whether a profile
 * appears in the marketplace at all and is bound to the completeness gate this
 * brief must not touch; this says whether the person is at their desk. Writing
 * one through the other would take a profile off the market because its owner
 * went to lunch.
 */
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
