"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Add Email Domain: an admin claims their own verified work domain. Free-mail domains are refused server-side.
export function AddEmailDomain({ ownDomain }: { ownDomain: string | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [domain, setDomain] = useState(ownDomain ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const save = async () => {
    setBusy(true);
    setError(null);
    const r = await fetch("/api/company/domain", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ domain }) }).catch(() => null);
    const b = (await r?.json().catch(() => ({}))) as { error?: string } | undefined;
    setBusy(false);
    if (!r?.ok) return setError(b?.error ?? "That didn't save.");
    setOpen(false);
    router.refresh();
  };
  if (!open)
    return (
      <button type="button" onClick={() => setOpen(true)} className="min-h-[42px] bg-ink px-[18px] text-[13px] font-bold text-surface hover:bg-ink-hover">
        Add Email Domain
      </button>
    );
  return (
    <div data-add-domain className="w-full max-w-md">
      <label className="block text-[13px] font-semibold">
        Email domain
        <span className="block text-[12.5px] font-normal text-ink-3">It has to match your own verified email.</span>
        <input value={domain} onChange={(e) => setDomain(e.target.value)} name="domain" className="mt-1 min-h-[42px] w-full border border-line bg-surface px-3 text-[14px] focus:border-ink focus:outline-none" />
      </label>
      {error && <p role="alert" className="mt-1.5 text-[13px] font-semibold text-magenta-dark">{error}</p>}
      <div className="mt-2.5 flex gap-2">
        <button type="button" onClick={save} disabled={busy || !domain.trim()} className="min-h-[42px] bg-ink px-[18px] text-[13px] font-bold text-surface hover:bg-ink-hover disabled:opacity-50">
          {busy ? "Saving…" : "Save Domain"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="min-h-[42px] border border-ink bg-surface px-[18px] text-[13px] font-bold text-ink">
          Cancel
        </button>
      </div>
    </div>
  );
}
