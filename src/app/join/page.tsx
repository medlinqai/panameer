"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { OptionCard } from "@/components/onboarding/controls";

/**
 * Role select — the new /join entry (brief_G). New visitors pick Buyer or
 * Provider; a signed-in user who already has an account is forwarded to their
 * wizard (so /verify-email's "continue" link lands correctly for both roles).
 * Focused, no app/marketing nav.
 */
export default function JoinRoleSelect() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [role, setRole] = useState<"buyer" | "provider" | null>(null);

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
    else if (role === "provider") router.push("/join/provider");
  };

  return (
    <div className="flex min-h-screen flex-col bg-white font-body text-ink">
      <header className="border-b border-line px-6 py-4">
        <div className="mx-auto flex max-w-3xl items-center">
          <Link href="/" aria-label="Panameer home">
            <Image
              src="/brand/panameer-logo-transparent.png"
              alt="Panameer"
              width={786}
              height={111}
              priority
              className="h-8 w-auto"
            />
          </Link>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-6 py-12 sm:py-16">
        <h1 className="text-[28px] font-extrabold tracking-[-0.6px] sm:text-[34px]">
          Welcome to Panameer
        </h1>
        <p className="mt-2 text-[17px] text-ink-2">Which describes you best?</p>

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
            description="Provide services and get paid."
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

        <p className="mt-6 text-[14px] text-ink-2">
          Already have an account?{" "}
          <Link href="/login" className="font-bold text-magenta hover:text-magenta-dark">
            Log In
          </Link>
        </p>
      </main>
    </div>
  );
}
