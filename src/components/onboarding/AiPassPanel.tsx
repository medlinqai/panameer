"use client";

import { useEffect, useState } from "react";

/**
 * "Let AI take a pass" — ONE panel, wherever the parse fell short (E129).
 *
 * It began as inline markup on the import step, which meant the action existed
 * for exactly ninety seconds: if you didn't take it the moment you uploaded, you
 * could never reach it again. Providers whose profiles predate the parser —
 * Marelise and Eddie among them — had empty work history and no way at all to
 * ask for another read. Extracted here so the review, the import step and
 * Settings offer the same thing in the same words.
 *
 * THE DOCUMENT IS RETAINED, which is what makes this worth doing:
 * `ProfileImport.raw_text` keeps up to 100k characters and nothing deletes it,
 * so re-reading costs the provider nothing — no re-upload, no hunting for the
 * file. When there ISN'T one stored (never imported, or a profile older than the
 * import step) the panel asks for an upload instead of offering a button that
 * can only fail.
 *
 * NON-DESTRUCTIVE by construction, not by promise: the pass applies through
 * `applyParsedResume`, which fills blank fields and appends work history it
 * doesn't already hold. It contains no deletes. Bio, education and skills a
 * provider has already written are never touched.
 */
export type AiPassAvailability = {
  available: boolean;
  hasDocument: boolean;
  documentName: string | null;
};

export function AiPassPanel({
  reasons = [],
  heading = "We had trouble reading your work history from this file.",
  onUpload,
  onManual,
  onApplied,
  compact = false,
}: {
  reasons?: string[];
  heading?: string;
  /** Open the upload modal — used both for "different file" and "none stored". */
  onUpload: () => void;
  /** Optional: dismiss into manual entry. */
  onManual?: () => void;
  /** Called with the applied counts so the caller can re-hydrate. */
  onApplied: (body: { applied?: { experiences?: number }; state?: unknown }) => void;
  compact?: boolean;
}) {
  const [info, setInfo] = useState<AiPassAvailability | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    fetch("/api/onboarding/provider/resume-ai/available")
      .then((r) => (r.ok ? r.json() : { available: false, hasDocument: false }))
      .then((d) => live && setInfo(d))
      .catch(() => live && setInfo({ available: false, hasDocument: false, documentName: null }));
    return () => {
      live = false;
    };
  }, []);

  const run = async () => {
    setBusy(true);
    setError(null);
    setDone(null);
    try {
      const r = await fetch("/api/onboarding/provider/resume-ai", { method: "POST" });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) {
        // A failed pass is not a failed profile. Say what is still true.
        setError(
          `${body.error ?? "That didn't work."} Nothing was changed — what you have is still here.`
        );
        return;
      }
      const n = body.applied?.experiences ?? 0;
      setDone(
        n > 0
          ? `Added ${n} entr${n === 1 ? "y" : "ies"} to your work history — check them over below.`
          : "Re-read your document. Check the sections below."
      );
      onApplied(body);
    } finally {
      setBusy(false);
    }
  };

  // Nothing configured on this environment — offer the human paths only.
  const aiOff = info?.available === false;

  return (
    <div
      className={
        "rounded-brand border-2 border-amber-400/60 bg-amber-50/60 " +
        (compact ? "p-4" : "p-5")
      }
    >
      <h2 className="text-[17px]">{heading}</h2>
      {reasons.length > 0 && (
        <ul className="mt-2 list-disc space-y-1 pl-5 text-[14px] text-ink-2">
          {reasons.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {!aiOff &&
          (info?.hasDocument ? (
            <button
              type="button"
              onClick={run}
              disabled={busy || info === null}
              className="rounded-full bg-magenta px-6 py-2.5 font-bold text-white transition-colors hover:bg-magenta-dark disabled:opacity-50"
            >
              {busy ? "Reading your document…" : "Let AI take a pass"}
            </button>
          ) : (
            // No stored document: the same offer, but it needs a file first.
            <button
              type="button"
              onClick={onUpload}
              disabled={info === null}
              className="rounded-full bg-magenta px-6 py-2.5 font-bold text-white transition-colors hover:bg-magenta-dark disabled:opacity-50"
            >
              Upload your résumé for an AI pass
            </button>
          ))}

        {info?.hasDocument && (
          <button
            type="button"
            onClick={onUpload}
            className="rounded-full border-[1.5px] border-line px-5 py-2.5 font-bold text-ink transition-colors hover:border-magenta hover:text-magenta"
          >
            Upload a different file
          </button>
        )}

        {onManual && (
          <button
            type="button"
            onClick={onManual}
            className="text-[14px] font-semibold text-ink-2 underline underline-offset-4 hover:text-magenta"
          >
            Fill it in manually
          </button>
        )}
      </div>

      {info?.hasDocument && info.documentName && !done && (
        <p className="mt-3 text-[13px] text-ink-2">
          We still have <b className="text-ink">{info.documentName}</b> — no need
          to upload it again.
        </p>
      )}
      {done && (
        <p className="mt-3 text-[13.5px] font-semibold text-emerald-700">✓ {done}</p>
      )}
      {error && <p className="mt-3 text-[13.5px] text-red-700">{error}</p>}
      {aiOff && (
        <p className="mt-3 text-[13px] text-ink-2">
          The AI reader isn&apos;t switched on here — upload a different file or
          fill it in below.
        </p>
      )}
    </div>
  );
}
