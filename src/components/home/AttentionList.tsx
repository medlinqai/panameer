"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { AttentionItem } from "@/lib/attention";

// Scott 10-23: two ways to read Needs Your Attention — Priority (what hurts to miss) or By Date (soonest due first).
const HOUR = 3_600_000;
const MONEY = new Set(["order", "settlement", "payment"]);
function tier(i: AttentionItem, now: number): number {
  if (i.tier != null) return i.tier;
  const ms = i.dueAt ? new Date(i.dueAt).getTime() - now : null;
  if (/today/i.test(i.what) || (ms != null && ms < HOUR)) return 0; // happening now or today
  if (ms != null) return 1; // has a due date
  if (MONEY.has(i.app)) return 2; // blocks the deal or the money
  return 3; // no deadline
}
const STATE = (ms: number | null) => (ms == null ? "text-ink-2" : ms < HOUR ? "text-state-declined font-semibold" : ms < 8 * HOUR ? "text-state-pending font-semibold" : "text-state-accepted font-semibold");

const GO = "inline-flex min-h-9 items-center bg-ink px-3.5 text-[13px] font-bold text-surface hover:bg-ink-hover";
/** Today · Tomorrow · Wed · Ends in 52 min · Passed. */
function dueShort(at: string, now: number): string {
  const t = Date.parse(at);
  const ms = t - now;
  if (ms < 0) return "Passed";
  if (ms < 3_600_000) return `Ends in ${Math.max(1, Math.round(ms / 60_000))} min`;
  const day = (x: number) => new Date(x).toLocaleDateString("en-US", { timeZone: "America/New_York" });
  if (day(t) === day(now)) return "Today";
  if (day(t) === day(now + 86_400_000)) return "Tomorrow";
  if (ms < 6 * 86_400_000) return new Date(t).toLocaleDateString("en-US", { timeZone: "America/New_York", weekday: "short" });
  return new Date(t).toLocaleDateString("en-US", { timeZone: "America/New_York", month: "short", day: "numeric" });
}

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
      {/* JR-E006: one line per thing to act on, its own button; a group shows 3, then See All n. */}
      <div className="mt-2" data-attention-groups>
        {list.slice(0, 8).map((i) => {
          const ms = i.dueAt ? new Date(i.dueAt).getTime() - now : null;
          const lines = i.lines?.length ? [...i.lines].sort((x, y) => (mode === "date" ? (x.dueAt ? Date.parse(x.dueAt) : Infinity) - (y.dueAt ? Date.parse(y.dueAt) : Infinity) : 0)) : null;
          const n = i.n ?? 1;
          if (!lines && n <= 1) return (
            <div key={i.id} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-line py-2.5" data-attention-line>
              <span className="min-w-0 flex-1">
                <b className="block truncate text-[14px]">{i.title ?? i.what}</b>
              </span>
              {i.dueAt && <span className={`text-[12.5px] ${STATE(ms)}`}>{dueShort(i.dueAt, now)}</span>}
              <Link href={i.href} className={GO}>{i.action}</Link>
            </div>
          );
          return (
            <div key={i.id} className="border-b border-line pb-1.5 pt-2.5" data-attention-group={i.title ?? i.what}>
              <p className="flex items-center gap-2 text-[12px] font-extrabold uppercase tracking-[0.08em] text-ink-2">{i.title ?? i.what}<span className="text-state-declined">{n}</span></p>
              {(lines ?? []).slice(0, 3).map((l) => {
                const lm = l.dueAt ? new Date(l.dueAt).getTime() - now : null;
                return (
                  <div key={l.key} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-1.5" data-attention-line>
                    <span className="min-w-0 flex-1">
                      {/* WK-E009: what + button only on a home page; the detail lives on the Worklist and the record. */}
                      <b className="block truncate text-[14px]" title={l.detail || undefined}>{l.what}</b>
                    </span>
                    {l.dueAt && <span className={`text-[12.5px] ${STATE(lm)}`}>{dueShort(l.dueAt, now)}</span>}
                    <Link href={l.href} className={GO}>{l.action}</Link>
                  </div>
                );
              })}
              {(!lines || n > 3) && <Link href={i.href} className="mt-0.5 inline-block text-[12.5px] font-semibold text-ink-2 underline underline-offset-4 hover:text-ink" data-see-all>{`See All ${n} ${i.title ?? ""} →`.replace("  ", " ")}</Link>}
            </div>
          );
        })}
      </div>
    </>
  );
}
