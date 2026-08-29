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
  /* `?blocked=` / `?from=` if the transact gate sent them here — see NoProfileYet. */
  const [blockedParams, setBlockedParams] = useState<{ blocked: string | null; from: string | null }>({
    blocked: null,
    from: null,
  });
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

  /*
    ⚠ THE 404 MEANS "NO REQUESTER PROFILE", NOT "WRONG ACCOUNT TYPE" —
    `P1-J1.2-E009`. `getRequesterState` throws whenever `requesterProfile` is
    missing, and a requester has no type flag at all, so this route cannot tell
    "not started" from "provider account" even in principle. See NoProfileYet.
  */
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
        /*
          ── ⚠⚠ THIS SCREEN NEEDED THE BAND TOO (`P1-J1.1-E246` §5) ───────────────

          ⚠ THE BRIEF SAYS `/join/provider`'s SIGN-UP IS *"the one page that opts out
          of the band"*. IT IS NOT. THIS PAGE RENDERS THE SAME `SignUpForm` AND ALSO
          PASSED NO `footer`, so §5's move — taking the button row out of the form so
          the rule runs full-bleed — would have left THIS screen with NO Back and NO
          Create My Account at all. Reported at `E246` and fixed here rather than
          shipped broken; the alternative was a sign-up page with no way to sign up.
          ⚠ SAME TREATMENT, SAME HANDLERS as the provider side, and `canSignUp` is
          IMPORTED rather than reimplemented — one definition of the gate,
          `tosAccepted` included (`P1-J4-E024`).
        */
        footer={
          <>
            <button
              onClick={() => router.push("/join?type=buyer")}
              disabled={busy}
              className="rounded-full border-[1.5px] border-line px-6 py-3 font-bold text-ink transition-colors hover:border-[#d9d4e2] disabled:opacity-50"
            >
              Back
            </button>
            <button
              onClick={createAccount}
              disabled={!canSignUp(acct) || busy}
              className="rounded-full bg-magenta px-8 py-3 font-bold text-white transition-colors hover:bg-magenta-dark disabled:opacity-50"
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
