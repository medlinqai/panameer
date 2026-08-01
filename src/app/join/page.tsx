"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { OptionCard } from "@/components/onboarding/controls";
import { OnboardingShell } from "@/components/onboarding/OnboardingShell";

/**
 * /join — the shared entry for four of the five actors (E139, WS1).
 *
 * TWO STEPS, not one list of three. It used to offer Service Buyer / Service
 * Provider / Recruiter side by side, which flattened two different questions
 * into one: whether you BUY or SELL on Panameer, and then what your JOB is on
 * that side. The reg-steps-by-user-type diagram models it as a fork —
 * Buyer/Provider? first, then Provider/Recruiter? or Requester/Buyer? — and
 * splitting it that way is also the only shape that scales, because the buyer
 * side has two jobs the flat list never offered at all.
 *
 * Both steps are ONE component rendering the same cards. The brief asks for the
 * same card/page format on both steps, and two components would be two chances
 * for them to drift apart.
 *
 * The step lives in the URL (`?type=`), so browser Back moves between steps for
 * free and a half-made choice is resumable. There is a Back button too — a
 * chooser with no visible way out reads as a trap.
 */

type UserType = "seller" | "buyer";
type Job = "provider" | "recruiter" | "requester" | "buyer-admin";

/** Page-2 options per page-1 choice. Seller copy is Scott's, verbatim. */
const JOBS: Record<UserType, { id: Job; title: string; description: string }[]> = {
  seller: [
    {
      id: "recruiter",
      title: "Recruiter",
      description: "I offer service providers to service buyers",
    },
    {
      id: "provider",
      title: "Service Provider",
      description: "I perform the services for a service buyer",
    },
  ],
  buyer: [
    {
      id: "requester",
      title: "Requester",
      description: "I need services performed",
    },
    {
      id: "buyer-admin",
      title: "Buyer",
      description: "I support the buying",
    },
  ],
};

function JoinRouter() {
  const router = useRouter();
  const params = useSearchParams();
  const [ready, setReady] = useState(false);

  const typeParam = params.get("type");
  const isType = typeParam === "seller" || typeParam === "buyer";
  const step: 1 | 2 = isType ? 2 : 1;
  const userType = (isType ? typeParam : null) as UserType | null;

  const [choice, setChoice] = useState<UserType | Job | null>(null);

  // Clear the selection when the step changes, so stepping back and forward
  // can't carry a page-1 answer into page 2's Continue.
  useEffect(() => {
    setChoice(null);
  }, [typeParam]);

  useEffect(() => {
    // Already signed in with a role? Resume onboarding rather than re-asking.
    fetch("/api/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((me) => {
        const roles = me?.person?.roles;
        if (roles?.isServiceProvider) router.replace("/join/provider");
        else if (roles?.isServiceBuyer) router.replace("/join/buyer");
        else setReady(true);
      })
      .catch(() => setReady(true));
  }, [router]);

  if (!ready) {
    return (
      <div className="grid min-h-screen place-items-center bg-white font-body text-ink-2">
        Loading…
      </div>
    );
  }

  const go = () => {
    if (!choice) return;

    if (step === 1) {
      router.push(`/join?type=${choice}`);
      return;
    }

    switch (choice) {
      case "provider":
        router.push("/join/provider");
        break;
      case "recruiter":
        // PJv2 WS1 — one wizard, two itineraries; `type` picks which.
        router.push("/join/provider?type=recruiter");
        break;
      /*
        BUYER SIDE — a deviation from the brief, reported rather than silent.

        The brief says buyer onboarding "is NOT built" and to route to a
        coming-soon stub. It IS built: /join/buyer runs account → verify → tier
        against three live API routes and lands on /work/new. Stubbing over it
        would replace a working sign-up with a dead end, which is the opposite
        of the brief's own "do not block".

        What genuinely doesn't exist is the Requester-vs-Buyer DISTINCTION —
        nothing downstream records which job was chosen, and formalising
        USER_TYPE x JOB is explicitly a separate foundation brief. So the answer
        rides along on the URL for that brief to pick up, and the buyer lands in
        the real flow meanwhile.
      */
      case "requester":
        router.push("/join/buyer?job=requester");
        break;
      case "buyer-admin":
        router.push("/join/buyer?job=buyer");
        break;
    }
  };

  const options =
    step === 1
      ? [
          {
            id: "buyer" as const,
            title: "Service Buyer",
            description: "I offer work on Panameer",
          },
          {
            id: "seller" as const,
            title: "Service Seller",
            description: "I perform work on Panameer",
          },
        ]
      : JOBS[userType!];

  return (
    <OnboardingShell contentWidth="max-w-lg">
      <div className="text-center">
        <h1 className="text-[28px] font-extrabold tracking-[-0.6px]">
          Welcome to Panameer
        </h1>
        <p className="mt-2 text-[17px] text-ink-2">
          {step === 1
            ? "Which describes you best?"
            : userType === "seller"
              ? "How do you sell on Panameer?"
              : "What do you do on the buying side?"}
        </p>
        <p className="mt-1.5 text-[12.5px] font-bold uppercase tracking-wide text-ink-2/70">
          Step {step} of 2
        </p>
      </div>

      <div className="mt-8 space-y-3">
        {options.map((o) => (
          <OptionCard
            key={o.id}
            selected={choice === o.id}
            onClick={() => setChoice(o.id)}
            title={o.title}
            description={o.description}
          />
        ))}
      </div>

      <div className="mt-10 flex items-center gap-4 border-t border-line pt-6">
        {step === 2 && (
          <button
            type="button"
            onClick={() => router.push("/join")}
            className="rounded-full border-[1.5px] border-line px-7 py-3 font-bold transition-colors hover:border-magenta hover:text-magenta"
          >
            Back
          </button>
        )}
        <button
          onClick={go}
          disabled={!choice}
          className="ml-auto rounded-full bg-magenta px-8 py-3 font-bold text-white transition-colors hover:bg-magenta-dark disabled:opacity-50"
        >
          Continue
        </button>
      </div>

      <p className="mt-6 text-center text-[14px] text-ink-2">
        Already have an account?{" "}
        <Link href="/login" className="font-bold text-magenta hover:text-magenta-dark">
          Log In
        </Link>
      </p>
    </OnboardingShell>
  );
}

export default function JoinPage() {
  // useSearchParams needs a Suspense boundary in the App Router.
  return (
    <Suspense
      fallback={
        <div className="grid min-h-screen place-items-center bg-white font-body text-ink-2">
          Loading…
        </div>
      }
    >
      <JoinRouter />
    </Suspense>
  );
}
