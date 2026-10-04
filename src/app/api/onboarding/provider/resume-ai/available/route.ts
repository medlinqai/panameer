import { NextResponse } from "next/server";
import { getSessionViewer } from "@/lib/session";
import { aiExtractionAvailable } from "@/lib/resume/ai-extract";
import { prisma } from "@/lib/prisma";
import { ownedProviderProfile } from "@/lib/access";

export async function GET() {
  const viewer = await getSessionViewer();
  if (!viewer) return NextResponse.json({ available: false }, { status: 401 });

  const profile = await prisma.providerProfile.findFirst({
    where: ownedProviderProfile(viewer),
    select: { id: true },
  });
  const doc = profile
    ? await prisma.profileImport.findFirst({
        where: { provider_profile_id: profile.id, raw_text: { not: null } },
        orderBy: { created_at: "desc" },
        select: { file_name: true, created_at: true },
      })
    : null;

  return NextResponse.json({
    available: aiExtractionAvailable(),
    hasDocument: Boolean(doc),
    documentName: doc?.file_name ?? null,
    lastParseAt: doc?.created_at ? doc.created_at.toISOString() : null,
  });
}
