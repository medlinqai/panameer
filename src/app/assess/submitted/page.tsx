import type { Metadata } from "next";
import { OnboardingFrame } from "@/components/onboarding/OnboardingFrame";

export const metadata: Metadata = { title: "Your Answers Are Saved — Panameer" };

/**
 * THE FALLBACK, AND ONLY THE FALLBACK.
 *
 * ⚠ THIS IS NO LONGER THE NORMAL LANDING. Submitting goes straight to
 * `/assess/r/<shareToken>` — the report itself. This page is reached only when
 * a 200 comes back without a share token, which should not happen and is
 * treated as "should not happen" rather than as an error screen: the answers
 * ARE saved by then, so dropping the visitor on a 500 would discard a finished
 * assessment over a missing field in a response body.
 *
 * ── WHY THE COPY CHANGED ─────────────────────────────────────────────────────
 *
 * It used to say "Check your email in a minute", written when the report sat
 * BEHIND the email and the link was what verified the address. That stopped
 * being true twice over: the report is now shown on submit, and the send is
 * best-effort — with no RESEND_API_KEY configured nothing is sent at all. So a
 * page whose whole message was "wait for an email" was, on this exact path,
 * telling someone to wait for something that may never arrive and offering no
 * other way through. It now says what is actually known: the answers are saved,
 * the link may or may not be in the inbox, and here is how to get back.
 *
 * No fake progress bar. The score and the report model are computed at submit;
 * an animated percentage on top of finished work would be theatre.
 */
export default async function SubmittedPage({
  searchParams,
}: {
  searchParams: Promise<{ to?: string }>;
}) {
  const { to } = await searchParams;
  return (
    <OnboardingFrame className="marketing-surface">
      <div className="mx-auto max-w-2xl py-4">
        <h1 className="font-display text-[30px] font-bold leading-tight tracking-[-0.5px] sm:text-[36px]">
          Your answers are saved
        </h1>
        <p className="mt-4 text-[17px] text-ink-2">
          We sized the opportunity in Procurement and worked out how much of it the tax
          code can fund — but we couldn&rsquo;t open your report on this screen.
        </p>
        <p className="mt-6 rounded-brand border border-line bg-bg-soft p-5 text-[16px]">
          <span className="font-bold text-ink">Nothing is lost.</span>{" "}
          {to ? (
            <>
              Your report is filed under{" "}
              <span className="font-bold text-ink">{to}</span>. If a link reaches that
              inbox it will open the same report; if it doesn&rsquo;t arrive, reply to
              any Panameer email or start again and we&rsquo;ll bring it straight up.
            </>
          ) : (
            <>
              Your report is filed against the address you gave us. If a link reaches
              that inbox it will open the same report; if it doesn&rsquo;t arrive, start
              again and we&rsquo;ll bring it straight up.
            </>
          )}
        </p>
        <p className="mt-6 text-[15px] text-ink-2">
          A real expert reviews the shortlist before your call. AI does the analysis; a
          person owns the conversation.
        </p>
      </div>
    </OnboardingFrame>
  );
}
