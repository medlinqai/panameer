import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { normalizeEmail } from "@/lib/normalizeEmail";
import { issueSignInToken } from "@/lib/verification";
import { OnboardingFrame } from "@/components/onboarding/OnboardingFrame";
import { VerifiedSignIn } from "@/components/onboarding/VerifiedSignIn";

export const dynamic = "force-dynamic";

/**
 * THE ONE-CLICK ACCOUNT (WS-B).
 *
 * Clicking the link in the report email lands here, and the visitor is signed
 * in and reading their report without typing anything. No password screen, no
 * "check your email" a second time.
 *
 * ── WHY THIS IS NOT A PASSWORD BYPASS ────────────────────────────────────────
 *
 * The share token was mailed to the address the person typed into the
 * assessment, so holding it proves control of that inbox — the same proof the
 * ordinary email-verification link provides. That is why the account is created
 * with `email_verified` set: the click IS the verification, and asking them to
 * verify an address they just demonstrably received mail at would be
 * ceremony. It then hands off to the SAME single-use, five-minute SIGNIN token
 * and the SAME `VerifiedSignIn` component the provider flow uses — no second
 * auth path was written for this.
 *
 * ── WHAT GETS CREATED, AND WHAT DELIBERATELY DOES NOT ────────────────────────
 *
 * A `User` and nothing else. No Person, no Company, no P-Account. The email
 * promises "your report is saved and you can come back to it" and that is
 * exactly what a User delivers; a Person needs a Company, and inventing an org
 * record for someone who has answered eight questions would put a half-built
 * tenant in the backbone for every curious visitor. `Viewer.pAccountId` is
 * already documented as null for a freshly signed-up user, so this is a state
 * the access layer expects rather than one this page invents.
 *
 * No password is set. They arrive by link; if they later want a password the
 * ordinary reset path issues one.
 *
 * ── IDEMPOTENT ───────────────────────────────────────────────────────────────
 *
 * The link is in an inbox, so it WILL be clicked twice — on a phone, then on a
 * laptop. Re-clicking finds the existing user and mints a fresh sign-in token
 * rather than erroring or creating a duplicate. The share token is not consumed
 * on use, because it is also the URL of the report they are meant to keep.
 */
export default async function ClaimPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const assessment = await prisma.assessment.findUnique({
    where: { share_token: token },
    select: { id: true, email: true, company_name: true, user_id: true },
  });
  if (!assessment) notFound();

  const email = normalizeEmail(assessment.email);

  let user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, locked: true, is_active: true },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        email,
        // The click on a link sent to this address IS the verification.
        email_verified: new Date(),
      },
      select: { id: true, locked: true, is_active: true },
    });
  }

  if (!assessment.user_id) {
    await prisma.assessment.update({
      where: { id: assessment.id },
      data: { user_id: user.id },
    });
  }

  /*
    A LOCKED OR DEACTIVATED ACCOUNT STILL GETS THE REPORT, just not a session.
    The token is theirs and the report is theirs; silently signing in an account
    an admin has locked would route around the lock, and blocking the report
    would punish them for it. So: no sign-in token, straight to the report.
  */
  const signInToken =
    user.locked || user.is_active === false ? null : await issueSignInToken(user.id);

  const destination = `/assess/r/${token}`;

  return (
    <OnboardingFrame>
      <div className="mx-auto max-w-xl py-6 text-center">
        <h1 className="font-display text-[26px] font-bold tracking-[-0.4px]">
          Opening your report…
        </h1>
        <p className="mt-3 text-[15.5px] text-ink-2">
          Setting up your account for {assessment.company_name} so this stays saved.
        </p>
        {signInToken ? (
          <VerifiedSignIn token={signInToken} callbackUrl={destination} />
        ) : (
          <a
            href={destination}
            className="mt-6 inline-flex rounded-full bg-magenta px-6 py-3 text-[15px] font-bold text-white"
          >
            Open my report
          </a>
        )}
      </div>
    </OnboardingFrame>
  );
}
