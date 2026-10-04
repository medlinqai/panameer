"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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
      {}
      <button
        type="button"
        onClick={() => decide("approve")}
        disabled={busy !== null}
        aria-label={`Approve ${personName}`}
        className="bg-ink px-4 py-1.5 text-[13.5px] font-semibold text-surface transition-colors hover:bg-ink-hover disabled:opacity-50"
      >
        {busy === "approve" ? "Approving…" : "Approve"}
      </button>
      <button
        type="button"
        onClick={() => decide("decline")}
        disabled={busy !== null}
        aria-label={`Decline ${personName}`}
        className="border border-ink bg-surface px-4 py-1.5 text-[13.5px] font-semibold text-ink transition-colors hover:bg-surface-hover disabled:opacity-50"
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
