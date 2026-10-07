import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionViewer } from "@/lib/session";
import { ownedProviderProfile } from "@/lib/access";
import { setKeywords } from "@/lib/terms";

// The member's own Keywords: read them, and save the list as typed.
async function profileId() {
  const viewer = await getSessionViewer();
  if (!viewer) return null;
  return (await prisma.providerProfile.findFirst({ where: ownedProviderProfile(viewer), select: { id: true } }))?.id ?? null;
}

export async function GET() {
  const id = await profileId();
  if (!id) return NextResponse.json({ error: "No provider profile" }, { status: 403 });
  const p = await prisma.providerProfile.findUnique({ where: { id }, select: { keywords: true } });
  return NextResponse.json({ keywords: p?.keywords ?? [] });
}

const Body = z.object({ keywords: z.array(z.string().max(80)).max(60) });

export async function POST(req: Request) {
  const id = await profileId();
  if (!id) return NextResponse.json({ error: "No provider profile" }, { status: 403 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "That didn't look right." }, { status: 400 });
  return NextResponse.json({ keywords: await setKeywords(id, parsed.data.keywords) });
}
