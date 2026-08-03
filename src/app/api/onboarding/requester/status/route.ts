import { NextResponse } from "next/server";
import { getSessionViewer } from "@/lib/session";
import { OnboardingError } from "@/lib/onboarding";
import { getRequesterState } from "@/lib/requester-onboarding";

/**
 * GET /api/onboarding/requester/status — the requester wizard's gate + resume
 * state. Drives the verify gate, the landing step, and every step's prefill.
 */
export async function GET() {
  const viewer = await getSessionViewer();
  if (!viewer) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }
  try {
    return NextResponse.json(await getRequesterState(viewer));
  } catch (e) {
    if (e instanceof OnboardingError && e.code === "NOT_A_REQUESTER") {
      return NextResponse.json({ error: e.message, code: e.code }, { status: 404 });
    }
    console.error("[onboarding] requester status failed:", e);
    return NextResponse.json({ error: "Could not load status" }, { status: 500 });
  }
}
