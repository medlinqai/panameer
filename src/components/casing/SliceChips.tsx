"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

// SA-E008: one chip row at the top of a list — In Process (default) · Recurring · Completed · All, with counts.
// The last chip per tab is remembered per viewer (localStorage, guarded).
const SL = [["process", "In Process"], ["recurring", "Recurring"], ["completed", "Completed"], ["all", "All"]] as const;

export function SliceChips({ tabKey, counts, base, extra = [], labels = {}, chips, defaultKey = "process" }: { tabKey: string; counts: Record<string, number>; base: string; extra?: [string, string][]; labels?: Partial<Record<string, string>>; /** JS-E002: replace the standard chips (e.g. job statuses). */ chips?: [string, string][]; defaultKey?: string }) {
  const router = useRouter();
  const sp = useSearchParams();
  const current = sp?.get("slice") ?? defaultKey;
  const list = chips ?? [...SL, ...extra];
  const key = `pm-slice:${tabKey}`;
  const href = (k: string) => `${base}${base.includes("?") ? "&" : "?"}slice=${k}`;
  const checked = useRef(false);
  useEffect(() => {
    if (checked.current) return;
    checked.current = true;
    if (sp?.get("slice")) { try { localStorage.setItem(key, sp.get("slice")!); } catch {} return; }
    let saved: string | null = null;
    try { saved = localStorage.getItem(key); } catch {}
    if (saved && saved !== defaultKey && list.some(([k]) => k === saved)) router.replace(href(saved), { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <nav aria-label="Show" className="-mx-1 mb-2 flex gap-1.5 overflow-x-auto px-1 pb-1 text-[12.5px]" data-slice-chips>
      {list.map(([k, l0]) => { const l = labels[k] ?? l0; return (
        <Link key={k} href={href(k)} scroll={false} onClick={() => { try { localStorage.setItem(key, k); } catch {} }} aria-current={current === k ? "true" : undefined}
          className={current === k ? "shrink-0 rounded-full border border-magenta-dark bg-magenta/10 px-3 py-1 font-semibold text-magenta-dark" : "shrink-0 rounded-full border border-line px-3 py-1 font-semibold hover:border-magenta"}>
          {l} <span className="tabular-nums text-ink-3">{counts[k] ?? 0}</span>
        </Link>
      ); })}
    </nav>
  );
}

/** Recurring row extras: next occurrence, next Payment Event and amount, Pause / End. */
export function RecurringLine({ r }: { r: { orderId: string; next: string; event: string; amountCents: number; paused: boolean } }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const act = async (action: string) => {
    if (action === "CLOSE" && !window.confirm("End this recurring Order?")) return;
    setBusy(true);
    await fetch(`/api/orders/${r.orderId}/control`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) }).catch(() => null);
    setBusy(false);
    router.refresh();
  };
  return (
    <span className="mt-1 flex flex-wrap items-center gap-2 text-[12.5px]" data-recurring>
      <span className={r.paused ? "rounded-full bg-state-inactive-bg px-2 font-semibold text-state-inactive" : "rounded-full bg-state-pending-bg px-2 font-semibold text-state-pending"}>{r.paused ? "Paused" : `Next ${r.next}`}</span>
      <span className="text-ink-2">{r.event} · ${(r.amountCents / 100).toLocaleString("en-US", { maximumFractionDigits: 2 })}</span>
      <button type="button" disabled={busy} onClick={() => act(r.paused ? "RELEASE_HOLD" : "HOLD")} className="font-semibold underline underline-offset-4 disabled:opacity-40">{r.paused ? "Resume" : "Pause"}</button>
      <button type="button" disabled={busy} onClick={() => act("CLOSE")} className="font-semibold underline underline-offset-4 disabled:opacity-40">End</button>
    </span>
  );
}
