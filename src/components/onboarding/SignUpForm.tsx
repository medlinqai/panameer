"use client";

import { useState } from "react";
import Link from "next/link";
import { Field, TextInput, Notice } from "@/components/onboarding/controls";
import { LegalLink } from "@/components/legal/LegalLink";
import { SocialSignIn } from "@/components/auth/SocialSignIn";

/**
 * "Sign Up" — pre-verification Page 2, rebuilt to the onboarding deck
 * (brief_P / E001 CHANGE 2, E005).
 *
 * Deck shape: Apple/Google continue buttons + an "or" divider; First name, Last
 * name, Email, password + CONFIRM password (PJv2 WS8 / E065 — reversing E001's
 * single-field decision: a typo in a password you can't see costs a support
 * round-trip); Country defaulting to the United States; a marketing
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
  confirmPassword: string;
  country: string;
  marketingOptIn: boolean;
  tosAccepted: boolean;
};

/**
 * ⚠⚠ ONE DEFINITION OF THE SUBMIT GATE (`P1-J1.1-E246` §5).
 *
 * `E246` moved `Back` and `Create My Account` OUT of this component into
 * `OnboardingFrame`'s full-bleed action band, so the PAGE now needs the same
 * predicate the button used to read locally. ⚠ IT WAS EXTRACTED, NOT COPIED —
 * `P1-J4-E024` is the precedent for what two copies of one rule do to each other.
 * ⚠ `tosAccepted` IS PART OF THE GATE AND MUST STAY. The required-terms checkbox
 * gating the button is a legal control, not a UX nicety.
 */
export function canSignUp(values: SignUpValues): boolean {
  return (
    values.firstName.trim() !== "" &&
    values.lastName.trim() !== "" &&
    values.email.trim() !== "" &&
    values.password.length >= 8 &&
    values.password === values.confirmPassword &&
    values.tosAccepted
  );
}

/*
  ⚠⚠ `onSubmit`, `onBack` AND `busy` WERE REMOVED FROM THIS SIGNATURE (`E246` §5).
  They existed ONLY to drive the button row that moved to `OnboardingFrame`'s action
  band; once the buttons left, all three were dead parameters and each was a new lint
  warning against a 0-new baseline. ⚠ THE CALLERS NOW PASS THOSE HANDLERS TO THE BAND
  DIRECTLY, which is the same wiring one level up — nothing about how submit fires
  changed, and this component never had a `<form>` or a `type="submit"` to begin with.
  ⚠ `error` STAYS: it is still rendered in the form body.
*/
export function SignUpForm({
  values,
  onChange,
  error,
  emailLocked = false,
  title = "Sign Up to Find Work",
  /*
    ⚠ `/join` (`E234`). ⚠ SUPERSEDED, quoted: `"/join/provider"`.
    ⚠⚠ THIS DEFAULT WAS LIVE, UNLIKE `SocialSignIn`'s. `join/provider/page.tsx`
    rendered `<SignUpForm>` WITHOUT a `callbackUrl` and relied on this value to
    keep a provider inside the provider wizard after signup. Flipping the default
    alone would have bounced them out to the chooser mid-funnel — a regression
    dressed as a fix — so that call site now passes `callbackUrl="/join/provider"`
    EXPLICITLY and its behaviour is unchanged. `/join/requester` already passed
    its own.
  */
  callbackUrl = "/join",
  altPrompt,
}: {
  values: SignUpValues;
  onChange: (patch: Partial<SignUpValues>) => void;
  error: string | null;
  /** True when a coordinator invite fixed the email (brief_I). */
  emailLocked?: boolean;
  /**
   * WS3 — the three role-specific strings, parameterised rather than copied
   * into a second form. The defaults are the provider path's existing copy, so
   * this is additive for every caller that already had it right.
   *
   * A second sign-up component was the alternative and would have been a
   * mistake: this one carries the OAuth block, the show/hide password control,
   * the confirm-password comparison and the measured 672px width, and a copy
   * of it would drift from all four.
   */
  title?: string;
  /** Where OAuth returns to — the seller and buyer paths differ. */
  callbackUrl?: string;
  /** The "wrong side of the marketplace?" link under the form. */
  altPrompt?: { label: string; href: string; cta: string };
}) {
  const [showPassword, setShowPassword] = useState(false);

  const passwordTooShort =
    values.password.length > 0 && values.password.length < 8;
  /**
   * Only complain once there is something to compare AND the first field is
   * long enough — otherwise the mismatch error fires on every keystroke while
   * they are still typing the second copy.
   */
  const passwordsMismatch =
    values.confirmPassword.length > 0 &&
    values.password !== values.confirmPassword;


  return (
    // max-w-2xl (672px), not the max-w-md this replaced. brief_W specified
    // max-w-xl (576px) for this, but 576 measurably does NOT fit three full
    // "Continue with …" labels in one row: at 576 each button gets 185px and
    // the LinkedIn label alone is 166px, so its brand mark was being squeezed
    // to nothing. 672 is the first standard width where all three fit with
    // their icons at a legible 13.5px — see the note in SocialSignIn.
    <div className="mx-auto w-full max-w-2xl">
      <h1 className="text-center text-[28px] font-extrabold tracking-[-0.6px]">
        {title}
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
        <SocialSignIn callbackUrl={callbackUrl} />
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

        <Field label="Confirm Password">
          <div className="relative">
            <TextInput
              type={showPassword ? "text" : "password"}
              value={values.confirmPassword}
              onChange={(e) => onChange({ confirmPassword: e.target.value })}
              autoComplete="new-password"
              placeholder="Type it again"
              className="pr-12"
            />
          </div>
          {passwordsMismatch && (
            <span className="mt-1 block text-[13px] text-red-700">
              These don&apos;t match.
            </span>
          )}
          {!passwordsMismatch &&
            values.confirmPassword.length > 0 &&
            values.password.length >= 8 && (
              <span className="mt-1 block text-[13px] font-semibold text-emerald-600">
                ✓ Passwords match.
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
            {/*
              E162 — these OPEN IN A NEW TAB. As ordinary links they navigated
              away mid-signup and browser-back came back to an empty form, so
              reading the terms cost you everything you had typed.
            */}
            {/*
              THE NAMES NOW MATCH THE DOCUMENTS THAT EXIST (brief_user_agreement
              WS-C). This said "Terms of Service", which is not the name of any
              page — the document is called Terms of Use — and it pointed BOTH
              that label and "User Agreement" at /terms, so two of the three
              things being accepted led to the same page and the User Agreement
              was unreadable. Three names, three routes.
            */}
            <LegalLink href="/terms">Terms of Use</LegalLink>,{" "}
            <LegalLink href="/user-agreement">User Agreement</LegalLink> and{" "}
            <LegalLink href="/privacy">Privacy Policy</LegalLink>
            .
          </span>
        </label>
      </div>

      {/*
        ── ⚠⚠ THE BUTTON ROW MOVED TO THE FRAME'S ACTION BAND (`E246` §5) ────────

        ⚠ SUPERSEDED, quoted not deleted — this was a row carrying `Back` and
        `Create My Account` under `mt-5 flex items-center justify-between gap-4
        border-t border-line pt-4`. Its `border-t` was drawn INSIDE the capped
        `max-w-2xl` column, so the rule stopped at the form width instead of running
        edge to edge. That is exactly what Scott filed on the walk; the frame's band
        is full-bleed, so the rule now runs the viewport like every sibling page.

        ⚠⚠ NO SUBMIT CONTRACT CHANGED, AND IT WAS CHECKED BEFORE ANYTHING MOVED:
        this component renders NO `<form>`, no `type="submit"` and no form
        `onSubmit`. Both buttons were always plain `onClick` calls to the `onSubmit`
        / `onBack` PROPS, so moving them changes nothing about how submit fires.
        ⚠ THE TERMS GATE TRAVELLED WITH THEM as `canSignUp(values)` above — ONE
        definition, not a second copy.
        ⚠ `onSubmit`, `onBack` and `busy` REMAIN PROPS here even though this no
        longer renders the buttons: the caller passes the same handlers to the band,
        and removing them would be a wider API change than `E246` asked for.
      */}

      {altPrompt && (
        <p className="mt-4 text-center text-[14px] text-ink-2">
          {altPrompt.label}{" "}
          <Link
            href={altPrompt.href}
            className="font-bold text-magenta hover:text-magenta-dark"
          >
            {altPrompt.cta}
          </Link>
        </p>
      )}

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

