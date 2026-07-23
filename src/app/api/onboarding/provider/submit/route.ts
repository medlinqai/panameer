import { NextResponse } from "next/server";
import { getSessionViewer } from "@/lib/session";
import { submitProviderProfile, OnboardingError } from "@/lib/onboarding";

/**
 * POST /api/onboarding/provider/submit — Review & submit. Sets published=false,
 * approval_status=PENDING (under review). The client then routes to /dashboard.
 */
export async function POST() {
  const viewer = await getSessionViewer();
  if (!viewer) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }
  try {
    return NextResponse.json(await submitProviderProfile(viewer));
  } catch (e) {
    if (e instanceof OnboardingError) {
      const status = e.code === "NOT_VERIFIED" ? 403 : e.code === "INCOMPLETE" ? 400 : 400;
      return NextResponse.json({ error: e.message, code: e.code }, { status });
    }
    console.error("[onboarding] submit failed:", e);
    return NextResponse.json({ error: "Could not submit profile" }, { status: 500 });
  }
}
