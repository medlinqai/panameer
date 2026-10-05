import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { consumeEmailVerification, issueSignInToken } from "@/lib/verification";
import { OnboardingShell } from "@/components/onboarding/OnboardingShell";
import { VerifiedSignIn } from "@/components/onboarding/VerifiedSignIn";

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const result = token
    ? await consumeEmailVerification(token)
    : ({ ok: false, reason: "invalid" } as const);

  const ok = result.ok;
  const reason = ok ? null : (result as { reason: string }).reason;

  // Only minted on success, and only good for one exchange within 5 minutes.
  const userId = ok ? (result as { userId: string }).userId : null;
  const signInToken = userId ? await issueSignInToken(userId) : null;

  const person = userId
    ? await prisma.person.findUnique({
        where: { user_id: userId },
        select: { requesterProfile: { select: { completed_at: true } } },
      })
    : null;
  const destination = person?.requesterProfile
    ? person.requesterProfile.completed_at
      ? "/join/requester/ready"
      : "/join/requester/start"
    : "/join/provider/start";

  return (
    <OnboardingShell compact>
      <div data-onboarding-page className="mx-auto w-full max-w-md border border-line bg-surface p-8 text-center">
        {ok ? (
          <>
            <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-magenta text-2xl font-black text-white">
              ✓
            </div>
            <h1 className="text-[23px] font-extrabold sm:text-[30px]">Email Verified</h1>
            <p className="mt-2 text-ink-2">
              {person?.requesterProfile
                ? "You're all set. Let's get you set up to post work."
                : "You're all set. Let's build your profile."}
            </p>
            {signInToken && (
              <VerifiedSignIn token={signInToken} callbackUrl={destination} />
            )}
          </>
        ) : (
          <>
            <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-line text-2xl font-black text-ink-2">
              !
            </div>
            <h1 className="text-[23px] font-extrabold sm:text-[30px]">
              {reason === "expired" ? "Link Expired" : "Invalid Link"}
            </h1>
            <p className="mt-2 text-ink-2">
              {reason === "expired"
                ? "That verification link has expired. Request a fresh one from the onboarding gate."
                : "We couldn't verify that link. Request a new one from the onboarding gate."}
            </p>
            <Link
              href="/join"
              className="mt-6 inline-flex border-[1.5px] border-line px-6 py-3 font-bold text-ink transition-colors hover:border-[#d9d4e2]"
            >
              Back to Onboarding
            </Link>
          </>
        )}
      </div>
    </OnboardingShell>
  );
}
