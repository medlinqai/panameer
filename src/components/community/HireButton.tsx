"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * ── ⚠⚠⚠ `Hire` — THE SOLE-SOURCED ENTRANCE (`P2-A8-E719`) ────────────────────
 *
 * ⚠ **SCOTT: solid ink, first of the actions, above `Message` and `Connect as a Colleague`.**
 * ⚠⚠ It is the only control on this rail that CREATES something, which is why it is the only
 * one drawn in ink — `E217`'s rule that a solid fill is the primary action, applied to a
 * column that previously had three controls of equal weight and no answer to *"what is the
 * main thing to do here?"*
 *
 * ── ⚠⚠ WHY IT IS A CLIENT COMPONENT AND WHAT THAT BUYS ──────────────────────
 *
 * ⚠ It POSTs and then navigates, so it needs `onClick` and a router. ⚠⚠ **THE `busy` FLAG IS
 * NOT DECORATION: it is the first of the two defences against a double click**, and the
 * second — the one that actually holds — is the server reopening an existing draft. A
 * disabled button stops the second click in THIS tab; it does nothing about a second tab, a
 * refresh, or a slow network. **The brief's "clicking twice creates one draft" is decided in
 * `lib/sole-source.ts`, not here.**
 * ⚠⚠⚠ **IT STAYS BUSY AFTER A SUCCESSFUL POST AND IS NEVER RE-ENABLED** — the page is
 * navigating away, and re-enabling it would offer one more click during the transition.
 */
export function HireButton({ providerPersonId }: { providerPersonId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function hire() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/work-requests/sole-source", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ providerPersonId }),
      });
      const json = (await res.json()) as {
        workRequestId?: string;
        error?: string;
      };
      if (!res.ok || !json.workRequestId) {
        /* ⚠ The server's own sentence, not one invented here — it knows why it refused. */
        setError(json.error ?? "Could not start the request.");
        setBusy(false);
        return;
      }
      router.push(`/work-requests/${json.workRequestId}`);
    } catch {
      /* ⚠⚠ A THROWN FETCH MUST NOT PRODUCE SILENCE. `E516` records five blocks in this
         codebase with `try`/`finally` and no `catch`, where a network failure left the member
         looking at a button that had simply stopped working. */
      setError("Could not reach the server. Try again.");
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={hire}
        disabled={busy}
        data-e719-hire
        className="pm-btn pm-btn-primary transition-colors disabled:opacity-60"
      >
        {/* ⚠ A STATUS SENTENCE INSIDE A BUTTON IS NOT A LABEL AND STAYS A SENTENCE
            (load-bearing rule 11): `Hire` names the action and takes Title Case; the busy
            text reports progress and does not. */}
        {busy ? "Starting your request…" : "Hire"}
      </button>
      {error && (
        <p className="mt-2 text-[12px] leading-relaxed text-red-600" role="alert">
          {error}
        </p>
      )}
    </>
  );
}
