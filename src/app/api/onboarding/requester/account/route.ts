import { NextResponse } from "next/server";
import { z } from "zod";
import { OnboardingError } from "@/lib/onboarding";
import { createRequesterAccount } from "@/lib/requester-onboarding";
import { issueEmailVerification } from "@/lib/verification";

const schema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  email: z.string().trim().email().max(200),
  password: z.string().min(8).max(200),
  country: z.string().trim().max(80).optional(),
  marketingOptIn: z.boolean().optional(),
  tosAccepted: z.literal(true, {
    message: "You must accept the Terms of Service to continue",
  }),
});

/**
 * POST /api/onboarding/requester/account — "Create My Account" on the requester
 * path. Creates the buyer-side backbone + a draft RequesterProfile in one
 * transaction, then sends the shared verification email (buyer audience copy).
 *
 * A send failure must not orphan the account — the verify gate has a Resend —
 * so the mail is best-effort and the request still succeeds.
 */
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  try {
    const { userId, email } = await createRequesterAccount(parsed.data);
    let devLink: string | undefined;
    try {
      const res = await issueEmailVerification(userId, {
        origin: new URL(request.url).origin,
        audience: "buyer",
      });
      if (res.ok && "devLink" in res) devLink = res.devLink;
    } catch (e) {
      console.error("[onboarding] requester verification email failed:", e);
    }
    return NextResponse.json({ ok: true, email, ...(devLink ? { devLink } : {}) });
  } catch (e) {
    if (e instanceof OnboardingError) {
      const status = e.code === "EMAIL_TAKEN" ? 409 : 400;
      return NextResponse.json({ error: e.message, code: e.code }, { status });
    }
    console.error("[onboarding] requester account creation failed:", e);
    return NextResponse.json({ error: "Could not create account" }, { status: 500 });
  }
}
