import { NextResponse } from "next/server";
import { z } from "zod";
import { guardApi } from "@/lib/guard";
import { savePreferences } from "@/lib/profile-settings";
import { OnboardingError } from "@/lib/onboarding";

const schema = z.object({
  notifyEmail: z.boolean().optional(),
  notifyProductUpdates: z.boolean().optional(),
});

/** POST /api/settings/preferences — save the owner's notification opt-ins. */
export async function POST(request: Request) {
  const gate = await guardApi("canProvideServices");
  if (gate instanceof NextResponse) return gate;
  const viewer = gate;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  try {
    return NextResponse.json(await savePreferences(viewer, parsed.data));
  } catch (e) {
    if (e instanceof OnboardingError) {
      const status = e.code === "NOT_A_PROVIDER" ? 404 : 400;
      return NextResponse.json({ error: e.message, code: e.code }, { status });
    }
    console.error("[settings] preferences failed:", e);
    return NextResponse.json({ error: "Could not save preferences" }, { status: 500 });
  }
}
