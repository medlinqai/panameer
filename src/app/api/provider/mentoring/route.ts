import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { guardApi } from "@/lib/guard";
import { ownedProviderProfile } from "@/lib/access";

/**
 * ── ⚠⚠ POST /api/provider/mentoring (`P2-J3-E558` WS-C1) ──────────────────
 *
 * ⚠⚠ THIS TOGGLE IS THE CONSENT. Scott, 2026-09-18: colleague is lateral and
 * free; MENTOR IS COMMERCIAL. A provider declares themselves open ONCE, here,
 * and being followed as a mentor afterwards is DEMAND — not an unconsented
 * claim about the person.
 * ⚠ THAT IS WHY `ConnectionKind.MENTOR` NEEDS NO PENDING STATE, and none was
 * added. `followMentor`/`unfollowMentor` is a coherent designed model.
 *
 * ⚠ OWNER-SCOPED BY CONSTRUCTION — `ownedProviderProfile(viewer)` resolves the
 * profile from the SESSION. The body carries a boolean and nothing else; there
 * is no id here a caller could point at somebody else's record.
 *
 * ⚠⚠ IT PROMISES NO SESSION AND NO PAYMENT. Setting it true changes exactly one
 * thing: the provider becomes findable by someone looking for a mentor.
 */
const Body = z.object({ open: z.boolean() });

export async function POST(request: Request) {
  const gate = await guardApi("canProvideServices");
  if (gate instanceof NextResponse) return gate;
  const viewer = gate;

  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Expected { open: boolean }" }, { status: 400 });
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
    data: { open_for_mentoring: parsed.data.open },
    select: { open_for_mentoring: true },
  });

  return NextResponse.json({ open: updated.open_for_mentoring });
}
