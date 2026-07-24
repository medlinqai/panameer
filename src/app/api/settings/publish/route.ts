import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionViewer } from "@/lib/session";
import { setPublished } from "@/lib/profile-settings";
import { OnboardingError } from "@/lib/onboarding";

const schema = z.object({ published: z.boolean() });

/**
 * POST /api/settings/publish — publish/unpublish the owner's profile. Only
 * permitted once approval_status = APPROVED (enforced in the lib).
 */
export async function POST(request: Request) {
  const viewer = await getSessionViewer();
  if (!viewer) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  try {
    return NextResponse.json(await setPublished(viewer, parsed.data.published));
  } catch (e) {
    if (e instanceof OnboardingError) {
      const status = e.code === "NOT_A_PROVIDER" ? 404 : 400;
      return NextResponse.json({ error: e.message, code: e.code }, { status });
    }
    console.error("[settings] publish failed:", e);
    return NextResponse.json({ error: "Could not update visibility" }, { status: 500 });
  }
}
