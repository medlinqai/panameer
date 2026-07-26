import { NextResponse } from "next/server";
import { z } from "zod";
import { createBuyerAccount, OnboardingError } from "@/lib/onboarding";
import { issueEmailVerification } from "@/lib/verification";

const schema = z
  .object({
    firstName: z.string().trim().min(1).max(80),
    lastName: z.string().trim().min(1).max(80),
    email: z.string().trim().email().max(200),
    password: z.string().min(8).max(200),
    confirm: z.string(),
    tosAccepted: z.literal(true, {
      message: "You must accept the Terms of Service",
    }),
  })
  .refine((d) => d.password === d.confirm, {
    message: "Passwords do not match",
    path: ["confirm"],
  });

/**
 * POST /api/onboarding/buyer/account — buyer "Create My Account". Creates the
 * BUYER backbone + draft BuyerProfile in one transaction (ToS timestamped),
 * then sends the reused Resend verification email. The client signs in after.
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
    const { userId, email } = await createBuyerAccount(parsed.data);
    let devLink: string | undefined;
    try {
      const res = await issueEmailVerification(userId, {
        origin: new URL(request.url).origin,
      });
      if (res.ok && "devLink" in res) devLink = res.devLink;
    } catch (e) {
      console.error("[onboarding] buyer verification email failed:", e);
    }
    return NextResponse.json({ ok: true, email, ...(devLink ? { devLink } : {}) });
  } catch (e) {
    if (e instanceof OnboardingError && e.code === "EMAIL_TAKEN") {
      return NextResponse.json({ error: e.message, code: e.code }, { status: 409 });
    }
    if (e instanceof OnboardingError) {
      return NextResponse.json({ error: e.message, code: e.code }, { status: 400 });
    }
    console.error("[onboarding] buyer account creation failed:", e);
    return NextResponse.json({ error: "Could not create account" }, { status: 500 });
  }
}
