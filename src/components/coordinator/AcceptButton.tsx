"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Notice } from "@/components/onboarding/controls";

/**
 * Existing-provider accept: the logged-in invitee links to the coordinator.
 * The server (acceptInviteForUser) enforces the email match + provider profile.
 */
export function AcceptButton({ token }: { token: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const accept = async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/invite/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) {
        const map: Record<string, string> = {
          email_mismatch:
            "This invitation is for a different email. Sign in as the invited account to accept.",
          not_a_provider:
            "This account isn't a provider yet. Complete provider onboarding first.",
          expired: "This invitation has expired.",
          revoked: "This invitation was revoked.",
          used: "This invitation has already been used.",
          invalid: "This invitation link is invalid.",
        };
        setError(map[body.code] ?? body.error ?? "Could not accept.");
        return;
      }
      setDone(body.coordinatorName ?? "your coordinator");
      setTimeout(() => router.push("/dashboard"), 1500);
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <Notice tone="info">
        You&apos;re now connected with <b>{done}</b>. Redirecting to your
        dashboard…
      </Notice>
    );
  }

  return (
    <div className="space-y-3">
      {error && <Notice>{error}</Notice>}
      <button
        onClick={accept}
        disabled={busy}
        className="rounded-full bg-magenta px-6 py-3 font-bold text-white transition-colors hover:bg-magenta-dark disabled:opacity-50"
      >
        {busy ? "Accepting…" : "Accept invitation"}
      </button>
    </div>
  );
}
