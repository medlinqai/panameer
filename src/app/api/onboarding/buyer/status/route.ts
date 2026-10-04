import { NextResponse } from "next/server";
import { getSessionViewer } from "@/lib/session";
import { getBuyerState, OnboardingError } from "@/lib/onboarding";

export async function GET() {
  const viewer = await getSessionViewer();
  if (!viewer) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }
  try {
    return NextResponse.json(await getBuyerState(viewer));
  } catch (e) {
    if (e instanceof OnboardingError && e.code === "NOT_A_BUYER") {
      return NextResponse.json({ error: e.message, code: e.code }, { status: 404 });
    }
    console.error("[onboarding] buyer status failed:", e);
    return NextResponse.json({ error: "Could not load status" }, { status: 500 });
  }
}
