"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * ── ⚠⚠ THE INSTRUCTOR'S CONFIRM (`P2-J3-E558` WS-B) ───────────────────────
 *
 * ⚠⚠ NOT A SECOND `HelpfulButton`. `HelpfulButton` is the ASKER answering *did
 * this answer my question*; this is the PATH'S INSTRUCTOR answering *is this
 * answer correct*. They can disagree in both directions, which is why they
 * write different columns and why this is a different control.
 *
 * ⚠ THIS BUTTON IS NOT THE PERMISSION. `canConfirm` decides whether it renders,
 * and `lib/forums.ts` decides whether the write happens — a hidden control is
 * not a permission, so the refusal lives server-side and is testable by calling
 * the route directly.
 *
 * ⚠ IT IS NOT EMERALD WHEN SET, and that is deliberate: emerald is the ASKER's
 * "this answered me". Two green pills would read as one signal rendered twice.
 */
export function ConfirmAnswerButton({
  postId,
  confirmed,
}: {
  postId: string;
  confirmed: boolean;
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
        body: JSON.stringify({ action: confirmed ? "unconfirm" : "confirm", postId }),
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) {
        /* ⚠ The lib REFUSES rather than no-ops — "you can't confirm your own
           reply" and "you aren't the instructor" are different answers, and
           printing them is the whole reason it refuses. */
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
        aria-pressed={confirmed}
        className={
          "rounded-full border px-3 py-1.5 text-[12.5px] font-semibold transition-colors disabled:opacity-50 " +
          (confirmed
            ? "border-line bg-bg-soft text-ink-2 hover:border-magenta hover:text-magenta"
            : "border-line text-ink-2 hover:border-magenta hover:text-magenta")
        }
      >
        {busy ? "…" : confirmed ? "✓ Confirmed — undo" : "Confirm This Answer"}
      </button>
      {error && <span className="mt-1 text-[12px] text-red-700">{error}</span>}
    </span>
  );
}
