"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * THE COMPOSER (`P1-ALL-E379`).
 *
 * ⚠⚠ IT DECIDES NOTHING. Whether it renders at all is `canMessage`'s answer,
 * resolved on the server; when the answer is no, the PAGE renders the reason
 * where this component would be. That is the point of `canMessage` returning a
 * reason rather than a boolean — the person is told BEFORE they type, not after
 * they press send.
 *
 * ⚠ AND THE SERVER RE-CHECKS ANYWAY. `sendMessage` runs the same permission on
 * the way in, because a composer that hides itself is a courtesy, not a control.
 *
 * ⚠ NO REALTIME, AND THE PAGE SAYS SO rather than looking broken. On success
 * this calls `router.refresh()` and the server re-renders the conversation —
 * there is no socket, no poll, and no optimistic bubble that could survive a
 * failed send and leave a message on screen that does not exist.
 */
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
        /* ⚠ THE SERVER'S REASON IS SHOWN VERBATIM — the same string the page
           would have rendered in place of this box, so a permission that
           changed mid-session reads identically either way. */
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
