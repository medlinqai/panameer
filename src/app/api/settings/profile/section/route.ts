import { NextResponse } from "next/server";
import { guardApi } from "@/lib/guard";
import { saveProviderSection } from "@/lib/profile-settings";
import { OnboardingError, type ProfileSection } from "@/lib/onboarding";
import { parseSectionBody } from "@/lib/section-schemas";

export async function POST(request: Request) {
  const gate = await guardApi("canProvideServices");
  if (gate instanceof NextResponse) return gate;
  const viewer = gate;
  const body = await request.json().catch(() => null);

  const parsed = parseSectionBody(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  }

  try {
    return NextResponse.json(
      await saveProviderSection(
        viewer,
        parsed.section as ProfileSection,
        parsed.data
      )
    );
  } catch (e) {
    if (e instanceof OnboardingError) {
      const status = e.code === "NOT_A_PROVIDER" ? 404 : 400;
      return NextResponse.json({ error: e.message, code: e.code }, { status });
    }
    console.error("[settings] section save failed:", e);
    return NextResponse.json({ error: "Could not save section" }, { status: 500 });
  }
}
