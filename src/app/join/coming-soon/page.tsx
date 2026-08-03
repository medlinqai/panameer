"use client";

import { Suspense, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { OnboardingShell } from "@/components/onboarding/OnboardingShell";

/**
 * The BUYER (the job, not the side) stub — and only that job now.
 *
 * The Requester used to land here too. It has a real flow as of P1-J1.2, so
 * this page stopped claiming that "the part that knows the difference between a
 * Requester and a Buyer isn't finished": half of it is, and telling a Buyer
 * otherwise sends them to sign up as something they aren't.
 *
 * A requester who reaches this URL directly is sent to their own flow rather
 * than shown a stub for a journey they don't want.
 */
function ComingSoon() {
  const job = useSearchParams().get("job");
  const router = useRouter();

  // ?job=requester is a stale link (the fork stopped producing it) — send them
  // to the flow that now exists.
  useEffect(() => {
    if (job === "requester") router.replace("/join/requester");
  }, [job, router]);
  if (job === "requester") return null;

  return (
    <OnboardingShell contentWidth="max-w-lg">
      <div className="text-center">
        <h1 className="text-[28px] font-extrabold tracking-[-0.6px]">
          Buyer onboarding is on its way
        </h1>
        <p className="mx-auto mt-3 max-w-md text-[16px] leading-relaxed text-ink-2">
          The Buyer journey — the person who supports the buying — is still
          being built. If you&apos;re the one who <b>needs the work done</b>,
          that&apos;s a Requester, and that flow is ready now.
        </p>
      </div>

      <div className="mt-9 flex flex-col items-center gap-3">
        <Link
          href="/join/requester"
          className="rounded-full bg-magenta px-8 py-3 font-bold text-white transition-colors hover:bg-magenta-dark"
        >
          Sign Up as a Requester
        </Link>
        <Link
          href="/join/buyer"
          className="text-[14px] font-bold text-ink-2 underline underline-offset-4 hover:text-magenta"
        >
          Create a buyer account anyway
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
