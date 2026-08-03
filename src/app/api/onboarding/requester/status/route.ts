import { NextResponse } from "next/server";
import { guardApi } from "@/lib/guard";
import { OnboardingError } from "@/lib/onboarding";
import { getRequesterState } from "@/lib/requester-onboarding";

/**
 * GET /api/onboarding/requester/status — the requester wizard's gate + resume
 * state. Drives the verify gate, the landing step, and every step's prefill.
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
export async function GET() {
  const gate = await guardApi("authenticated");
  if (gate instanceof NextResponse) return gate;
  const viewer = gate;
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
