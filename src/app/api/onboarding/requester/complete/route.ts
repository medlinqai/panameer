import { NextResponse } from "next/server";
import { guardApi } from "@/lib/guard";
import { OnboardingError } from "@/lib/onboarding";
import { completeRequester } from "@/lib/requester-onboarding";

/**
 * POST /api/onboarding/requester/complete — finish onboarding.
 *
 * The server re-checks the gaps rather than trusting the review screen's
 * Continue: "ready to post work" is a claim that this person can be put on a
 * work request, and a requester with no deliver-to cannot.
 */
/*
 * ACCESS GOES THROUGH `guardApi` (→ src/lib/access.ts), not a hand-rolled
 * session check — the brief's rule, and the reason is this file would
 * otherwise be a fourth place that decides what "signed in" means.
 *
 * The requirement is `authenticated`, not canHireTalent: a requester mid-
 * onboarding already carries is_service_buyer, but the real boundary here is
 * OWNERSHIP, and that is enforced below by resolving the requester from the
 * session. A capability check would be a weaker statement of the same thing.
 */
export async function POST() {
  const gate = await guardApi("authenticated");
  if (gate instanceof NextResponse) return gate;
  const viewer = gate;
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
