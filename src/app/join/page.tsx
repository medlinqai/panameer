"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { OptionCard } from "@/components/onboarding/controls";
import { OnboardingShell } from "@/components/onboarding/OnboardingShell";

/**
 * Role select — the new /join entry (brief_G). New visitors pick Buyer or
 * Provider; a signed-in user who already has an account is forwarded to their
 * wizard (so /verify-email's "continue" link lands correctly for both roles).
 * Focused, no app/marketing nav.
 */
export default function JoinRoleSelect() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [role, setRole] = useState<"buyer" | "provider" | "recruiter" | null>(null);

  useEffect(() => {
    // If already signed in with a role, skip role select and resume onboarding.
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
    if (role === "buyer") router.push("/join/buyer");
    // PJv2 WS1 (E066/E070) — the sell-your-own vs sell-others fork lives HERE
    // now, at the front of the journey, instead of three screens into the
    // wizard. Both walk /join/provider; `type` picks the itinerary.
    else if (role === "provider") router.push("/join/provider");
    else if (role === "recruiter") router.push("/join/provider?type=recruiter");
  };

  return (
    // E048/E049 — the stock shell and the centred pre-verify title, so role
    // select, sign up and check-email are one format rather than three.
    // E091 — the shared frame like every other onboarding page, with the chooser
    // CAPPED and centred inside it. Widening the cards themselves would just
    // stretch three short labels across 1024px, which is the thing the narrow
    // page was protecting against; capping the column protects it without making
    // this page a different shape from the ones either side of it.
    <OnboardingShell contentWidth="max-w-lg">
      <div className="text-center">
        <h1 className="text-[28px] font-extrabold tracking-[-0.6px]">
          Welcome to Panameer
        </h1>
        <p className="mt-2 text-[17px] text-ink-2">Which describes you best?</p>
      </div>

      <div className="mt-8 space-y-3">
        <OptionCard
          selected={role === "buyer"}
          onClick={() => setRole("buyer")}
          title="Service Buyer"
          // "validated", never "vetted" — the term is locked (walk_backlog).
          description="Post work and hire validated experts."
        />
        <OptionCard
          selected={role === "provider"}
          onClick={() => setRole("provider")}
          title="Service Provider"
          description="Sell your own services and get paid."
        />
        <OptionCard
          selected={role === "recruiter"}
          onClick={() => setRole("recruiter")}
          title="Recruiter"
          description="Represent other providers and place them on work."
        />
      </div>

      <div className="mt-10 flex items-center gap-4 border-t border-line pt-6">
        <button
          onClick={go}
          disabled={!role}
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
