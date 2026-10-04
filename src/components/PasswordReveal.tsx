"use client";

import { useState, type ReactNode } from "react";

export const PASSWORD_INPUT_PAD = "pr-12";

export function useRevealState() {
  const [shown, setShown] = useState(false);
  return {
    shown,
    type: (shown ? "text" : "password") as "text" | "password",
    toggle: () => setShown((s) => !s),
  };
}

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
