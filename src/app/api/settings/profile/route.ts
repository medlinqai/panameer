import { NextResponse } from "next/server";
import { guardApi } from "@/lib/guard";
import { getProviderSettings } from "@/lib/profile-settings";
import { OnboardingError } from "@/lib/onboarding";

/**
 * GET /api/settings/profile — the owner's editable profile snapshot. Gated to
 * canProvideServices (server-authoritative), then owner-scoped: resolves the
 * profile from the session, never a client id. Fails closed.
 */
export async function GET() {
  const gate = await guardApi("canProvideServices");
  if (gate instanceof NextResponse) return gate;
  const viewer = gate;
  try {
    return NextResponse.json(await getProviderSettings(viewer));
  } catch (e) {
    if (e instanceof OnboardingError && e.code === "NOT_A_PROVIDER") {
      return NextResponse.json({ error: e.message, code: e.code }, { status: 404 });
    }
    console.error("[settings] profile load failed:", e);
    return NextResponse.json({ error: "Could not load profile" }, { status: 500 });
  }
}
