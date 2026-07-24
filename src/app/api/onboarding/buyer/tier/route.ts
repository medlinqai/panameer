import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionViewer } from "@/lib/session";
import { setBuyerTier, OnboardingError } from "@/lib/onboarding";

const schema = z.object({ tier: z.enum(["BASIC", "BUSINESS_PLUS"]) });

/**
 * POST /api/onboarding/buyer/tier — set the subscription tier (no payment
 * collected). BUSINESS_PLUS records a trial start. Requires a verified email.
 */
export async function POST(request: Request) {
  const viewer = await getSessionViewer();
  if (!viewer) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid tier" }, { status: 400 });
  }

  try {
    return NextResponse.json(await setBuyerTier(viewer, parsed.data.tier));
  } catch (e) {
    if (e instanceof OnboardingError) {
      const status = e.code === "NOT_VERIFIED" ? 403 : e.code === "NOT_A_BUYER" ? 404 : 400;
      return NextResponse.json({ error: e.message, code: e.code }, { status });
    }
    console.error("[onboarding] buyer tier failed:", e);
    return NextResponse.json({ error: "Could not set tier" }, { status: 500 });
  }
}
