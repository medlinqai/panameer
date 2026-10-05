"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function TicketReplyBox({ ticketId }: { ticketId: string }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch(`/api/support/tickets/${ticketId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      if (!r.ok) {
        setError((await r.json().catch(() => ({}))).error ?? "Could not send that.");
        return;
      }
      setBody("");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-5 rounded-brand border border-line bg-white p-5">
      {error && <p className="mb-2 text-[14px] text-amber-700">{error}</p>}
      <label className="block text-[14px] font-semibold">Add to this ticket</label>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
        className="mt-1 w-full rounded-[12px] border border-line p-3 text-[15px] outline-none focus:border-magenta"
      />
      <button
        type="button"
        disabled={busy || !body.trim()}
        onClick={send}
        className="mt-2 bg-magenta px-6 py-2 font-bold text-white hover:bg-magenta-dark disabled:opacity-40"
      >
        {busy ? "Sending…" : "Send"}
      </button>
    </div>
  );
}
