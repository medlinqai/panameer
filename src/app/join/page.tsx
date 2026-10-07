"use client";

import { useCallback, Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { OptionCard } from "@/components/onboarding/controls";
import { OnboardingShell } from "@/components/onboarding/OnboardingShell";

type UserType = "seller" | "buyer";
type Job = "provider" | "recruiter" | "requester" | "buyer-admin";

const JOBS: Record<UserType, { id: Job; title: string; description: string }[]> = {
  seller: [
    {
      id: "provider",
      title: "Service Provider",
      description: "I sell my services to service buyers",
    },
  ],
  buyer: [
    {
      id: "requester",
      title: "Buyer",
      description: "I hire talent and shop for service products",
    },
    {
      id: "buyer-admin",
      title: "Buyer",
      description: "I review other people's work requests",
    },
  ],
};

function JoinRouter() {
  const router = useRouter();
  const params = useSearchParams();
  const [ready, setReady] = useState(false);

  // a process, which made a five-second fork feel like paperwork.
  const typeParam = params.get("type");
  const isType = typeParam === "seller" || typeParam === "buyer";
  const step: 1 | 2 = isType ? 2 : 1;
  const userType = (isType ? typeParam : null) as UserType | null;

  const [choice, setChoice] = useState<UserType | Job | null>(null);

  const blockedParam = params.get("blocked");
  const fromParam = params.get("from");
  const nextParam = params.get("next");
  const followParam = params.get("follow");

  const withCtx = useCallback(
    (path: string) => {
      if (!blockedParam && !fromParam && !nextParam && !followParam) return path;
      const q = new URLSearchParams(path.includes("?") ? path.slice(path.indexOf("?") + 1) : "");
      if (blockedParam) q.set("blocked", blockedParam);
      if (fromParam) q.set("from", fromParam);
      if (nextParam) q.set("next", nextParam);
      if (followParam) q.set("follow", followParam);
      return `${path.split("?")[0]}?${q}`;
    },
    [blockedParam, fromParam, nextParam, followParam]
  );

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
        if (roles?.isServiceProvider) router.replace(withCtx("/join/provider"));
        // A signed-in buyer-side user resumes THEIR OWN flow. Requester and
        else if (roles?.isRequester) router.replace(withCtx("/join/requester"));
        else if (roles?.isServiceBuyer) router.replace(withCtx("/join/buyer"));
        else setReady(true);
      })
      .catch(() => setReady(true));
  }, [router, withCtx]);

  if (!ready) {
    return (
      <div className="grid min-h-screen place-items-center bg-white font-body text-ink-2">
        Loading…
      </div>
    );
  }

  const go = () => {
    if (!choice) return;

    // R1: one question — Buy or Sell — picks the starting screens; the other side switches on later.
    if (step === 1) {
      router.push(withCtx(choice === "seller" ? "/join/provider" : "/join/requester"));
      return;
    }

    switch (choice) {
      case "provider":
        router.push(withCtx("/join/provider"));
        break;
      case "recruiter":
        // PJv2 WS1 — one wizard, two itineraries; `type` picks which.
        router.push(withCtx("/join/provider?type=recruiter"));
        break;
      // REQUESTER — a real flow now (P1-J1.2), not the coming-soon stub. It is
      case "requester":
        router.push(withCtx("/join/requester"));
        break;
      // THE BUYER WALKS THE REQUESTER WIZARD
      case "buyer-admin":
        router.push(withCtx("/join/requester?job=buyer"));
        break;
    }
  };

  const options =
    step === 1
      ? [
          {
            id: "buyer" as const,
            title: "Buy",
            description: "Hire people and buy service products for your company.",
          },
          {
            id: "seller" as const,
            title: "Sell",
            description: "Sell your services or service products through your company.",
          },
        ]
      : JOBS[userType!];

  return (
    <OnboardingShell
      contentWidth="max-w-lg"
      // THE BAND, WHICH THIS PAGE USED TO OPT OUT OF ( §9). Secondary left
      footer={
        <>
          {step === 2 && (
            <button
              type="button"
              onClick={() => router.push("/join")}
              className="border border-ink bg-surface px-7 py-3 font-semibold transition-colors hover:bg-surface-hover text-ink"
            >
              Back
            </button>
          )}
          <button
            onClick={go}
            disabled={!choice}
            className="ml-auto bg-ink px-8 py-3 font-semibold text-surface transition-colors hover:bg-ink-hover disabled:opacity-50"
          >
            Continue
          </button>
        </>
      }
    >
      <div className="text-center">
        {/* E161 — the H1 names the QUESTION on the page. Both steps said "Welcome */}
        <h1 className="text-[28px] font-extrabold tracking-[-0.6px]">
          {step === 1
            ? "What do you want to do first?"
            : userType === "seller"
              ? "Whose Services Do You Sell?"
              : "What Do You Do on the Buying Side?"}
        </h1>
        {step === 1 ? (
        ) : (
          <p className="mt-2 text-[17px] text-ink-2">
            {userType === "seller"
              ? "This decides the profile you build."
              : "This decides what you can do on your company's account."}
          </p>
        )}
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

      {/* THE ACTION ROW MOVED TO THE FRAME'S BAND §9) */}
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
