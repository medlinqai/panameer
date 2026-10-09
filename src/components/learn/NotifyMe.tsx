"use client";

import { useState } from "react";
import Link from "next/link";

// Notify Me / You'll Be Notified ✓ (click again to stop) — for a Coming Soon path.
export function NotifyMe({ pathId, initial, signedIn, className, test = false, label = "Notify Me" }: { pathId: string; initial: boolean; signedIn: boolean; className?: string; test?: boolean; label?: string }) {
  const [on, setOn] = useState(initial);
  const [busy, setBusy] = useState(false);
  const cls = className ?? "inline-flex min-h-10 items-center border border-ink bg-surface px-4 text-[13.5px] font-semibold text-ink hover:bg-surface-hover";
  if (!signedIn) return <Link href="/login" className={cls}>{label}</Link>;
  const flip = async () => {
    const next = !on;
    setOn(next);
    setBusy(true);
    const r = await fetch("/api/learn/watch", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pathId, watch: next, test }) }).catch(() => null);
    setBusy(false);
    if (!r?.ok) setOn(!next);
  };
  return (
    <button type="button" id={test ? undefined : "notify"} data-notify-me={on ? "on" : "off"} data-notify-test={test || undefined} aria-pressed={on} disabled={busy} onClick={flip} className={on ? cls.replace("bg-surface", "bg-ink").replace("text-ink ", "text-surface ") : cls}>
      {on ? "You'll Be Notified ✓" : label}
    </button>
  );
}
