"use client";

import { useState } from "react";

// WS-E008: "Don't see yours? Suggest a Service Type" — goes to admin review.
export function SuggestServiceType() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const send = async () => {
    const r = await fetch("/api/service-product-types", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
    const j = (await r.json().catch(() => ({}))) as { error?: string; existing?: boolean };
    setMsg(r.ok ? (j.existing ? "That type is already on the list." : "Thanks — Panameer reviews it before it's listed.") : j.error ?? "Could not send that.");
    if (r.ok) setName("");
  };
  if (!open) return <button type="button" data-suggest-service-type onClick={() => setOpen(true)} className="font-semibold text-magenta-dark underline underline-offset-4">Don&apos;t see yours? Suggest a Service Type</button>;
  return (
    <div className="space-y-2">
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Security Reviews" aria-label="Service type name" className="h-9 w-full border border-line px-2 text-[13px]" />
      <button type="button" disabled={name.trim().length < 3} onClick={send} className="inline-flex min-h-9 items-center bg-ink px-3 text-[12.5px] font-semibold text-surface disabled:opacity-40">Suggest</button>
      {msg && <p className="text-[12.5px] text-ink-2">{msg}</p>}
    </div>
  );
}
