"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  /** Person id — the route resolves the User from it. */
  personId: string;
  locked: boolean;
  lockedUntil: string | null;
  failedAttempts: number;
};

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
    /* THE ONE THAT STRANDED SCOTT. It never releases on its own. */
    return `Locked — will not release on its own${attempts}`;
  }

  // A PAST `locked_until` IS NOT A LOCK. `releaseExpiredLock` clears it on the
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
      // THE SERVER OWNS THE TRUTH. The row re-renders from the database
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
        /* ONLY AN UNLOCK IS POSSIBLE, so the box is inert unless it is ticked. */
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
          className="border border-line px-2.5 py-0.5 text-[12px] font-semibold text-ink-2 transition-colors hover:border-magenta hover:text-magenta"
        >
          Unlock
        </button>
      )}
      {error && <span className="text-[12px] text-red-600">{error}</span>}
    </span>
  );
}
