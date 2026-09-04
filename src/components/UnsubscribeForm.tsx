"use client";

import { useState } from "react";

/**
 * THE UNSUBSCRIBE BUTTON (`P1-ALL-E386`).
 *
 * ⚠⚠ ONE CLICK. NO CONFIRMATION. The click IS the instruction — a confirm step
 * is a reason to mark the mail as spam instead, which costs the sending domain
 * far more than the unsubscribe would have.
 *
 * ⚠ "EVERYTHING" IS OFFERED ONLY AFTER THE PRIMARY ACTION HAS ALREADY WORKED.
 * Leading with it would turn one unwanted category into total silence by
 * default — nobody clicking "stop these" is asking to be cut off entirely.
 *
 * ⚠ IT DECIDES NOTHING. The token is re-verified server-side on every call; a
 * page that renders a button is not an authorisation.
 */
export function UnsubscribeForm({
  email,
  category,
  token,
  categoryLabel,
  alreadyDone,
}: {
  email: string;
  category: string | null;
  token: string;
  categoryLabel: string | null;
  alreadyDone: boolean;
}) {
  const [done, setDone] = useState(alreadyDone);
  const [allDone, setAllDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function go(scope: "category" | "all") {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, category, token, scope }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => null);
        setError(d?.error ?? "That didn't go through. Try the link again.");
        return;
      }
      if (scope === "all") setAllDone(true);
      setDone(true);
    } catch {
      setError("That didn't go through. Try the link again.");
    } finally {
      setBusy(false);
    }
  }

  if (allDone) {
    return (
      <p className="mt-6 rounded-brand border border-line bg-white p-4 text-[15px] leading-relaxed">
        Done — Panameer won&apos;t email this address again.
      </p>
    );
  }

  if (done) {
    return (
      <div className="mt-6">
        <p className="rounded-brand border border-line bg-white p-4 text-[15px] leading-relaxed">
          {categoryLabel
            ? `Done — no more ${categoryLabel} emails to this address.`
            : "Done — no more emails to this address."}
        </p>
        {/* ⚠ THE SECONDARY ACTION, AND ONLY NOW. */}
        {category && (
          <button
            type="button"
            onClick={() => go("all")}
            disabled={busy}
            className="mt-3 text-[13.5px] font-semibold text-ink-2 underline hover:text-magenta"
          >
            {busy ? "Working…" : "Unsubscribe from everything Panameer sends"}
          </button>
        )}
        {error && <p className="mt-2 text-[13px] text-red-600">{error}</p>}
      </div>
    );
  }

  return (
    <div className="mt-6">
      <button
        type="button"
        onClick={() => go(category ? "category" : "all")}
        disabled={busy}
        className="min-h-[44px] rounded-full bg-magenta px-6 text-[15px] font-bold text-white transition-colors hover:bg-magenta/90 disabled:bg-ink-2/20"
      >
        {busy ? "Working…" : categoryLabel ? `Stop ${categoryLabel} emails` : "Unsubscribe"}
      </button>
      {error && <p className="mt-2 text-[13px] text-red-600">{error}</p>}
    </div>
  );
}
