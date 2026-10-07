import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { guardApi } from "@/lib/guard";
import { buyerProfileFor, saveBuyerProfile } from "@/lib/buyer-profile";

// The signed-in buyer's own Buyer Profile.
async function me() {
  const gate = await guardApi("authenticated");
  if (gate instanceof NextResponse) return gate;
  const p = await prisma.person.findUnique({ where: { user_id: gate.userId }, select: { id: true } });
  return p ? p.id : NextResponse.json({ error: "No profile" }, { status: 404 });
}

export async function GET() {
  const id = await me();
  if (id instanceof NextResponse) return id;
  return NextResponse.json({ profile: await buyerProfileFor(id) });
}

const S = z.string().max(300).nullable();
const Body = z.object({
  title: z.string().max(200).nullable().optional(),
  overview: z.string().max(4000).nullable().optional(),
  workHistory: z.array(z.object({ employer: z.string().max(200), title: S, start: z.string().max(10).nullable(), end: z.string().max(10).nullable() })).max(30).optional(),
  education: z.array(z.object({ institution: z.string().max(200), degree: S, year: z.number().int().min(1900).max(2100).nullable() })).max(20).optional(),
  languages: z.array(z.string().max(60)).max(20).optional(),
});

export async function POST(req: Request) {
  const id = await me();
  if (id instanceof NextResponse) return id;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "That didn't look right." }, { status: 400 });
  await saveBuyerProfile(id, parsed.data);
  return NextResponse.json({ profile: await buyerProfileFor(id) });
}
