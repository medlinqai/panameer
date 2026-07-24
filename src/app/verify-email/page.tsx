import Link from "next/link";
import Image from "next/image";
import { consumeEmailVerification } from "@/lib/verification";

/**
 * Landing page for the tokenized verification link. Verifies server-side, then
 * shows a branded result. On success the user clicks back into /join, whose
 * status poll detects the now-verified email and advances past the gate.
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

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg-soft px-6 text-center font-body text-ink">
      <Link href="/" aria-label="Panameer home">
        <Image
          src="/brand/panameer-logo.png"
          alt="Panameer"
          width={786}
          height={111}
          priority
          className="h-9 w-auto"
        />
      </Link>

      <div className="mt-10 w-full max-w-md rounded-brand border border-line bg-white p-8 shadow-brand">
        {ok ? (
          <>
            <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-magenta text-2xl font-black text-white">
              ✓
            </div>
            <h1 className="text-2xl font-extrabold tracking-[-0.5px]">
              Email Verified
            </h1>
            <p className="mt-2 text-ink-2">
              You&apos;re all set. Head back to continue building your provider
              profile.
            </p>
            <Link
              href="/join"
              className="mt-6 inline-flex rounded-full bg-magenta px-6 py-3 font-bold text-white transition-colors hover:bg-magenta-dark"
            >
              Continue Onboarding →
            </Link>
          </>
        ) : (
          <>
            <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-line text-2xl font-black text-ink-2">
              !
            </div>
            <h1 className="text-2xl font-extrabold tracking-[-0.5px]">
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
