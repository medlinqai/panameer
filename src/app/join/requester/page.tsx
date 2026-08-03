"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { OnboardingShell } from "@/components/onboarding/OnboardingShell";
import { SignUpForm, type SignUpValues } from "@/components/onboarding/SignUpForm";
import { VerifyGate } from "@/components/onboarding/VerifyGate";
import { Notice } from "@/components/onboarding/controls";

/**
 * REQUESTER onboarding — journey P1-J1.2 (brief_requester_onboarding).
 *
 * A DELTA off the provider shell, not a second wizard. Same shape end to end —
 * role select → sign up → verify email → intro → step wizard → review → a
 * "ready" state — reusing `OnboardingShell`, `SignUpForm` and `VerifyGate`
 * unchanged. Only the middle steps and the copy differ, which is the whole
 * point of the "one flow + role deltas" decision: a second wizard is a second
 * thing to keep in sync, and the provider one already drifted from its own
 * pages four times (E049 → E064 → E080 → E082).
 *
 * THIS FILE IS THE PRE-VERIFY HALF: sign up, then check-your-email. The signed-
 * in half (the five steps and the review) lives at /join/requester/start and
 * /join/requester/steps, so the wizard doesn't have to carry a sign-up form it
 * only shows once.
 */
export default function JoinRequesterPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [screen, setScreen] = useState<"signup" | "check_email">("signup");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notRequester, setNotRequester] = useState(false);
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
      <div className="grid min-h-screen place-items-center bg-white px-6 text-center font-body text-ink">
        <div>
          <h1 className="text-2xl font-extrabold">You&apos;re already signed in</h1>
          <p className="mt-2 text-ink-2">This account isn&apos;t a requester account.</p>
          <Link href="/dashboard" className="mt-4 inline-block font-bold text-magenta">
            Go to Dashboard →
          </Link>
        </div>
      </div>
    );
  }

  if (screen === "signup") {
    return (
      <OnboardingShell compact contentWidth="max-w-2xl">
        <SignUpForm
          values={acct}
          onChange={(patch) => setAcct((a) => ({ ...a, ...patch }))}
          onSubmit={createAccount}
          onBack={() => router.push("/join?type=buyer")}
          busy={busy}
          error={error}
          /* WS3 — buyer copy. The seller form says "Find Work"; this side is
             the one doing the hiring. */
          title="Sign Up to Find Talent"
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
