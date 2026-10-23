"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { AttentionItem } from "@/lib/attention";

// Scott 10-23: two ways to read Needs Your Attention — Priority (what hurts to miss) or By Date (soonest due first).
const HOUR = 3_600_000;
const MONEY = new Set(["order", "settlement", "payment"]);
function tier(i: AttentionItem, now: number): number {
  const ms = i.dueAt ? new Date(i.dueAt).getTime() - now : null;
  if (/today/i.test(i.what) || (ms != null && ms < HOUR)) return 0; // happening now or today
  if (ms != null) return 1; // has a due date
  if (MONEY.has(i.app)) return 2; // blocks the deal or the money
  return 3; // no deadline
}
const STATE = (ms: number | null) => (ms == null ? "text-ink-2" : ms < HOUR ? "text-state-declined font-semibold" : ms < 8 * HOUR ? "text-state-pending font-semibold" : "text-state-accepted font-semibold");

export function AttentionList({ items }: { items: AttentionItem[] }) {
  const [mode, setMode] = useState<"priority" | "date">("priority");
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    setNow(Date.now());
    try { const m = localStorage.getItem("pm-attention-sort"); if (m === "date" || m === "priority") setMode(m); } catch {}
  }, []);
  const pick = (m: "priority" | "date") => { setMode(m); try { localStorage.setItem("pm-attention-sort", m); } catch {} };
  const at = (i: AttentionItem) => (i.dueAt ? new Date(i.dueAt).getTime() : Infinity);
  const list = items.map((i, n) => ({ i, n })).sort((a, b) =>
    mode === "date"
      ? at(a.i) - at(b.i) || a.n - b.n
      : tier(a.i, now) - tier(b.i, now) || at(a.i) - at(b.i) || a.n - b.n,
  ).map((x) => x.i);
  const chip = (m: "priority" | "date", label: string) => (
    <button type="button" aria-pressed={mode === m} onClick={() => pick(m)} className={mode === m ? "rounded-full border border-ink bg-ink px-3 py-1 text-[12px] font-bold text-surface" : "rounded-full border border-line px-3 py-1 text-[12px] font-semibold text-ink-2 hover:border-ink"}>{label}</button>
  );
  return (
    <>
      <div className="mt-1 flex items-center gap-2" data-attention-sort><span className="text-[12px] text-ink-3">Sort</span>{chip("priority", "Priority")}{chip("date", "By Date")}</div>
      <ul className="mt-2 divide-y divide-line">
        {list.slice(0, 8).map((i) => {
          const ms = i.dueAt ? new Date(i.dueAt).getTime() - now : null;
          return (
            <li key={i.id} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 py-2.5">
              <span className="min-w-0 flex-1">
                <b className="block text-[14px]">{i.what}</b>
                <span className="text-[12.5px] text-ink-2">{i.appLabel}{i.sub ? <> · <span className="font-semibold text-ink">{i.sub}</span></> : null}{i.due ? <> · <span className={STATE(ms)}>due {i.due}</span></> : ""}</span>
              </span>
              <Link href={i.href} className="inline-flex min-h-9 items-center bg-ink px-3.5 text-[13px] font-bold text-surface hover:bg-ink-hover">{i.action}</Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}
