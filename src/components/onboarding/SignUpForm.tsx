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
    // max-w-2xl (672px), not the max-w-md this replaced. brief_W specified
    // max-w-xl (576px) for this, but 576 measurably does NOT fit three full
    // "Continue with …" labels in one row: at 576 each button gets 185px and
    // the LinkedIn label alone is 166px, so its brand mark was being squeezed
    // to nothing. 672 is the first standard width where all three fit with
    // their icons at a legible 13.5px — see the note in SocialSignIn.
    <div className="mx-auto w-full max-w-2xl">
      <h1 className="text-center text-[28px] font-extrabold tracking-[-0.6px]">
        Sign Up to Find Work
      </h1>

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
      <div className="mt-5">
        <SocialSignIn callbackUrl="/join/provider" />
      </div>

      <div className="my-4 flex items-center gap-4">
        <span className="h-px flex-1 bg-line" />
        <span className="text-[13px] font-semibold text-ink-2">or</span>
        <span className="h-px flex-1 bg-line" />
      </div>

      <div className="space-y-2.5">
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

        <Field label="Password">
          <div className="relative">
            <TextInput
              type={showPassword ? "text" : "password"}
              value={values.password}
              onChange={(e) => onChange({ password: e.target.value })}
              autoComplete="new-password"
              placeholder="Password (8 or more characters)"
              className="pr-12"
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              // The control is icon-only now, so the accessible name has to
              // come from aria-label — the eye alone says nothing to a screen
              // reader, and this is the field people most need told.
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
              title={showPassword ? "Hide password" : "Show password"}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-2 transition-colors hover:text-magenta"
            >
              {showPassword ? <EyeOffIcon /> : <EyeIcon />}
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

      <div className="mt-5 flex items-center justify-between gap-4 border-t border-line pt-4">
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

      <p className="mt-4 text-center text-[14px] text-ink-2">
        Already have an account?{" "}
        <Link href="/login" className="font-bold text-magenta hover:text-magenta-dark">
          Log In
        </Link>
      </p>
    </div>
  );
}

/** Eye / eye-off toggle for the password field (brief_W / E047). */
function EyeIcon() {
  return (
    <svg
      className="h-[18px] w-[18px]"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      focusable="false"
    >
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg
      className="h-[18px] w-[18px]"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      focusable="false"
    >
      <path d="M10.6 5.2A8.9 8.9 0 0 1 12 5c6.4 0 10 7 10 7a17.6 17.6 0 0 1-3.1 4.05M6.2 6.2A17.7 17.7 0 0 0 2 12s3.6 7 10 7a9 9 0 0 0 4.3-1.05" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
      <path d="m3 3 18 18" />
    </svg>
  );
}

