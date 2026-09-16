"use client";

import { useState, type ReactNode } from "react";

/**
 * THE PASSWORD REVEAL TOGGLE — ONE IMPLEMENTATION, EVERY PASSWORD FIELD
 * (`P1-ALL-E528` PART A2).
 *
 * > **SCOTT, 2026-09-16, locked out and unable to get back in:** *"there is also
 * > no way to see what i entered while i am entering it."*
 *
 * ⚠⚠ THIS IS NOT COSMETIC AND THE WEEK IS THE PROOF. Scott typed `.cpm` for
 * `.com` three times running on 2026-09-15 (`E522`) — `p` and `o` are adjacent
 * keys. A masked field turns one slipped key into *"invalid email or password"*,
 * which sends somebody off to reset a password that was never wrong. It also
 * climbs the five-attempt lockout counter while they do it.
 *
 * ── ⚠⚠ THIS PATTERN WAS ALREADY IN THE CODEBASE. IT IS EXTRACTED, NOT INVENTED ─
 *
 * `SignUpForm` (brief_W / E047) already shipped exactly this control: an eye /
 * eye-off button, `aria-label` + `aria-pressed`, `pr-12` on the input, and ONE
 * input whose `type` flips. ⚠ So the brief's *"eye icon or a `Show` text
 * button — PROPOSE which"* was already answered by the app, and the answer is
 * the eye. Writing a second, differently-shaped control would have made two
 * conventions where there was one. ⚠⚠ THE ICONS AND THE MARKUP BELOW ARE
 * `SignUpForm`'s, MOVED HERE — `SignUpForm` now imports them back.
 *
 * ── ⚠ ONE INPUT, NOT TWO ────────────────────────────────────────────────────
 *
 * `type="password"` → `type="text"` on the SAME element. Swapping between two
 * inputs loses the value, breaks autofill and moves the caret — the brief says
 * so and it is right.
 *
 * ── ⚠ DEFAULT MASKED, AND IT DOES NOT PERSIST ───────────────────────────────
 *
 * Revealing is a deliberate act per field per page load. Nothing is written to
 * storage, so a revealed field never survives a refresh — a password left
 * visible on someone's screen tomorrow is a worse bug than the one this fixes.
 */

/** ⚠ The input needs room for the button, or the text runs under the eye. */
export const PASSWORD_INPUT_PAD = "pr-12";

export function useRevealState() {
  const [shown, setShown] = useState(false);
  return {
    shown,
    /** ⚠ `type` for the input. Never a second input. */
    type: (shown ? "text" : "password") as "text" | "password",
    toggle: () => setShown((s) => !s),
  };
}

/**
 * The button itself, for callers that already own a positioned wrapper.
 * ⚠ THE ACCESSIBLE NAME SAYS WHAT THE BUTTON WILL DO, not what the state is —
 * the eye alone says nothing to a screen reader, and this is the field people
 * most need told.
 */
export function RevealButton({
  shown,
  onToggle,
  controls,
}: {
  shown: boolean;
  onToggle: () => void;
  /** id of the input, so the button is programmatically tied to it. */
  controls?: string;
}) {
  const label = shown ? "Hide password" : "Show password";
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={label}
      aria-pressed={shown}
      aria-controls={controls}
      title={label}
      className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-2 transition-colors hover:text-magenta"
    >
      {shown ? <EyeOffIcon /> : <EyeIcon />}
    </button>
  );
}

/**
 * THE WRAPPER MOST CALLERS WANT.
 *
 * ⚠ IT WRAPS ONLY THE INPUT, never the label — the button is positioned against
 * the input's box, and a wrapper that swallowed a label above it would centre
 * the eye on the wrong thing. Every call site keeps its own label markup and its
 * own input component, which is why this drops into three differently-shaped
 * forms without changing any of them.
 *
 *   <PasswordReveal>
 *     {({ type, className }) => <TextInput type={type} className={className} … />}
 *   </PasswordReveal>
 */
export function PasswordReveal({
  children,
  id,
}: {
  children: (args: { type: "text" | "password"; className: string }) => ReactNode;
  id?: string;
}) {
  const { shown, type, toggle } = useRevealState();
  return (
    <div className="relative">
      {children({ type, className: PASSWORD_INPUT_PAD })}
      <RevealButton shown={shown} onToggle={toggle} controls={id} />
    </div>
  );
}

/** Eye / eye-off toggle for the password field (brief_W / E047, moved here by E528). */
export function EyeIcon() {
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

export function EyeOffIcon() {
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
