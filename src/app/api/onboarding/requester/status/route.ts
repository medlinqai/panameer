import { NextResponse } from "next/server";
import { guardApi } from "@/lib/guard";
import { OnboardingError } from "@/lib/onboarding";
import { getRequesterState } from "@/lib/requester-onboarding";

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
