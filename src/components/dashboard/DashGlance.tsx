"use client";

import Link from "next/link";
import { useState } from "react";
import type { DashRow, Donut } from "@/lib/dashboard/types";

// MD-E003: At a Glance (four donuts) + the one table; clicking a slice or legend row filters the table to that type + status.
const PILL: Record<DashRow["tone"], string> = { ok: "bg-state-accepted-bg text-state-accepted", pend: "bg-state-pending-bg text-state-pending", no: "bg-state-declined-bg text-state-declined", st: "bg-state-inactive-bg text-state-inactive" };

function Ring({ d, onPick }: { d: Donut; onPick: (slice: string) => void }) {
  const total = d.slices.reduce((n, s) => n + s.n, 0);
  const r = 36, cx = 44, cy = 44;
  let a = -Math.PI / 2;
  const arcs = total ? d.slices.filter((s) => s.n > 0).map((s) => {
    const f = s.n / total;
    if (f >= 0.999) return <circle key={s.label} cx={cx} cy={cy} r={r} stroke={s.color} strokeWidth={13} fill="none" onClick={() => onPick(s.label)} className="cursor-pointer" />;
    const b = a + f * 2 * Math.PI, large = f > 0.5 ? 1 : 0;
    const path = `M${cx + r * Math.cos(a)} ${cy + r * Math.sin(a)} A${r} ${r} 0 ${large} 1 ${cx + r * Math.cos(b)} ${cy + r * Math.sin(b)}`;
    a = b;
    return <path key={s.label} d={path} stroke={s.color} strokeWidth={13} fill="none" onClick={() => onPick(s.label)} className="cursor-pointer"><title>{`${s.label}: ${s.n}`}</title></path>;
  }) : [<circle key="none" cx={cx} cy={cy} r={r} stroke="#C9CDDC" strokeWidth={13} fill="none" />];
  return (
    <svg width="88" height="88" viewBox="0 0 88 88" aria-label={`${d.title}: ${total}`}>
      {arcs}
      <text x="44" y={total ? 49 : 47} textAnchor="middle" className="fill-ink" style={{ fontWeight: 700, fontSize: total ? 16 : 9.5 }}>{total || "None Yet"}</text>
    </svg>
  );
}

export function DashGlance({ donuts, rows, filters, tableTitle, whoLabel }: { donuts: Donut[]; rows: DashRow[]; filters: [string, string][]; tableTitle: string; whoLabel: string }) {
  const [filter, setFilter] = useState<string>("all");
  const [pick, setPick] = useState<{ donut: string; slice: string } | null>(null);
  const [all, setAll] = useState(false);
  const shown = rows.filter((r) => (pick ? r.donut === pick.donut && r.slice === pick.slice : filter === "all" ? true : filter === "mine" ? r.waitingOnYou : r.type === filter));
  const list = all ? shown : shown.slice(0, 10);
  const choose = (donut: string, slice: string) => { setPick({ donut, slice }); setFilter("all"); };
  return (
    <>
      <h3 className="mt-8 text-[16px] font-extrabold">At a Glance</h3>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" data-donuts>
        {donuts.map((d) => (
          <div key={d.key} className="rounded-[12px] border border-line bg-white p-4" data-donut={d.key}>
            <h4 className="text-[14px] font-extrabold">{d.title}<span className="ml-1.5 text-[11.5px] font-medium text-ink-3">{d.sub}</span></h4>
            <div className="mt-2 flex items-center gap-3">
              <Ring d={d} onPick={(s) => choose(d.key, s)} />
              <div className="min-w-0 flex-1 space-y-0.5 text-[12px]">
                {d.slices.map((s) => (
                  <button key={s.label} type="button" onClick={() => choose(d.key, s.label)} className={`flex w-full items-center gap-1.5 text-left ${s.mine && s.n ? "font-bold text-state-pending" : "text-ink-2"} ${pick?.donut === d.key && pick.slice === s.label ? "underline" : ""}`}>
                    <i className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ background: s.color }} />
                    <span className="min-w-0 flex-1 truncate">{s.label}</span><em className="not-italic tabular-nums">{s.n}</em>
                  </button>
                ))}
                {d.note && <p className="pt-1 text-[11px] text-ink-3">{d.note}</p>}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-[16px] font-extrabold">{tableTitle}</h3>
        <div className="flex flex-wrap gap-1.5 text-[12.5px]" data-dash-filters>
          {pick && <button type="button" onClick={() => setPick(null)} className="rounded-full border border-magenta-dark bg-[#fbeafb] px-3 py-1 font-semibold text-magenta-dark">{pick.slice} ×</button>}
          {filters.map(([k, l]) => <button key={k} type="button" onClick={() => { setFilter(k); setPick(null); }} className={!pick && filter === k ? "rounded-full border border-magenta-dark bg-[#fbeafb] px-3 py-1 font-semibold text-magenta-dark" : "rounded-full border border-line px-3 py-1 font-semibold"}>{l}</button>)}
        </div>
      </div>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-[13px]" data-dash-table>
          <thead><tr className="border-b border-ink text-[11px] uppercase tracking-[0.08em] text-ink-3"><th className="py-2">Type</th><th>What</th><th>{whoLabel}</th><th>Status</th><th>Next Step</th><th>Waiting On</th><th className="text-right">Amount</th><th className="text-right">Updated</th></tr></thead>
          <tbody>
            {list.map((r) => (
              <tr key={r.key} className="border-b border-line">
                <td className="py-2.5"><span className="rounded-[4px] bg-bg-soft px-1.5 py-0.5 text-[11px] font-bold">{r.type}</span></td>
                <td><Link href={r.href} className="font-bold text-ink hover:underline">{r.what}</Link>{r.number && <span className="ml-1.5 text-ink-3">{r.number}</span>}</td>
                <td className="text-ink-2">{r.who}</td>
                <td><span className={`rounded-full px-2 py-0.5 text-[11.5px] font-bold ${PILL[r.tone]}`}>{r.status}</span></td>
                <td className="text-ink-2">{r.next}</td>
                <td className={r.waitingOnYou ? "font-bold text-state-pending" : "text-ink-2"}>{r.waitingOn}</td>
                <td className="text-right tabular-nums">{r.amount}</td>
                <td className="text-right text-ink-3">{new Date(r.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</td>
              </tr>
            ))}
            {!list.length && <tr><td colSpan={8} className="py-5 text-ink-3">Nothing here.</td></tr>}
          </tbody>
        </table>
      </div>
      {!all && shown.length > 10 && <button type="button" onClick={() => setAll(true)} className="mt-2 text-[13px] font-semibold underline">See All ({shown.length})</button>}
    </>
  );
}
