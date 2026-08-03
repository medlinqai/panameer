import { NextResponse } from "next/server";
import { getSessionViewer } from "@/lib/session";
import { OnboardingError } from "@/lib/onboarding";
import { completeRequester } from "@/lib/requester-onboarding";

/**
 * POST /api/onboarding/requester/complete — finish onboarding.
 *
 * The server re-checks the gaps rather than trusting the review screen's
 * Continue: "ready to post work" is a claim that this person can be put on a
 * work request, and a requester with no deliver-to cannot.
 */
export async function POST() {
  const viewer = await getSessionViewer();
  if (!viewer) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }
  try {
    return NextResponse.json({ ok: true, state: await completeRequester(viewer) });
  } catch (e) {
    if (e instanceof OnboardingError) {
      const status =
        e.code === "NOT_A_REQUESTER" ? 404 : e.code === "INCOMPLETE" ? 422 : 400;
      return NextResponse.json({ error: e.message, code: e.code }, { status });
    }
    console.error("[onboarding] requester complete failed:", e);
    return NextResponse.json({ error: "Could not finish onboarding" }, { status: 500 });
  }
}
