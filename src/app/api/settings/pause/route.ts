import { NextResponse } from "next/server";
import { z } from "zod";
import { guardApi } from "@/lib/guard";
import { setPaused } from "@/lib/profile-settings";
import { OnboardingError } from "@/lib/onboarding";

const schema = z.object({ paused: z.boolean() });

/**
 * POST /api/settings/pause — pause/unpause the owner's listing (brief_K).
 * Paused hides the profile from the marketplace regardless of completeness.
 */
export async function POST(request: Request) {
  const gate = await guardApi("canProvideServices");
  if (gate instanceof NextResponse) return gate;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  try {
    return NextResponse.json(await setPaused(gate, parsed.data.paused));
  } catch (e) {
    if (e instanceof OnboardingError) {
      const status = e.code === "NOT_A_PROVIDER" ? 404 : 400;
      return NextResponse.json({ error: e.message, code: e.code }, { status });
    }
    console.error("[settings] pause failed:", e);
    return NextResponse.json({ error: "Could not update visibility" }, { status: 500 });
  }
}
