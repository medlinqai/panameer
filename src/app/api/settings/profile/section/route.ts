import { NextResponse } from "next/server";
import { getSessionViewer } from "@/lib/session";
import { saveProviderSection } from "@/lib/profile-settings";
import { OnboardingError, type ProfileSection } from "@/lib/onboarding";

/**
 * POST /api/settings/profile/section — save one profile section (owner-scoped).
 * Body: { section, data }. Reuses the onboarding persistence via the lib.
 */
export async function POST(request: Request) {
  const viewer = await getSessionViewer();
  if (!viewer) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  const section = body?.section as ProfileSection | undefined;
  if (!section) {
    return NextResponse.json({ error: "Missing section" }, { status: 400 });
  }
  try {
    return NextResponse.json(
      await saveProviderSection(viewer, section, body?.data ?? {})
    );
  } catch (e) {
    if (e instanceof OnboardingError) {
      const status = e.code === "NOT_A_PROVIDER" ? 404 : 400;
      return NextResponse.json({ error: e.message, code: e.code }, { status });
    }
    console.error("[settings] section save failed:", e);
    return NextResponse.json({ error: "Could not save section" }, { status: 500 });
  }
}
