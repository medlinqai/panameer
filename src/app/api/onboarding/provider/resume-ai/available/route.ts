import { NextResponse } from "next/server";
import { getSessionViewer } from "@/lib/session";
import { aiExtractionAvailable } from "@/lib/resume/ai-extract";
import { prisma } from "@/lib/prisma";
import { ownedProviderProfile } from "@/lib/access";

/**
 * GET — is the AI tier configured here? (WS3)
 *
 * Returns a BOOLEAN and nothing else: whether a key exists, never the key or any
 * detail about it. The review step asks so it can hide "Let AI take a pass" on an
 * environment without one — offering a button that can only 503 is worse than
 * offering no button.
 */
export async function GET() {
  const viewer = await getSessionViewer();
  if (!viewer) return NextResponse.json({ available: false }, { status: 401 });

  /*
    E129 — also report whether there is a DOCUMENT to re-read.

    The résumé IS retained: `ProfileImport.raw_text` holds up to 100k characters
    and nothing deletes it, so a provider who imported months ago can have the
    model re-read the same file without uploading anything. But a provider who
    never imported — or whose profile predates the import step — has nothing
    stored, and for them the offer has to be "upload one" rather than a button
    that 404s. The panel needs to know which it is before it renders.
  */
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
  });
}
