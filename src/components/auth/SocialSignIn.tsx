"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";

/**
 * Google / LinkedIn / Apple sign-in buttons (brief_Q).
 *
 * A button is LIVE only when that provider's credentials exist. Rather than
 * duplicating the env check on the client (where secrets must never go), we
 * read NextAuth's own `/api/auth/providers`, which lists exactly the providers
 * `auth.ts` registered. Absent credentials ⇒ the provider isn't in that list ⇒
 * the button renders disabled with a "coming soon" hint. No build break, no
 * spend, and the client never learns anything secret.
 *
 * OAuth fills identity only — name, email, photo. The provider still walks the
 * profile wizard afterwards; nothing here implies a full LinkedIn import.
 */

type ProviderId = "google" | "linkedin" | "apple";

const BUTTONS: { id: ProviderId; label: string; glyph: string }[] = [
  { id: "google", label: "Continue With Google", glyph: "G" },
  { id: "linkedin", label: "Continue With LinkedIn", glyph: "in" },
  { id: "apple", label: "Continue With Apple", glyph: "" },
];

export function SocialSignIn({
  callbackUrl = "/join/provider",
  disabledHint = "Coming soon",
}: {
  callbackUrl?: string;
  disabledHint?: string;
}) {
  const [available, setAvailable] = useState<Set<string> | null>(null);
  const [busy, setBusy] = useState<ProviderId | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/providers")
      .then((r) => (r.ok ? r.json() : {}))
      .then((data: Record<string, unknown>) => {
        if (!cancelled) setAvailable(new Set(Object.keys(data ?? {})));
      })
      .catch(() => {
        // Fail closed: if we can't tell, show the buttons disabled rather than
        // sending the user into a provider that isn't wired up.
        if (!cancelled) setAvailable(new Set());
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const anyLive =
    available !== null && BUTTONS.some((b) => available.has(b.id));

  return (
    <div className="space-y-3">
      {BUTTONS.map((b) => {
        const live = available?.has(b.id) ?? false;
        return (
          <button
            key={b.id}
            type="button"
            disabled={!live || busy !== null}
            title={live ? undefined : disabledHint}
            onClick={() => {
              setBusy(b.id);
              void signIn(b.id, { callbackUrl });
            }}
            className="flex w-full items-center justify-center gap-3 rounded-full border-[1.5px] border-line px-6 py-3 font-bold text-ink transition-colors hover:border-[#d9d4e2] disabled:cursor-not-allowed disabled:opacity-45"
          >
            <span aria-hidden className="text-[17px]">
              {b.glyph}
            </span>
            {busy === b.id ? "Redirecting…" : b.label}
          </button>
        );
      })}

      {available !== null && !anyLive && (
        <p className="text-center text-[13px] text-ink-2">
          Social sign-in isn&apos;t configured yet — create an account with your
          email below.
        </p>
      )}
    </div>
  );
}
