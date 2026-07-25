import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardApi } from "@/lib/guard";
import {
  startPhoneVerification,
  confirmPhoneVerification,
  PhoneVerificationError,
} from "@/lib/phone-verification";
import { getOnboardingState } from "@/lib/onboarding";

/**
 * Phone SMS verification (brief_P / E019).
 *
 *   POST /api/onboarding/provider/phone  { action: "send",   phone }
 *   POST /api/onboarding/provider/phone  { action: "verify", code  }
 *
 * OWNER-SCOPED: the Person is resolved from the session, never client input.
 */
export async function POST(request: Request) {
  const gate = await guardApi("canProvideServices");
  if (gate instanceof NextResponse) return gate;
  const viewer = gate;

  const person = await prisma.person.findUnique({
    where: { user_id: viewer.userId },
    select: { id: true },
  });
  if (!person) {
    return NextResponse.json({ error: "No profile for this user" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const action = body?.action;

  try {
    if (action === "send") {
      const res = await startPhoneVerification(person.id, String(body?.phone ?? ""));
      return NextResponse.json({
        ok: true,
        sent: res.sent,
        masked: res.masked,
        // Present ONLY when no SMS credentials are configured, so the flow is
        // walkable in dev. Never populated once TWILIO_* is set.
        ...(res.devCode ? { devCode: res.devCode } : {}),
      });
    }

    if (action === "verify") {
      await confirmPhoneVerification(person.id, String(body?.code ?? ""));
      return NextResponse.json({
        ok: true,
        state: await getOnboardingState(viewer),
      });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    if (e instanceof PhoneVerificationError) {
      const status = e.code === "COOLDOWN" ? 429 : 400;
      return NextResponse.json({ error: e.message, code: e.code }, { status });
    }
    console.error("[onboarding] phone verification failed:", e);
    return NextResponse.json(
      { error: "Phone verification failed. Please try again." },
      { status: 500 }
    );
  }
}
