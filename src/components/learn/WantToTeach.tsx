"use client";

import { useState } from "react";

const BTN = "inline-flex min-h-11 items-center border border-ink bg-surface px-5 text-[14px] font-semibold hover:bg-surface-hover disabled:opacity-40";

// L-E051: for members who don't teach yet — a short message to Panameer's admins.
export function WantToTeach({ label = "Want to Teach on Panameer?", topic = "Wants to teach on Panameer", prompt = "What would you like to teach?" }: { label?: string; topic?: string; prompt?: string }) {
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState("");
  const [done, setDone] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (done) return <p role="status" className="mt-4 text-[13.5px] font-semibold">Sent ✓ — Panameer will get back to you ({done}).</p>;
  if (!open) return <button type="button" data-want-to-teach onClick={() => setOpen(true)} className={`${BTN} mt-4`}>{label}</button>;
  return (
    <div className="mt-4 grid gap-2">
      <label className="text-[12.5px] font-bold">{prompt}<textarea value={msg} onChange={(e) => setMsg(e.target.value)} rows={3} className="mt-1 w-full border border-line px-3 py-2 text-[14px] font-normal" /></label>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" disabled={busy || msg.trim().length < 3} onClick={async () => {
          setBusy(true);
          setError(null);
          const r = await fetch("/api/learn/teach-request", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: msg, topic }) });
          const j = (await r.json().catch(() => ({}))) as { code?: string; error?: string };
          setBusy(false);
          if (r.ok) setDone(j.code ?? "sent");
          else setError(j.error ?? "That didn't work.");
        }} className={BTN}>Send to Panameer</button>
        <button type="button" onClick={() => setOpen(false)} className="text-[13.5px] font-semibold underline">Cancel</button>
      </div>
      {error && <p role="alert" className="text-[13px] font-semibold text-magenta-dark">{error}</p>}
    </div>
  );
}
