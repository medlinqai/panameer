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
  showContext = false,
}: {
  onApplied: (body: { applied?: { experiences?: number } }) => void;
  label?: string;
  /**
   * ── ⚠ `P2-J14-E561` WS-A — THE CONTEXT LINE ─────────────────────────────
   *
   * ⚠ Off by default, so the WIZARD's Work History header (`join/provider:4817`)
   * and every other caller render EXACTLY as before. Only the profile's gaps
   * panel turns it on, where the offer needs to explain itself to someone who
   * has not thought about their profile in a year.
   * ⚠⚠ A PRESENTATIONAL PROP, LIKE `label` — it does not tell the component
   * which surface it is on, and it must not become that.
   */
  showContext?: boolean;
}) {
  const [info, setInfo] = useState<{
    available: boolean;
    hasDocument: boolean;
    documentName: string | null;
    lastParseAt: string | null;
  } | null>(null);
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
          {busy ? "Reading…" : "Yes, import"}
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

  const trigger = (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      className="text-[13px] font-bold text-magenta transition-colors hover:text-magenta-dark"
    >
      ↻ {label}
    </button>
  );

  if (!showContext) return trigger;

  /*
    ── ⚠⚠ THE CONTEXTUAL FORM (`P2-J14-E561` WS-A) ─────────────────────────

    ⚠ THE SUB-LINE DESCRIBES WHAT HAPPENS TODAY, NOT WHAT WS-B WILL MAKE TRUE.
    ⚠⚠ The brief's wording is *"you approve every change"* — and that is NOT yet
    true: the confirm step is a single blind yes, the provider is not shown WHAT
    will change, and the receipt reports only work-history entries while the
    import also writes skills, specializations, education, certifications and
    languages. ⚠⚠⚠ SHIPPING THAT SENTENCE NOW WOULD BE A PROMISE THE CODE DOES
    NOT KEEP — the same defect class as a dead icon or a fabricated count.
    ⚠ IT BECOMES THE BRIEF'S SENTENCE IN WS-B, when the diff makes it true.

    ⚠ `E433` — the date is a FIGURE, so ink. The action is the only interactive
    thing here and it carries the magenta.
  */
  return (
    <div className="mt-4 border-t border-amber-400/25 pt-3">
      <p className="text-[13.5px] font-semibold text-ink">
        Read your résumé again
      </p>
      <p className="mt-0.5 text-[13px] leading-relaxed text-ink-2">
        We&apos;ll add what&apos;s missing and leave what you have.
        {info.lastParseAt && (
          <> Last read {formatWhen(info.lastParseAt)}.</>
        )}
      </p>
      <div className="mt-2">{trigger}</div>
    </div>
  );
}

/** ⚠ A date, not a countdown — "8 months ago" is what makes the offer land. */
function formatWhen(iso: string): string {
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return "";
  const days = Math.floor((Date.now() - then.getTime()) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  const months = Math.round(days / 30);
  if (months < 18) return `${months} month${months === 1 ? "" : "s"} ago`;
  return `${Math.round(months / 12)} years ago`;
}
