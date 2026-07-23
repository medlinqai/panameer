import { NextResponse } from "next/server";
import { getPublicProviderProfile } from "@/lib/providers";

/**
 * GET /api/providers/[id] — a provider's public marketplace profile.
 *
 * Public: shared marketplace surface, no auth, not PAccount-scoped. The lib
 * enforces the published + approved gate, so drafts/rejected profiles 404.
 * Thin handler; all logic in src/lib.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const profile = await getPublicProviderProfile(id);
  if (!profile) {
    return NextResponse.json({ error: "Provider not found" }, { status: 404 });
  }
  return NextResponse.json(profile);
}
