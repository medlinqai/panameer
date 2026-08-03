import { NextResponse } from "next/server";
import { getSessionViewer } from "@/lib/session";
import {
  saveProviderStep,
  OnboardingError,
  SAVEABLE_STEPS,
  type ProviderStep,
} from "@/lib/onboarding";

/**
 * POST /api/onboarding/provider/step — save-as-you-go. Persists one step of the
 * draft profile and returns the fresh onboarding state. Requires a verified
 * email (enforced in the lib).
 */
export async function POST(request: Request) {
  const viewer = await getSessionViewer();
  if (!viewer) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const step = body?.step as ProviderStep | undefined;
  /*
    WS1 — validated against SAVEABLE_STEPS, not the counted itinerary. Bio,
    Education, Specializations and Languages stopped being prompted stops but
    are still written (from the review page and Settings), so a whitelist of
    "steps in the wizard" would refuse the very saves the brief asks to keep.
  */
  if (!step || !SAVEABLE_STEPS.includes(step)) {
    return NextResponse.json({ error: "Unknown step" }, { status: 400 });
  }

  try {
    const state = await saveProviderStep(viewer, step, body?.data ?? {});
    return NextResponse.json(state);
  } catch (e) {
    if (e instanceof OnboardingError) {
      const status = e.code === "NOT_VERIFIED" ? 403 : e.code === "NOT_A_PROVIDER" ? 404 : 400;
      return NextResponse.json({ error: e.message, code: e.code }, { status });
    }
    console.error("[onboarding] step save failed:", e);
    return NextResponse.json({ error: "Could not save step" }, { status: 500 });
  }
}
