import type { Metadata } from "next";
import { OnboardingFrame } from "@/components/onboarding/OnboardingFrame";

export const metadata: Metadata = { title: "Your Answers Are Saved — Panameer" };

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
