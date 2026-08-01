"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { OnboardingShell } from "@/components/onboarding/OnboardingShell";

/**
 * Buyer-side onboarding stub (MASTER WS1).
 *
 * The brief is explicit that buyer onboarding isn't built and this route should
 * be a coming-soon stub. Worth recording that the premise is partly wrong —
 * /join/buyer runs account → verify → tier against three live API routes — so
 * rather than a dead end, this names what is genuinely missing (the
 * Requester-vs-Buyer distinction, which nothing downstream records yet) and
 * offers the working sign-up as the way forward.
 */
function ComingSoon() {
  const job = useSearchParams().get("job");
  const label = job === "requester" ? "Requester" : "Buyer";

  return (
    <OnboardingShell contentWidth="max-w-lg">
      <div className="text-center">
        <h1 className="text-[28px] font-extrabold tracking-[-0.6px]">
          {label} onboarding is on its way
        </h1>
        <p className="mx-auto mt-3 max-w-md text-[16px] leading-relaxed text-ink-2">
          We&apos;re building the buying side of Panameer now. The part that
          knows the difference between a Requester and a Buyer isn&apos;t
          finished — but you can still create your account and start posting
          work.
        </p>
      </div>

      <div className="mt-9 flex flex-col items-center gap-3">
        <Link
          href="/join/buyer"
          className="rounded-full bg-magenta px-8 py-3 font-bold text-white transition-colors hover:bg-magenta-dark"
        >
          Create a buyer account
        </Link>
        <Link
          href="/join?type=buyer"
          className="text-[14px] font-bold text-ink-2 underline underline-offset-4 hover:text-magenta"
        >
          Back
        </Link>
      </div>
    </OnboardingShell>
  );
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <ComingSoon />
    </Suspense>
  );
}
