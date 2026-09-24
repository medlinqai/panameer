"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * ── ⚠⚠⚠ APPROVE OR DECLINE (`P2-A3-E619` WS-B 3) ────────────────────────
 *
 * ⚠ THE BRIEF: *"approve or decline, and they're told either way."*
 *
 * ⚠⚠ BOTH CONTROLS RENDER, ALWAYS. A queue that offers only Approve is not a
 * decision — it is a delay with an accept button, and the requests nobody wants
 * simply sit there forever. ⚠⚠⚠ DECLINE IS THE HALF THAT MAKES THE ANSWER REAL,
 * and it is recorded rather than deleting the row: a deleted request reads to
 * the asker as *"you never asked"*, so they ask again, forever.
 *
 * ⚠ `E579` — neither control is rendered disabled. If the viewer may not decide
 * this request, the row is not in their list at all: `getGroupRequests` scopes
 * to boards they host, which is the same predicate `decideJoinRequest` enforces
 * on the write. **The list cannot offer a decision the writer would refuse.**
 */
export function DecideRequest({
  membershipId,
  personName,
}: {
  membershipId: string;
  personName: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<"approve" | "decline" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function decide(decision: "approve" | "decline") {
    if (busy) return;
    setBusy(decision);
    setError(null);
    /* ⚠ `catch` present and meaning it — a thrown fetch must not produce
       silence, which is `E516`'s five-block finding. */
    try {
      const r = await fetch("/api/community/groups/decide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ membershipId, decision }),
      });
      const data = (await r.json().catch(() => null)) as
        | { ok?: boolean; error?: string }
        | null;
      if (!r.ok || !data?.ok) {
        setError(data?.error ?? "That didn't work. Try again.");
        return;
      }
      router.refresh();
    } catch {
      setError("We couldn't reach the server. Check your connection.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* ⚠ RULE 11 — the labels are Title Case; the busy strings report
          progress and stay sentences. ⚠⚠ The accessible names carry the
          person, so a screen-reader user hears WHOSE request they are
          answering rather than "Approve" eleven times. */}
      <button
        type="button"
        onClick={() => decide("approve")}
        disabled={busy !== null}
        aria-label={`Approve ${personName}`}
        className="rounded-full bg-magenta px-4 py-1.5 text-[13.5px] font-bold text-white transition-colors hover:bg-magenta-dark disabled:opacity-50"
      >
        {busy === "approve" ? "Approving…" : "Approve"}
      </button>
      <button
        type="button"
        onClick={() => decide("decline")}
        disabled={busy !== null}
        aria-label={`Decline ${personName}`}
        className="rounded-full border-[1.5px] border-line px-4 py-1.5 text-[13.5px] font-bold text-ink transition-colors hover:border-magenta hover:text-magenta disabled:opacity-50"
      >
        {busy === "decline" ? "Declining…" : "Decline"}
      </button>
      {error && (
        <p role="alert" className="w-full text-[13px] font-semibold text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
