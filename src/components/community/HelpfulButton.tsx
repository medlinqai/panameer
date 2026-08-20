"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * "This answered my question" — the only involvement signal on the platform
 * (brief_community_signal WS1).
 *
 * ⚠ THIS BUTTON IS NOT THE PERMISSION. `canMarkHelpful` decides whether it is
 * rendered, and `lib/forums.ts` re-derives the same two rules from the session on
 * every write: only the thread's author, never their own reply. Hiding a control
 * is a courtesy to the person who cannot use it, not a security boundary — the
 * route refuses a direct call the same way.
 *
 * ⚠ AND IT IS REVERSIBLE. A thread author who mis-clicks can undo, which is why
 * the column is a nullable timestamp rather than a boolean.
 */
export function HelpfulButton({
  postId,
  marked,
}: {
  postId: string;
  marked: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/community/forums", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: marked ? "unhelpful" : "helpful", postId }),
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) {
        /* The lib REFUSES rather than no-ops, so there is always something to
           say — printing it is the whole reason it refuses. */
        setError(body.error ?? "That didn't work.");
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <span className="inline-flex flex-col items-start">
      <button
        type="button"
        onClick={toggle}
        disabled={busy}
        aria-pressed={marked}
        className={
          "rounded-full border px-3 py-1.5 text-[12.5px] font-semibold transition-colors disabled:opacity-50 " +
          (marked
            ? "border-emerald-600/40 bg-emerald-50 text-emerald-700 hover:border-emerald-600"
            : "border-line text-ink-2 hover:border-magenta hover:text-magenta")
        }
      >
        {busy ? "…" : marked ? "✓ Marked helpful — undo" : "This answered my question"}
      </button>
      {error && <span className="mt-1 text-[12px] text-red-700">{error}</span>}
    </span>
  );
}
