"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function Composer({ toUserId, maxLength }: { toUserId: string; maxLength: number }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    const text = body.trim();
    if (!text || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send", toUserId, body: text }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "That didn't send. Try again.");
        return;
      }
      setBody("");
      router.refresh();
    } catch {
      setError("That didn't send. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="border-t border-line pt-3">
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        maxLength={maxLength}
        rows={3}
        placeholder="Write a message"
        aria-label="Write a message"
        className="w-full resize-y rounded-brand border border-line bg-white px-3 py-2 text-[14px] outline-none placeholder:text-ink-2/70 focus:border-magenta/60"
      />
      <div className="mt-2 flex items-center gap-3">
        <button
          type="button"
          onClick={send}
          disabled={busy || body.trim().length === 0}
          className="min-h-[44px] rounded-full bg-magenta px-4 text-[13.5px] font-bold text-white transition-colors hover:bg-magenta/90 disabled:bg-ink-2/15 disabled:text-ink-2"
        >
          {busy ? "Sending…" : "Send"}
        </button>
        {error && <span className="text-[12.5px] text-red-600">{error}</span>}
      </div>
    </div>
  );
}
