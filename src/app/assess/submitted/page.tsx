import type { Metadata } from "next";
import { OnboardingFrame } from "@/components/onboarding/OnboardingFrame";

export const metadata: Metadata = { title: "Building your report — Panameer" };

/**
 * STEP 3 — submit → "we're building it, check your email".
 *
 * ⚠ IT SAYS "CHECK YOUR EMAIL" BECAUSE THE REPORT IS BEHIND THE EMAIL, and
 * that is deliberate rather than an accident of implementation. The report link
 * is what verifies the address, so a screen that just showed the report would
 * cost the only thing the whole free assessment is trading for.
 *
 * No fake progress bar. The copy prototype's "Our AI is building your custom
 * report" is a true statement about work that has already happened — the score
 * and the report model are computed at submit — and an animated percentage on
 * top of it would be theatre.
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
          Thanks — that&rsquo;s everything we need
        </h1>
        <p className="mt-4 text-[17px] text-ink-2">
          Our AI is building your custom report. We&rsquo;re sizing the opportunity in
          Procurement and figuring out how much of it the tax code can fund.
        </p>
        <p className="mt-6 rounded-brand border border-line bg-bg-soft p-5 text-[16px]">
          <span className="font-bold text-ink">Check your email in a minute</span>
          {to ? (
            <>
              {" "}
              — we sent your report link to{" "}
              <span className="font-bold text-ink">{to}</span>.
            </>
          ) : (
            <> — your report link is on its way.</>
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
