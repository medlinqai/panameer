"use client";

import { useState } from "react";
import Link from "next/link";
import { Field, TextInput, Notice } from "@/components/onboarding/controls";
import { SocialSignIn } from "@/components/auth/SocialSignIn";

/**
 * "Sign Up" — pre-verification Page 2, rebuilt to the onboarding deck
 * (brief_P / E001 CHANGE 2, E005).
 *
 * Deck shape: Apple/Google continue buttons + an "or" divider; First name, Last
 * name, Email, ONE password field (8+, show/hide — the Confirm Password field
 * is deliberately GONE); Country defaulting to the United States; a marketing
 * opt-in checkbox; a REQUIRED terms checkbox; Back + "Create My Account".
 *
 * This page carries NO stepper (E001 CHANGE 1) — its parent renders it outside
 * the counter-bearing wizard chrome.
 */

const COUNTRIES = [
  "United States",
  "Canada",
  "United Kingdom",
  "Ireland",
  "Australia",
  "New Zealand",
  "India",
  "Germany",
  "France",
  "Netherlands",
  "Spain",
  "Poland",
  "Brazil",
  "Mexico",
  "Singapore",
  "United Arab Emirates",
  "South Africa",
  "Other",
];

export type SignUpValues = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  country: string;
  marketingOptIn: boolean;
  tosAccepted: boolean;
};

export function SignUpForm({
  values,
  onChange,
  onSubmit,
  onBack,
  busy,
  error,
  emailLocked = false,
}: {
  values: SignUpValues;
  onChange: (patch: Partial<SignUpValues>) => void;
  onSubmit: () => void;
  onBack: () => void;
  busy: boolean;
  error: string | null;
  /** True when a coordinator invite fixed the email (brief_I). */
  emailLocked?: boolean;
}) {
  const [showPassword, setShowPassword] = useState(false);

  const passwordTooShort =
    values.password.length > 0 && values.password.length < 8;

  const canSubmit =
    values.firstName.trim() !== "" &&
    values.lastName.trim() !== "" &&
    values.email.trim() !== "" &&
    values.password.length >= 8 &&
    values.tosAccepted;

  return (
    <div className="mx-auto w-full max-w-md">
      <h1 className="text-[28px] font-extrabold tracking-[-0.6px] sm:text-[34px]">
        Sign Up to Find Work
      </h1>
      <p className="mt-2 text-[17px] text-ink-2">
        Create your account to build a provider profile.
      </p>

      {error && (
        <div className="mt-6">
          <Notice>{error}</Notice>
        </div>
      )}

      {/*
        One-click sign-in (brief_Q). Live only for providers whose credentials
        are configured; the rest render disabled. OAuth fills identity only —
        name, email and photo — and the profile wizard still runs afterwards.
      */}
      <div className="mt-8">
        <SocialSignIn callbackUrl="/join/provider" />
      </div>

      <div className="my-6 flex items-center gap-4">
        <span className="h-px flex-1 bg-line" />
        <span className="text-[13px] font-semibold text-ink-2">or</span>
        <span className="h-px flex-1 bg-line" />
      </div>

      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="First Name">
            <TextInput
              value={values.firstName}
              onChange={(e) => onChange({ firstName: e.target.value })}
              autoComplete="given-name"
              placeholder="Scott"
            />
          </Field>
          <Field label="Last Name">
            <TextInput
              value={values.lastName}
              onChange={(e) => onChange({ lastName: e.target.value })}
              autoComplete="family-name"
              placeholder="Walls"
            />
          </Field>
        </div>

        <Field
          label="Email"
          hint={emailLocked ? "This is the address your invitation was sent to." : undefined}
        >
          <TextInput
            type="email"
            value={values.email}
            onChange={(e) => onChange({ email: e.target.value })}
            autoComplete="email"
            placeholder="you@company.com"
            readOnly={emailLocked}
            className={emailLocked ? "bg-bg-soft text-ink-2" : ""}
          />
        </Field>

        <Field
          label="Password"
          hint={
            passwordTooShort
              ? undefined
              : "At least 8 characters."
          }
        >
          <div className="relative">
            <TextInput
              type={showPassword ? "text" : "password"}
              value={values.password}
              onChange={(e) => onChange({ password: e.target.value })}
              autoComplete="new-password"
              placeholder="8+ characters"
              className="pr-16"
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[13px] font-bold text-ink-2 hover:text-magenta"
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
          {passwordTooShort && (
            <span className="mt-1 block text-[13px] text-red-700">
              Use at least 8 characters.
            </span>
          )}
        </Field>

        <Field label="Country">
          <select
            value={values.country}
            onChange={(e) => onChange({ country: e.target.value })}
            className="w-full rounded-[12px] border border-line bg-white px-4 py-3 text-[15px] text-ink outline-none transition-colors focus:border-magenta"
          >
            {COUNTRIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Field>

        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={values.marketingOptIn}
            onChange={(e) => onChange({ marketingOptIn: e.target.checked })}
            className="mt-1 h-4 w-4 accent-[#D72CD6]"
          />
          <span className="text-[14px] text-ink-2">
            Send me helpful emails to find rewarding work and be successful on
            Panameer.
          </span>
        </label>

        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={values.tosAccepted}
            onChange={(e) => onChange({ tosAccepted: e.target.checked })}
            className="mt-1 h-4 w-4 accent-[#D72CD6]"
          />
          <span className="text-[14px] text-ink-2">
            Yes, I agree to the Panameer{" "}
            <Link href="/terms" className="font-semibold text-magenta hover:underline">
              Terms of Service
            </Link>
            ,{" "}
            <Link href="/terms" className="font-semibold text-magenta hover:underline">
              User Agreement
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="font-semibold text-magenta hover:underline">
              Privacy Policy
            </Link>
            .
          </span>
        </label>
      </div>

      <div className="mt-8 flex items-center justify-between gap-4 border-t border-line pt-6">
        <button
          onClick={onBack}
          disabled={busy}
          className="rounded-full border-[1.5px] border-line px-6 py-3 font-bold text-ink transition-colors hover:border-[#d9d4e2] disabled:opacity-50"
        >
          Back
        </button>
        <button
          onClick={onSubmit}
          disabled={!canSubmit || busy}
          className="rounded-full bg-magenta px-8 py-3 font-bold text-white transition-colors hover:bg-magenta-dark disabled:opacity-50"
        >
          {busy ? "Creating…" : "Create My Account"}
        </button>
      </div>

      <p className="mt-6 text-center text-[14px] text-ink-2">
        Already have an account?{" "}
        <Link href="/login" className="font-bold text-magenta hover:text-magenta-dark">
          Log In
        </Link>
      </p>
    </div>
  );
}

