import { NextResponse } from "next/server";
import { getPublicProviderProfile } from "@/lib/providers";
import { getSessionViewer } from "@/lib/session";

/**
 * GET /api/providers/[id] — a provider's public marketplace profile.
 *
 * Public: shared marketplace surface, no auth, not PAccount-scoped. The lib
 * enforces the visibility gate (brief_K: ACTIVE + ≥80% complete + not paused),
 * so a hidden profile 404s — but the OWNER always sees their own. Thin handler.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const viewer = await getSessionViewer();
  const profile = await getPublicProviderProfile(id, {
    viewerUserId: viewer?.userId,
  });
  if (!profile) {
    return NextResponse.json({ error: "Provider not found" }, { status: 404 });
  }
  return NextResponse.json(profile);
}
