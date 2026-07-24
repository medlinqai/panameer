import { NextResponse } from "next/server";
import { getSessionViewer } from "@/lib/session";
import { getProviderSettings } from "@/lib/profile-settings";
import { OnboardingError } from "@/lib/onboarding";

/**
 * GET /api/settings/profile — the owner's editable profile snapshot. Owner-
 * scoped: resolves the profile from the session, never a client id. 404 if the
 * signed-in user has no provider profile (fails closed).
 */
export async function GET() {
  const viewer = await getSessionViewer();
  if (!viewer) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }
  try {
    return NextResponse.json(await getProviderSettings(viewer));
  } catch (e) {
    if (e instanceof OnboardingError && e.code === "NOT_A_PROVIDER") {
      return NextResponse.json({ error: e.message, code: e.code }, { status: 404 });
    }
    console.error("[settings] profile load failed:", e);
    return NextResponse.json({ error: "Could not load profile" }, { status: 500 });
  }
}
