import { NextResponse } from "next/server";
import { getSessionViewer } from "@/lib/session";
import { publishProfile, OnboardingError } from "@/lib/onboarding";

/**
 * POST /api/onboarding/provider/publish — "Publish Profile" (brief_P / E019).
 *
 * Marks onboarding complete after checking the finish page's required fields.
 * NOT a visibility switch: marketplace visibility stays derived from
 * completeness (brief_K).
 */
export async function POST() {
  const viewer = await getSessionViewer();
  if (!viewer) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }
  try {
    return NextResponse.json(await publishProfile(viewer));
  } catch (e) {
    if (e instanceof OnboardingError) {
      const status =
        e.code === "NOT_VERIFIED" ? 403 : e.code === "NOT_A_PROVIDER" ? 404 : 400;
      return NextResponse.json({ error: e.message, code: e.code }, { status });
    }
    console.error("[onboarding] publish failed:", e);
    return NextResponse.json({ error: "Could not publish" }, { status: 500 });
  }
}
