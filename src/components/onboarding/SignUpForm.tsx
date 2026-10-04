"use client";

import Link from "next/link";
import { Field, TextInput, Notice } from "@/components/onboarding/controls";
import { ALL_COUNTRIES } from "@/lib/country";
import { PasswordReveal } from "@/components/PasswordReveal";
import { LegalLink } from "@/components/legal/LegalLink";
import { SocialSignIn } from "@/components/auth/SocialSignIn";

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

export function SignUpForm({
  values,
  onChange,
  error,
  emailLocked = false,
  title,
  callbackUrl = "/join",
  altPrompt,
}: {
  values: SignUpValues;
  onChange: (patch: Partial<SignUpValues>) => void;
  error: string | null;
  /** True when a coordinator invite fixed the email (brief_I). */
  emailLocked?: boolean;
  title: string;
  /** Where OAuth returns to — the seller and buyer paths differ. */
  callbackUrl?: string;
  /** The "wrong side of the marketplace?" link under the form. */
  altPrompt?: { label: string; href: string; cta: string };
}) {
  const passwordTooShort =
    values.password.length > 0 && values.password.length < 8;
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

      {}
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

        {}
        <Field label="Password">
          <PasswordReveal id="signup-password">
            {({ type, className }) => (
              <TextInput
                id="signup-password"
                type={type}
                className={className}
                value={values.password}
                onChange={(e) => onChange({ password: e.target.value })}
                autoComplete="new-password"
                placeholder="Password (8 or more characters)"
              />
            )}
          </PasswordReveal>
          {passwordTooShort && (
            <span className="mt-1 block text-[13px] text-red-700">
              Use at least 8 characters.
            </span>
          )}
        </Field>

        <Field label="Confirm Password">
          <PasswordReveal id="signup-confirm">
            {({ type, className }) => (
              <TextInput
                id="signup-confirm"
                type={type}
                className={className}
                value={values.confirmPassword}
                onChange={(e) => onChange({ confirmPassword: e.target.value })}
                autoComplete="new-password"
                placeholder="Type it again"
              />
            )}
          </PasswordReveal>
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
            {}
            <option value="">Choose a country…</option>
            {ALL_COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
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
            {}
            {}
            <LegalLink href="/terms">Terms of Use</LegalLink>,{" "}
            <LegalLink href="/user-agreement">User Agreement</LegalLink> and{" "}
            <LegalLink href="/privacy">Privacy Policy</LegalLink>
            .
          </span>
        </label>
      </div>

      {}

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
