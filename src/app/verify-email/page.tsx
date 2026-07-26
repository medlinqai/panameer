import Link from "next/link";
import { consumeEmailVerification, issueSignInToken } from "@/lib/verification";
import { Logo } from "@/components/Logo";
import { VerifiedSignIn } from "@/components/onboarding/VerifiedSignIn";

/**
 * Landing page for the tokenized verification link (brief_E), reworked by
 * brief_P and again by brief_S.
 *
 *  - E007: the logo uses the transparent asset, so it no longer sits in a white
 *    box on this tinted page.
 *  - E008: success continues to "Get Started Now!", the first page of the
 *    profile build.
 *  - E022 (HARD REQUIREMENT): verifying now SIGNS THE USER IN. We mint a
 *    single-use sign-in token here and hand it to <VerifiedSignIn>, which
 *    exchanges it for a session and redirects. The provider never sees a login
 *    screen.
 *
 * No app/marketing nav — this is part of the focused onboarding flow.
 */
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
  const signInToken = ok
    ? await issueSignInToken((result as { userId: string }).userId)
    : null;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg-soft px-6 text-center font-body text-ink">
      <Logo className="h-9 w-auto" priority />

      <div className="mt-10 w-full max-w-md rounded-brand border border-line bg-white p-8 shadow-brand">
        {ok ? (
          <>
            <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-magenta text-2xl font-black text-white">
              ✓
            </div>
            <h1 className="text-2xl tracking-[-0.5px]">Email Verified</h1>
            <p className="mt-2 text-ink-2">
              You&apos;re all set. Let&apos;s build your profile.
            </p>
            {signInToken && <VerifiedSignIn token={signInToken} />}
          </>
        ) : (
          <>
            <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-line text-2xl font-black text-ink-2">
              !
            </div>
            <h1 className="text-2xl tracking-[-0.5px]">
              {reason === "expired" ? "Link Expired" : "Invalid Link"}
            </h1>
            <p className="mt-2 text-ink-2">
              {reason === "expired"
                ? "That verification link has expired. Request a fresh one from the onboarding gate."
                : "We couldn't verify that link. Request a new one from the onboarding gate."}
            </p>
            <Link
              href="/join"
              className="mt-6 inline-flex rounded-full border-[1.5px] border-line px-6 py-3 font-bold text-ink transition-colors hover:border-[#d9d4e2]"
            >
              Back to Onboarding
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
