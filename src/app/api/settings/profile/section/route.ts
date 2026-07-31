import { NextResponse } from "next/server";
import { guardApi } from "@/lib/guard";
import { saveProviderSection } from "@/lib/profile-settings";
import { OnboardingError, type ProfileSection } from "@/lib/onboarding";
import { parseSectionBody } from "@/lib/section-schemas";

/**
 * POST /api/settings/profile/section — save one profile section. Gated to
 * canProvideServices (server-authoritative), then owner-scoped. Body:
 * { section, data }. Reuses the onboarding persistence via the lib.
 */
export async function POST(request: Request) {
  const gate = await guardApi("canProvideServices");
  if (gate instanceof NextResponse) return gate;
  const viewer = gate;
  const body = await request.json().catch(() => null);

  /*
    E121 — VALIDATE BEFORE WRITING. This used to read `body?.data ?? {}` and hand
    whatever arrived straight to the section writer. Six of those writers replace
    a whole collection by deleting every row first, and each read its list as
    `Array.isArray(data.x) ? data.x : []` — so a body with a missing or
    misspelled key was indistinguishable from "the new list is empty". A Walk6
    POST carrying `employers` instead of `experiences` deleted all four employers
    and returned 200.

    `parseSectionBody` refuses anything it does not fully recognise, before a
    transaction opens, and names the offending field.
  */
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
