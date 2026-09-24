"use client";

import { useState } from "react";
import { Hand } from "lucide-react";

/**
 * ── ⚠⚠⚠ "I WANT THIS ONE" (`P2-A4-E611` WS-C) ───────────────────────────
 *
 * ⚠⚠ SCOTT, 2026-09-23: *"The copy records interest and promises nothing.
 * 'We'll count you in' — **never** 'coming soon', **never** a date, **never**
 * 'we'll email you when it's ready' unless something actually would."*
 *
 * ⚠⚠⚠ NOTHING WOULD. There is no writer that mails anybody when a video lands,
 * so no wording here may imply one. ⚠ **A page may not promise a mechanism that
 * has no writer** — the rule that dashed Earnings at `E603`.
 *
 * ⚠ PRESSING IT AGAIN WITHDRAWS. The row is flipped, never deleted, so the
 * count can move down honestly instead of the history vanishing.
 * ⚠⚠ THE COUNT SHOWN HERE IS THE MEMBER-FACING ONE AND IT IS OPTIONAL — Scott
 * reads the real queue on `/admin/learn`. It renders only above zero, the same
 * rule the forum thread count follows: a control advertising "0 people want
 * this" is an anti-advertisement.
 */
export function WantThisButton({
  pathId,
  initialWanted,
  initialCount,
  signedIn,
}: {
  pathId: string;
  initialWanted: boolean;
  initialCount: number;
  signedIn: boolean;
}) {
  const [wanted, setWanted] = useState(initialWanted);
  const [count, setCount] = useState(initialCount);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* ⚠⚠ A COUNT ANYBODY CAN INFLATE IS WORSE THAN NO COUNT (Scott). A signed-out
     visitor is told what to do, not given a button that cannot work (`E579`). */
  if (!signedIn) {
    return (
      <p className="text-[12.5px] leading-relaxed text-ink-2">
        Sign in to tell us you want this one.
      </p>
    );
  }

  const toggle = async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/learn/interest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pathId, wanted: !wanted }),
      });
      const data = (await r.json().catch(() => null)) as
        | { ok?: boolean; wanted?: boolean; count?: number; error?: string }
        | null;
      if (!r.ok || !data?.ok) {
        setError(data?.error ?? "That didn't save. Try again.");
        return;
      }
      setWanted(Boolean(data.wanted));
      if (typeof data.count === "number") setCount(data.count);
    } catch {
      /* ⚠ A thrown fetch must not produce silence (`E516`). */
      setError("That didn't save. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={toggle}
        disabled={busy}
        aria-pressed={wanted}
        className={
          "inline-flex w-fit items-center gap-2 rounded-full px-4 py-2 text-[13px] font-bold transition-colors " +
          (wanted
            ? "bg-magenta text-white hover:bg-magenta-dark"
            : "border border-magenta text-magenta hover:bg-magenta hover:text-white")
        }
      >
        <Hand className="h-3.5 w-3.5" aria-hidden />
        {/* ⚠ A LABEL NAMES AN ACTION AND TAKES TITLE CASE (rule 11). The busy
            string reports PROGRESS and stays a sentence. */}
        {busy ? "Saving…" : wanted ? "You Want This One" : "I Want This One"}
      </button>
      <p className="mt-2 text-[12px] leading-relaxed text-ink-2">
        {wanted
          ? /* ⚠⚠ IT COUNTS THEM IN AND STOPS. No date, no notification claim. */
            "We've counted you in. Press again to take it back."
          : "Tell us and we'll count you in. It helps decide what gets made next."}
        {count > 0 && ` · ${count} ${count === 1 ? "person wants" : "people want"} this`}
      </p>
      {error && <p className="mt-1.5 text-[12px] text-red-600">{error}</p>}
    </div>
  );
}
