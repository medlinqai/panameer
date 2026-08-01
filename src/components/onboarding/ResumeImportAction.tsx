"use client";

import { useEffect, useState } from "react";

/**
 * "Import from résumé" in the Work History header (E132).
 *
 * The AI pass used to appear ONLY when work history was empty. Eddie had a
 * single placeholder entry, so the offer vanished — and the only way to reach
 * his real seven employers was to delete the entry he had first. A thin or wrong
 * work history is exactly when you most want the résumé re-read, so the offer
 * can't be conditioned on there being nothing there.
 *
 * Shown whenever a document is on file. When there isn't one the component
 * renders nothing: the empty-state panel already handles "upload one", and two
 * competing invitations in the same card would be worse than one.
 *
 * NON-DESTRUCTIVE — it appends. See `applyParsedResume`: no deletes, employers
 * deduped on name+role. The confirm step says so, because "import" is a word
 * people reasonably fear when they already have data.
 */
export function ResumeImportAction({
  onApplied,
  label = "Import from résumé",
}: {
  onApplied: (body: { applied?: { experiences?: number } }) => void;
  label?: string;
}) {
  const [info, setInfo] = useState<{ available: boolean; hasDocument: boolean; documentName: string | null } | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    fetch("/api/onboarding/provider/resume-ai/available")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => live && setInfo(d))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);

  if (!info?.available || !info.hasDocument) return null;

  const run = async () => {
    setBusy(true);
    try {
      const r = await fetch("/api/onboarding/provider/resume-ai", { method: "POST" });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) {
        setResult(body.error ?? "That didn't work — nothing was changed.");
        return;
      }
      const n = body.applied?.experiences ?? 0;
      setResult(
        n > 0
          ? `Added ${n} entr${n === 1 ? "y" : "ies"}.`
          : "Nothing new to add — your work history already covers the résumé."
      );
      onApplied(body);
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  };

  if (result) {
    return <span className="text-[13px] font-semibold text-emerald-700">✓ {result}</span>;
  }

  if (confirming) {
    return (
      <span className="flex flex-wrap items-center gap-2 text-[13px]">
        <span className="text-ink-2">
          Read <b className="text-ink">{info.documentName}</b> again? We&apos;ll add
          what&apos;s missing and leave what you have.
        </span>
        <button
          type="button"
          onClick={run}
          disabled={busy}
          aria-busy={busy}
          className="inline-flex items-center gap-2 rounded-full bg-magenta px-4 py-1.5 font-bold text-white transition-colors hover:bg-magenta-dark disabled:opacity-60"
        >
          {busy && (
            <span
              aria-hidden
              className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-white/35 border-t-white"
            />
          )}
          {busy ? "Reading… (20–30s)" : "Yes, import"}
        </button>
        {/* Cancel disappears mid-run: it never aborted the request, and offering
            an out that does nothing during the one wait that needs patience is
            worse than offering none (WS8/E142). */}
        {!busy && (
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className="font-semibold text-ink-2 underline underline-offset-4 hover:text-magenta"
          >
            Cancel
          </button>
        )}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      className="text-[13px] font-bold text-magenta transition-colors hover:text-magenta-dark"
    >
      ↻ {label}
    </button>
  );
}
