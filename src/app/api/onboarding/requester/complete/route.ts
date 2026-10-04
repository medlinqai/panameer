import { NextResponse } from "next/server";
import { guardApi } from "@/lib/guard";
import { OnboardingError } from "@/lib/onboarding";
import { completeRequester } from "@/lib/requester-onboarding";

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
