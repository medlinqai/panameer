"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Accept / Decline a request to mentor you.
export function MentorRequestActions({ connectionId }: { connectionId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const act = async (accept: boolean) => {
    setBusy(true);
    setErr(null);
    const r = await fetch("/api/community/connections", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: accept ? "mentor_accept" : "mentor_decline", connectionId }) }).catch(() => null);
    setBusy(false);
    if (!r?.ok) return setErr("That didn't go through.");
    setDone(accept ? "Accepted" : "Declined");
    router.refresh();
  };
  if (done) return <span className="text-[12.5px] font-bold text-[#1f8a5b]">✓ {done}</span>;
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <button type="button" data-mentor-accept disabled={busy} onClick={() => act(true)} className="bg-ink px-3 py-1.5 text-[13px] font-semibold text-surface disabled:opacity-50">Accept</button>
      <button type="button" data-mentor-decline disabled={busy} onClick={() => act(false)} className="border border-ink px-3 py-1.5 text-[13px] font-semibold disabled:opacity-50">Decline</button>
      {err && <span className="text-[12px] text-red-600">{err}</span>}
    </span>
  );
}
