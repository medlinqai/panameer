import { NextResponse } from "next/server";
import { guardApi } from "@/lib/guard";
import { ownedProviderProfile } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { confirmResumePrefill } from "@/lib/resume/prefill";

// BT-E004: the provider confirms what the résumé filled — clears the "from your résumé" markers.
export async function POST() {
  const viewer = await guardApi("canProvideServices");
  if (viewer instanceof NextResponse) return viewer;
  const p = await prisma.providerProfile.findFirst({ where: ownedProviderProfile(viewer), select: { id: true } });
  if (!p) return NextResponse.json({ error: "No provider profile" }, { status: 404 });
  await confirmResumePrefill(p.id);
  return NextResponse.json({ ok: true });
}
