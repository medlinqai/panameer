import { NextResponse } from "next/server";
import { guardApi } from "@/lib/guard";
import { requestValidation } from "@/lib/profile-settings";
import { OnboardingError } from "@/lib/onboarding";

/**
 * POST /api/settings/request-validation — request the merit-based Validation
 * (brief_K). Sets validation_status = REQUESTED + timestamp. Admin grants later
 * (brief_M). Does not change base visibility.
 */
export async function POST() {
  const gate = await guardApi("canProvideServices");
  if (gate instanceof NextResponse) return gate;
  try {
    return NextResponse.json(await requestValidation(gate));
  } catch (e) {
    if (e instanceof OnboardingError) {
      const status = e.code === "NOT_A_PROVIDER" ? 404 : 400;
      return NextResponse.json({ error: e.message, code: e.code }, { status });
    }
    console.error("[settings] request-validation failed:", e);
    return NextResponse.json({ error: "Could not request validation" }, { status: 500 });
  }
}
