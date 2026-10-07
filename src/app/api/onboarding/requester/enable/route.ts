import { NextResponse } from "next/server";
import { guardApi } from "@/lib/guard";
import { prisma } from "@/lib/prisma";

// R1 "Start Buying": a signed-in seller turns the buying side on (creates their buyer profile once).
export async function POST() {
  const viewer = await guardApi("authenticated");
  if (viewer instanceof NextResponse) return viewer;
  const person = await prisma.person.findUnique({ where: { user_id: viewer.userId }, select: { id: true, requesterProfile: { select: { id: true } } } });
  if (!person) return NextResponse.json({ error: "No person record." }, { status: 400 });
  if (!person.requesterProfile) await prisma.requesterProfile.create({ data: { person_id: person.id } });
  return NextResponse.json({ ok: true });
}
