import { NextResponse } from "next/server";
import { getSessionViewer } from "@/lib/session";
import { getOnboardingState, OnboardingError } from "@/lib/onboarding";

export async function GET() {
  const viewer = await getSessionViewer();
  if (!viewer) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }
  try {
    return NextResponse.json(await getOnboardingState(viewer));
  } catch (e) {
    if (e instanceof OnboardingError && e.code === "NOT_A_PROVIDER") {
      return NextResponse.json({ error: e.message, code: e.code }, { status: 404 });
    }
    console.error("[onboarding] status failed:", e);
    return NextResponse.json({ error: "Could not load status" }, { status: 500 });
  }
}
