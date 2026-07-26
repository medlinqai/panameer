import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionViewer } from "@/lib/session";
import { updateUnverifiedEmail, OnboardingError } from "@/lib/onboarding";
import { issueEmailVerification } from "@/lib/verification";

const schema = z.object({ email: z.string().trim().email().max(200) });

/**
 * POST /api/onboarding/update-email — correct a mistyped email while still
 * unverified, then re-send verification to the new address.
 *
 * Note: NextAuth's JWT still carries the old email in `session.user.email`
 * until re-login, but identity is keyed on the user id (viewer.userId), so
 * verification + the wizard keep working against the updated address.
 */
export async function POST(request: Request) {
  const viewer = await getSessionViewer();
  if (!viewer) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  try {
    await updateUnverifiedEmail(viewer, parsed.data.email);
    const res = await issueEmailVerification(viewer.userId, {
        origin: new URL(request.url).origin,
      });
    return NextResponse.json({
      ok: true,
      email: parsed.data.email,
      ...(res.ok && "devLink" in res && res.devLink ? { devLink: res.devLink } : {}),
    });
  } catch (e) {
    if (e instanceof OnboardingError) {
      const status = e.code === "EMAIL_TAKEN" ? 409 : 400;
      return NextResponse.json({ error: e.message, code: e.code }, { status });
    }
    console.error("[onboarding] update-email failed:", e);
    return NextResponse.json({ error: "Could not update email" }, { status: 500 });
  }
}
