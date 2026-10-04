"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DigestSend({ week, count }: { week: string; count: number }) {
  const router = useRouter();
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const send = async () => {
    setBusy(true);
    setNote(null);
    const res = await fetch("/api/admin/build-digest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ week, confirmed: true }),
    });
    const json = (await res.json().catch(() => ({}))) as { ok?: boolean; sent?: number; error?: string };
    setBusy(false);
    if (json.ok) {
      setNote(`Sent to ${json.sent}.`);
      router.refresh();
    } else setNote(json.error ?? "That didn't send.");
  };

  if (note) return <p className="mt-3 text-[13px] font-bold text-ink">{note}</p>;

  return asking ? (
    <div className="mt-3 flex flex-wrap items-center gap-3 border-l-2 border-magenta pl-3">
      <span className="text-[13px] text-ink">
        This emails {count} {count === 1 ? "person" : "people"} for real. There is no undo.
      </span>
      <button
        type="button"
        disabled={busy || count === 0}
        onClick={() => void send()}
        className="inline-flex min-h-11 items-center bg-ink px-3 text-[13px] font-bold text-surface disabled:opacity-40"
      >
        Yes, Send It
      </button>
      <button
        type="button"
        onClick={() => setAsking(false)}
        className="inline-flex min-h-11 items-center border border-ink bg-surface px-3 text-[13px] font-bold text-ink"
      >
        Cancel
      </button>
    </div>
  ) : (
    <button
      type="button"
      onClick={() => setAsking(true)}
      className="mt-3 inline-flex min-h-11 items-center bg-ink px-3 text-[13px] font-bold text-surface"
    >
      Send This Week
    </button>
  );
}
