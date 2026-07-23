import { NextResponse } from "next/server";
import { z } from "zod";
import { createProviderAccount, OnboardingError } from "@/lib/onboarding";
import { issueEmailVerification } from "@/lib/verification";

const schema = z
  .object({
    firstName: z.string().trim().min(1).max(80),
    lastName: z.string().trim().min(1).max(80),
    email: z.string().trim().email().max(200),
    password: z.string().min(8).max(200),
    confirm: z.string(),
    experienceLevel: z.enum(["BEGINNER", "MID_CAREER", "EXPERT"]),
    goal: z.enum(["SIDE_HUSTLE", "MAIN_HUSTLE", "BUILD_SKILLS", "NONE"]),
  })
  .refine((d) => d.password === d.confirm, {
    message: "Passwords do not match",
    path: ["confirm"],
  });

/**
 * POST /api/onboarding/provider/account — Step 3. Creates the account backbone
 * + draft profile in one transaction, then sends the Resend verification email.
 * The client signs in (NextAuth credentials) with the same password afterward.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  try {
    const { userId, email } = await createProviderAccount(parsed.data);
    // Fire the verification email. A send failure must not orphan the account —
    // the user can hit "Resend" from the gate — so we don't fail the request.
    let devLink: string | undefined;
    try {
      const res = await issueEmailVerification(userId);
      if (res.ok && "devLink" in res) devLink = res.devLink;
    } catch (e) {
      console.error("[onboarding] verification email send failed:", e);
    }
    return NextResponse.json({ ok: true, email, ...(devLink ? { devLink } : {}) });
  } catch (e) {
    if (e instanceof OnboardingError && e.code === "EMAIL_TAKEN") {
      return NextResponse.json({ error: e.message, code: e.code }, { status: 409 });
    }
    if (e instanceof OnboardingError) {
      return NextResponse.json({ error: e.message, code: e.code }, { status: 400 });
    }
    console.error("[onboarding] account creation failed:", e);
    return NextResponse.json({ error: "Could not create account" }, { status: 500 });
  }
}
