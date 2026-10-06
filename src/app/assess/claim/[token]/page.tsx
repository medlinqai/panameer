import { notFound } from "next/navigation";
import { CLAIM_TERMS_NOTICE, USER_TOS_VERSION } from "@/lib/tos";
import { prisma } from "@/lib/prisma";
import { normalizeEmail } from "@/lib/normalizeEmail";
import { resolveAssessmentCompanyId } from "@/lib/assessment/domain-results";
import { issueSignInToken } from "@/lib/verification";
import { OnboardingFrame } from "@/components/onboarding/OnboardingFrame";
import { VerifiedSignIn } from "@/components/onboarding/VerifiedSignIn";

export const dynamic = "force-dynamic";

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
        tos_accepted_at: new Date(),
        tos_version: USER_TOS_VERSION,
      },
      select: { id: true, locked: true, is_active: true },
    });
  }

  if (!assessment.user_id) {
    await prisma.assessment.update({
      where: { id: assessment.id },
      data: {
        user_id: user.id,
        company_id: await resolveAssessmentCompanyId(user.id),
      },
    });
  }

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
            className="mt-6 inline-flex bg-magenta px-6 py-3 text-[15px] font-bold text-white"
          >
            Open My Report
          </a>
        )}

        {/* THE TERMS, NAMED AND LINKED WS-1a) */}
        <p className="mt-4 text-[13px] leading-relaxed text-ink-2">
          {CLAIM_TERMS_NOTICE.replace(
            " Terms of Use and Privacy Policy.",
            " "
          )}
          <a href="/terms" className="font-semibold text-magenta hover:underline">
            Terms of Use
          </a>
          {" and "}
          <a href="/privacy" className="font-semibold text-magenta hover:underline">
            Privacy Policy
          </a>
          .
        </p>
      </div>
    </OnboardingFrame>
  );
}
