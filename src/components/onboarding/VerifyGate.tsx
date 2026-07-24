"use client";

import { useEffect, useState } from "react";
import { Field, TextInput, Notice } from "@/components/onboarding/controls";

/**
 * The email-verification gate body, shared by the provider and buyer wizards
 * (brief_E machinery, reused by brief_G). Polls `statusUrl` until the email is
 * verified, then calls `onVerified(status)` so the parent decides the next
 * screen. Resend + correct-a-mistyped-email hit the generic onboarding
 * endpoints. Render this inside a WizardShell (title + progress, hideFooter).
 */
export function VerifyGate({
  email,
  onEmailChange,
  statusUrl,
  onVerified,
  initialDevLink,
}: {
  email: string;
  onEmailChange: (email: string) => void;
  statusUrl: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onVerified: (status: any) => void;
  initialDevLink?: string | null;
}) {
  const [devLink, setDevLink] = useState<string | null>(initialDevLink ?? null);
  const [resendMsg, setResendMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [newEmail, setNewEmail] = useState(email);

  // Poll for verification; advance the moment it flips.
  useEffect(() => {
    const check = async () => {
      const r = await fetch(statusUrl);
      if (!r.ok) return;
      const s = await r.json();
      if (s.emailVerified) onVerified(s);
    };
    const t = setInterval(check, 4000);
    return () => clearInterval(t);
  }, [statusUrl, onVerified]);

  const resend = async () => {
    setResendMsg(null);
    const r = await fetch("/api/onboarding/resend-verification", { method: "POST" });
    const body = await r.json().catch(() => ({}));
    if (r.status === 429) {
      setResendMsg("Please wait a moment before requesting another email.");
    } else if (r.ok) {
      if (body.devLink) setDevLink(body.devLink);
      setResendMsg("Sent! Check your inbox.");
    } else {
      setResendMsg("Could not resend right now.");
    }
  };

  const checkNow = async () => {
    const r = await fetch(statusUrl);
    if (!r.ok) return;
    const s = await r.json();
    if (s.emailVerified) onVerified(s);
    else setResendMsg("Not verified yet — click the email link first.");
  };

  const saveEmail = async () => {
    setError(null);
    const r = await fetch("/api/onboarding/update-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: newEmail }),
    });
    const body = await r.json().catch(() => ({}));
    if (!r.ok) {
      setError(body.error ?? "Could not update email.");
      return;
    }
    onEmailChange(body.email);
    if (body.devLink) setDevLink(body.devLink);
    setEditing(false);
    setResendMsg("Verification sent to your new address.");
  };

  return (
    <div className="space-y-5">
      <p className="text-[17px] text-ink-2">
        We sent a link to <b className="text-ink">{email}</b>. Click it to
        continue. This page updates automatically once you&apos;re verified.
      </p>

      {devLink && (
        <Notice tone="info">
          Dev mode (no RESEND_API_KEY): open your verification link{" "}
          <a href={devLink} className="font-bold underline">
            here
          </a>
          .
        </Notice>
      )}
      {resendMsg && <Notice tone="info">{resendMsg}</Notice>}
      {error && <Notice>{error}</Notice>}

      <div className="flex flex-wrap gap-3">
        <button
          onClick={checkNow}
          className="rounded-full bg-magenta px-6 py-3 font-bold text-white transition-colors hover:bg-magenta-dark"
        >
          I&apos;ve Verified — Continue
        </button>
        <button
          onClick={resend}
          className="rounded-full border-[1.5px] border-line px-6 py-3 font-bold text-ink transition-colors hover:border-[#d9d4e2]"
        >
          Resend Email
        </button>
      </div>

      {!editing ? (
        <button
          onClick={() => {
            setNewEmail(email);
            setEditing(true);
          }}
          className="text-[14px] font-bold text-ink-2 hover:text-magenta"
        >
          Wrong Email? Change It
        </button>
      ) : (
        <div className="max-w-sm space-y-2">
          <Field label="New Email">
            <TextInput
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
            />
          </Field>
          <div className="flex gap-2">
            <button
              onClick={saveEmail}
              className="rounded-full bg-magenta px-5 py-2.5 font-bold text-white hover:bg-magenta-dark"
            >
              Save &amp; Resend
            </button>
            <button
              onClick={() => setEditing(false)}
              className="rounded-full px-4 py-2.5 font-bold text-ink-2 hover:text-ink"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* TODO(brief_E/G): phone verification is stubbed for V1 — no real SMS. */}
      <p className="border-t border-line pt-4 text-[13px] text-ink-2">
        Phone verification: <b>skipped for now</b> (coming later).
      </p>
    </div>
  );
}
