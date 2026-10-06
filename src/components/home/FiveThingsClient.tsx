"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";

// "Turn On" flips profile visibility in place (no page change).
export function TurnOnButton({ className }: { className: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const go = async () => {
    setBusy(true);
    setError(null);
    const r = await fetch("/api/settings/pause", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ paused: false }) }).catch(() => null);
    setBusy(false);
    if (!r?.ok) return setError("That didn't work — try again.");
    router.refresh();
  };
  return (
    <>
      <button type="button" data-turn-on onClick={go} disabled={busy} className={className}>
        {busy ? "Turning On…" : "Turn On"}
      </button>
      {error && <span role="alert" className="mt-1 block text-[12px] font-semibold text-magenta-dark">{error}</span>}
    </>
  );
}

// Phone: the first two cards, then "+N more".
export function MoreCards({ count, children }: { count: number; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className={open ? "contents" : "contents max-sm:hidden"}>{children}</div>
      {!open && count > 0 && (
        <button type="button" data-more-cards onClick={() => setOpen(true)} className="border border-line py-2.5 text-[13.5px] font-bold sm:hidden">
          +{count} More ↓
        </button>
      )}
    </>
  );
}
