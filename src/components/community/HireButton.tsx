"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

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
