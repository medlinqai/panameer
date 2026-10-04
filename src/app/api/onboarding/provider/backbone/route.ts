import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionViewer } from "@/lib/session";
import {
  ensureProviderBackbone,
  getOnboardingState,
  OnboardingError,
} from "@/lib/onboarding";

const schema = z.object({
  country: z.string().trim().max(80).optional(),
  marketingOptIn: z.boolean().optional(),
  inviteToken: z.string().optional(),
});

export async function POST(request: Request) {
  const viewer = await getSessionViewer();
  if (!viewer) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = schema.safeParse(body ?? {});
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  try {
    const { created } = await ensureProviderBackbone(viewer, parsed.data);
    return NextResponse.json({
      ok: true,
      created,
      state: await getOnboardingState(viewer),
    });
  } catch (e) {
    if (e instanceof OnboardingError) {
      const status = e.code === "NOT_A_PROVIDER" ? 409 : 400;
      return NextResponse.json({ error: e.message, code: e.code }, { status });
    }
    console.error("[onboarding] backbone creation failed:", e);
    return NextResponse.json(
      { error: "Could not set up your provider profile" },
      { status: 500 }
    );
  }
}
