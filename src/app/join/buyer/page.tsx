"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { WizardShell } from "@/components/onboarding/WizardShell";
import { VerifyGate } from "@/components/onboarding/VerifyGate";
import { OptionCard, Field, TextInput, Notice } from "@/components/onboarding/controls";

// Buyer flow is short: create account (+ToS) → verify email → pick tier → done.
const SCREENS = ["account", "verify", "tier"] as const;
type Screen = (typeof SCREENS)[number];

export default function JoinBuyerPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [screen, setScreen] = useState<Screen>("account");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notBuyer, setNotBuyer] = useState(false);

  const [acct, setAcct] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirm: "",
    tos: false,
  });
  const [email, setEmail] = useState("");
  const [devLink, setDevLink] = useState<string | null>(null);
  const [tier, setTier] = useState<"BASIC" | "BUSINESS_PLUS" | null>(null);

  const idx = SCREENS.indexOf(screen);
  const progress = (idx + 1) / (SCREENS.length + 1); // +1 so "done" isn't 100% mid-flow

  // Land on the right step for a returning/refreshing user.
  useEffect(() => {
    (async () => {
      const r = await fetch("/api/onboarding/buyer/status");
      if (r.status === 401) {
        setScreen("account");
      } else if (r.status === 404) {
        setNotBuyer(true);
      } else if (r.ok) {
        const s = await r.json();
        setEmail(s.email);
        setTier(s.subscriptionTier ?? null);
        setScreen(s.emailVerified ? "tier" : "verify");
      }
      setReady(true);
    })();
  }, []);

  const createAccount = async () => {
    setError(null);
    if (acct.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (acct.password !== acct.confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (!acct.tos) {
      setError("Please accept the Terms of Service.");
      return;
    }
    setBusy(true);
    try {
      const r = await fetch("/api/onboarding/buyer/account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: acct.firstName,
          lastName: acct.lastName,
          email: acct.email,
          password: acct.password,
          confirm: acct.confirm,
          tosAccepted: acct.tos,
        }),
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(body.error ?? "Could not create account.");
        return;
      }
      const signInRes = await signIn("credentials", {
        email: acct.email,
        password: acct.password,
        redirect: false,
      });
      if (signInRes?.error) {
        setError("Account created, but sign-in failed. Please log in.");
        return;
      }
      setEmail(body.email);
      if (body.devLink) setDevLink(body.devLink);
      setScreen("verify");
    } finally {
      setBusy(false);
    }
  };

  const chooseTier = async (choice: "BASIC" | "BUSINESS_PLUS") => {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/onboarding/buyer/tier", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier: choice }),
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(body.error ?? "Could not save your choice.");
        return;
      }
      // Hand off into the first Work Request (brief_L). It's skippable — the
      // wizard's "Skip for now" lands on /dashboard.
      router.push("/work/new");
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

  if (notBuyer) {
    return (
      <div className="grid min-h-screen place-items-center bg-white px-6 text-center font-body text-ink">
        <div>
          <h1 className="text-2xl font-extrabold">You&apos;re already signed in</h1>
          <p className="mt-2 text-ink-2">This account isn&apos;t a buyer account.</p>
          <Link href="/dashboard" className="mt-4 inline-block font-bold text-magenta">
            Go to dashboard →
          </Link>
        </div>
      </div>
    );
  }

  if (screen === "account") {
    return (
      <WizardShell
        progress={progress}
        title="Sign Up to Hire Talent"
        subtitle="Create your account to post work and hire experts."
        canBack={false}
        busy={busy}
        onContinue={createAccount}
        continueLabel="Create My Account"
        continueDisabled={
          !acct.firstName ||
          !acct.lastName ||
          !acct.email ||
          !acct.password ||
          !acct.tos
        }
      >
        <div className="space-y-4">
          {error && <Notice>{error}</Notice>}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="First name">
              <TextInput
                value={acct.firstName}
                onChange={(e) => setAcct({ ...acct, firstName: e.target.value })}
                autoComplete="given-name"
              />
            </Field>
            <Field label="Last name">
              <TextInput
                value={acct.lastName}
                onChange={(e) => setAcct({ ...acct, lastName: e.target.value })}
                autoComplete="family-name"
              />
            </Field>
          </div>
          <Field label="Email">
            <TextInput
              type="email"
              value={acct.email}
              onChange={(e) => setAcct({ ...acct, email: e.target.value })}
              autoComplete="email"
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Password" hint="At least 8 characters">
              <TextInput
                type="password"
                value={acct.password}
                onChange={(e) => setAcct({ ...acct, password: e.target.value })}
                autoComplete="new-password"
              />
            </Field>
            <Field label="Confirm password">
              <TextInput
                type="password"
                value={acct.confirm}
                onChange={(e) => setAcct({ ...acct, confirm: e.target.value })}
                autoComplete="new-password"
              />
            </Field>
          </div>

          <label className="flex items-start gap-3 rounded-brand border border-line p-4">
            <input
              type="checkbox"
              checked={acct.tos}
              onChange={(e) => setAcct({ ...acct, tos: e.target.checked })}
              className="mt-1 h-4 w-4 accent-magenta"
            />
            <span className="text-[14.5px] text-ink-2">
              Yes, I understand and agree to the{" "}
              <span className="font-semibold text-ink">
                Panameer Terms of Service
              </span>
              , including the{" "}
              <span className="font-semibold text-ink">User Agreement</span> and{" "}
              <span className="font-semibold text-ink">Privacy Policy</span>.
            </span>
          </label>

          <p className="text-[14px] text-ink-2">
            Looking for work?{" "}
            <Link
              href="/join/provider"
              className="font-bold text-magenta hover:text-magenta-dark"
            >
              Apply as a provider
            </Link>
          </p>
        </div>
      </WizardShell>
    );
  }

  if (screen === "verify") {
    return (
      <WizardShell
        progress={progress}
        title="Verify your email"
        canBack={false}
        hideFooter
      >
        <VerifyGate
          email={email}
          onEmailChange={setEmail}
          statusUrl="/api/onboarding/buyer/status"
          initialDevLink={devLink}
          onVerified={() => setScreen("tier")}
        />
      </WizardShell>
    );
  }

  // tier
  return (
    <WizardShell
      progress={progress}
      title="Choose your plan"
      subtitle="Start free, or try Business Plus. No payment required now."
      canBack={false}
      busy={busy}
      hideFooter
    >
      {error && <Notice>{error}</Notice>}
      <div className="grid gap-4 sm:grid-cols-2">
        <div
          className={
            "rounded-[18px] border-2 p-6 " +
            (tier === "BUSINESS_PLUS" ? "border-magenta shadow-brand" : "border-line")
          }
        >
          <h3 className="text-[20px] font-bold">Business Plus</h3>
          <p className="mt-1 text-[14.5px] text-ink-2">
            Instant access to the top 1% of talent, plus ERP integration. Start a
            free trial — no card required.
          </p>
          <ul className="mt-4 grid gap-2 text-[14.5px]">
            <li>✓ Top-1% vetted talent</li>
            <li>✓ One-click ERP punchout</li>
            <li>✓ Priority matching &amp; support</li>
          </ul>
          <button
            disabled={busy}
            onClick={() => {
              setTier("BUSINESS_PLUS");
              chooseTier("BUSINESS_PLUS");
            }}
            className="mt-6 w-full rounded-full bg-magenta px-6 py-3 font-bold text-white transition-colors hover:bg-magenta-dark disabled:opacity-50"
          >
            Start Business Plus Trial
          </button>
        </div>

        <div className="rounded-[18px] border-2 border-line p-6">
          <h3 className="text-[20px] font-bold">Basic</h3>
          <p className="mt-1 text-[14.5px] text-ink-2">
            Everything you need to post work and hire your first experts — free.
          </p>
          <ul className="mt-4 grid gap-2 text-[14.5px]">
            <li>✓ Unlimited work requests</li>
            <li>✓ Browse &amp; invite providers</li>
            <li>✓ Settle by hour or milestone</li>
          </ul>
          <button
            disabled={busy}
            onClick={() => {
              setTier("BASIC");
              chooseTier("BASIC");
            }}
            className="mt-6 w-full rounded-full border-[1.5px] border-line px-6 py-3 font-bold text-ink transition-colors hover:border-[#d9d4e2] disabled:opacity-50"
          >
            Continue with Basic
          </button>
        </div>
      </div>
    </WizardShell>
  );
}
