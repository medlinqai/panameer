import Link from "next/link";
import { findByToken } from "@/lib/recommendations";
import { displayFullName } from "@/lib/display";
import { RecommendationForm } from "@/components/console/RecommendationForm";

/**
 * The CONTACT's landing page (J2.4 WS-F / E012).
 *
 * PUBLIC BY DESIGN. The recipient has no Panameer account and is never going to
 * make one to answer a favour, so the emailed token is the whole authorization
 * — the same contract project validation already uses. Everything that makes
 * that safe lives on the token: 32 bytes, hashed at rest, single-use, expiring.
 *
 * Outside the app shell for the same reason /policies is: a person arriving
 * from an email is not a signed-in user and should not meet a console.
 */
export default async function RecommendPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ decline?: string }>;
}) {
  const { token } = await params;
  const { decline } = await searchParams;
  const row = await findByToken(token);

  /*
    ONE PAGE FOR EVERY DEAD TOKEN — bad, used, expired. Distinguishing them for
    an unauthenticated visitor tells an attacker which guesses were close, and
    tells an honest recipient nothing they can act on.
  */
  if (!row || row.status !== "SENT" || row.expires_at < new Date()) {
    return (
      <Shell>
        <h1 className="font-display text-[26px] font-bold">This link isn&apos;t active</h1>
        <p className="mt-3 text-[15.5px] leading-relaxed text-ink-2">
          It may already have been used, or it may have expired — these links are
          good for 30 days. If you still want to write something, ask the person
          who contacted you to send a fresh one.
        </p>
      </Shell>
    );
  }

  const provider = displayFullName(
    row.providerProfile.person.first_name,
    row.providerProfile.person.last_name
  );

  return (
    <Shell>
      <h1 className="font-display text-[26px] font-bold tracking-[-0.5px]">
        Would you recommend {provider}?
      </h1>
      <p className="mt-3 text-[15.5px] leading-relaxed text-ink-2">
        {provider} asked for a few sentences about working together. What you
        write appears on their public Panameer profile, credited to you.
      </p>

      <blockquote className="mt-5 border-l-[3px] border-magenta/40 pl-4 text-[14.5px] leading-relaxed whitespace-pre-line text-ink-2">
        {row.message}
      </blockquote>

      <div className="mt-6">
        <RecommendationForm
          token={token}
          providerName={provider}
          startDeclined={decline === "1"}
          invite={row.contact_off_platform}
        />
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-canvas px-6 py-12 font-body text-ink">
      <div className="mx-auto max-w-2xl rounded-brand border border-line bg-white p-7 shadow-brand">
        <Link href="/" aria-label="Panameer" className="mb-6 block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/panameer-new-on-light.png"
            alt="Panameer"
            className="h-7 w-auto"
          />
        </Link>
        {children}
      </div>
    </main>
  );
}
