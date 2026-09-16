"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * THE LOCK CHECKBOX, MADE REAL (`P1-ALL-E528` PART A).
 *
 * ⚠⚠ IT USED TO BE `disabled` AND WRITE NOTHING. The page's own header said so:
 * *"No unlock, no edit, no delete… An action needs its own brief."* This is that
 * brief.
 *
 * ── ⚠⚠ THREE STATES, AND THEY ARE GENUINELY DIFFERENT ──────────────────────
 *
 *   not locked          nothing to do
 *   TIMED lock          ⚠ RELEASES ITSELF at `locked_until` (`E252a`)
 *   INDEFINITE lock     ⚠⚠ `locked: true` with a NULL `locked_until` — nothing
 *                       released it before this control existed
 *
 * ⚠ AN ADMIN WHO DOES NOT KNOW A TIMED LOCK SELF-RELEASES WILL PANIC, or will
 * unlock something that did not need unlocking. Saying which kind it is, and
 * when it ends, is the difference between the two.
 *
 * ── ⚠ ONLY UNLOCKING IS OFFERED ─────────────────────────────────────────────
 *
 * The box is only clickable when the account IS locked. Locking a member is a
 * new power over them and it is Scott's call, not chat's — the route rejects a
 * `"lock"` action today and the report says so.
 */

type Props = {
  /** Person id — the route resolves the User from it. */
  personId: string;
  locked: boolean;
  lockedUntil: string | null;
  failedAttempts: number;
};

/**
 * ⚠⚠ THE THREE STRINGS. Proposed, not settled — Scott names things.
 *
 * ⚠ The time is rendered with the VIEWER's locale and timezone, not the
 * server's: an admin reading *"releases automatically at 14:52"* needs it in
 * their own clock, and this component is a client so it has one.
 * ⚠ The attempt count rides along because three failures and a lock are a
 * different situation from twenty.
 */
export function lockStateLabel(
  locked: boolean,
  lockedUntil: Date | null,
  failedAttempts: number
): string {
  const attempts =
    failedAttempts > 0
      ? ` · ${failedAttempts} failed ${failedAttempts === 1 ? "attempt" : "attempts"}`
      : "";

  if (!locked) return `Not locked${attempts}`;

  if (!lockedUntil) {
    /* ⚠⚠ THE ONE THAT STRANDED SCOTT. It never releases on its own. */
    return `Locked — will not release on its own${attempts}`;
  }

  /* ⚠ A PAST `locked_until` IS NOT A LOCK. `releaseExpiredLock` clears it on the
     next attempt, so the honest reading is "already expired" rather than a
     release time in the past that looks like a bug. */
  if (lockedUntil.getTime() <= Date.now()) {
    return `Locked — the wait has already passed, next sign-in releases it${attempts}`;
  }

  const at = lockedUntil.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `Locked — releases automatically at ${at}${attempts}`;
}

export function LockControl({ personId, locked, lockedUntil, failedAttempts }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const until = lockedUntil ? new Date(lockedUntil) : null;
  const label = lockStateLabel(locked, until, failedAttempts);

  async function unlock() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${personId}/lock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "unlock" }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "That didn't go through.");
        return;
      }
      /* ⚠ THE SERVER OWNS THE TRUTH. The row re-renders from the database
         rather than from an optimistic guess — this is an admin screen and a
         wrong lock state here is worse than a 300ms wait. */
      router.refresh();
    } catch {
      setError("That didn't go through.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <input
        type="checkbox"
        checked={locked}
        /* ⚠ ONLY AN UNLOCK IS POSSIBLE, so the box is inert unless it is ticked. */
        disabled={!locked || busy}
        onChange={unlock}
        aria-label={locked ? "Unlock this account" : label}
        className="h-4 w-4 accent-magenta disabled:opacity-60"
      />
      <span className="text-[13px] text-ink-2">{busy ? "Unlocking…" : label}</span>
      {locked && !busy && (
        <button
          type="button"
          onClick={unlock}
          className="rounded-full border border-line px-2.5 py-0.5 text-[12px] font-semibold text-ink-2 transition-colors hover:border-magenta hover:text-magenta"
        >
          Unlock
        </button>
      )}
      {error && <span className="text-[12px] text-red-600">{error}</span>}
    </span>
  );
}
