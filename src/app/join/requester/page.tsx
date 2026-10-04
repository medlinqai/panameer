"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { OnboardingShell } from "@/components/onboarding/OnboardingShell";
import {
  canSignUp,
  SignUpForm,
  type SignUpValues,
} from "@/components/onboarding/SignUpForm";
import { VerifyGate } from "@/components/onboarding/VerifyGate";
import { Notice } from "@/components/onboarding/controls";
import { NoProfileYet, readBlockedParams } from "@/components/onboarding/NoProfileYet";

export default function JoinRequesterPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [screen, setScreen] = useState<"signup" | "check_email">("signup");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notRequester, setNotRequester] = useState(false);
  /* `?blocked=` / `?from=` if the transact gate sent them here — see NoProfileYet. */
  const [blockedParams, setBlockedParams] = useState<{ blocked: string | null; from: string | null }>({
    blocked: null,
    from: null,
  });
  const [job, setJob] = useState<"buyer" | "requester">("requester");
  const [email, setEmail] = useState("");
  const [devLink, setDevLink] = useState<string | null>(null);

  const [acct, setAcct] = useState<SignUpValues>({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    country: "United States",
    marketingOptIn: false,
    tosAccepted: false,
  });

  // Land a returning user where they left off rather than on a sign-up form
  // for an account they already have.
  useEffect(() => {
    (async () => {
      setBlockedParams(readBlockedParams());
      setJob(
        new URLSearchParams(window.location.search).get("job") === "buyer"
          ? "buyer"
          : "requester"
      );
      const r = await fetch("/api/onboarding/requester/status");
      if (r.status === 401) {
        setScreen("signup");
      } else if (r.status === 404) {
        setNotRequester(true);
      } else if (r.ok) {
        const s = await r.json();
        setEmail(s.email);
        if (s.emailVerified) {
          router.replace(s.completed ? "/join/requester/ready" : "/join/requester/start");
          return;
        }
        setScreen("check_email");
      }
      setReady(true);
    })();
  }, [router]);

  const createAccount = async () => {
    setError(null);
    setBusy(true);
    try {
      const r = await fetch("/api/onboarding/requester/account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: acct.firstName,
          lastName: acct.lastName,
          email: acct.email,
          password: acct.password,
          country: acct.country,
          marketingOptIn: acct.marketingOptIn,
          tosAccepted: acct.tosAccepted,
          job,
        }),
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(body.error ?? "Could not create account.");
        return;
      }
      // Sign in immediately so the verify gate can poll an owner-scoped status
      // endpoint — the same handshake the provider path uses.
      const res = await signIn("credentials", {
        email: acct.email,
        password: acct.password,
        redirect: false,
      });
      if (res?.error) {
        setError("Account created, but sign-in failed. Please log in.");
        return;
      }
      setEmail(body.email);
      if (body.devLink) setDevLink(body.devLink);
      setScreen("check_email");
    } finally {
      setBusy(false);
    }
  };

  if (!ready) {
    return (
      <div className="grid min-h-screen place-items-center bg-white font-body text-ink-2">
        Loading…
      </div>
    );
  }

  if (notRequester) {
    return (
      <NoProfileYet path="requester" blocked={blockedParams.blocked} from={blockedParams.from} />
    );
  }

  if (screen === "signup") {
    return (
      <OnboardingShell
        compact
        contentWidth="max-w-2xl"
        footer={
          <>
            <button
              onClick={() => router.push("/join?type=buyer")}
              disabled={busy}
              className="border border-ink bg-surface px-6 py-3 font-semibold text-ink transition-colors hover:bg-surface-hover disabled:opacity-50"
            >
              Back
            </button>
            <button
              onClick={createAccount}
              disabled={!canSignUp(acct) || busy}
              className="bg-ink px-8 py-3 font-semibold text-surface transition-colors hover:bg-ink-hover disabled:opacity-50"
            >
              {busy ? "Creating…" : "Create My Account"}
            </button>
          </>
        }
      >
        <SignUpForm
          values={acct}
          onChange={(patch) => setAcct((a) => ({ ...a, ...patch }))}
          error={error}
          title="Sign Up to Buy Services and/or Service Products"
          callbackUrl="/join/requester"
          altPrompt={{
            label: "Looking for work?",
            href: "/join/provider",
            cta: "Apply as a Provider",
          }}
        />
      </OnboardingShell>
    );
  }

  return (
    <OnboardingShell contentWidth="max-w-md">
      <div>
        <h1 className="text-center text-[28px] font-extrabold tracking-[-0.6px]">
          Check Your Email
        </h1>
        {error && (
          <div className="mt-6">
            <Notice>{error}</Notice>
          </div>
        )}
        <div className="mt-6">
          <VerifyGate
            email={email}
            onEmailChange={setEmail}
            statusUrl="/api/onboarding/requester/status"
            initialDevLink={devLink}
            onVerified={() => router.push("/join/requester/start")}
          />
        </div>
      </div>
    </OnboardingShell>
  );
}
