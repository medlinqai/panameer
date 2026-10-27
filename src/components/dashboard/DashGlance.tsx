"use client";

import Link from "next/link";
import { useState } from "react";
import type { DashRow, Donut } from "@/lib/dashboard/types";
import type { AttentionItem } from "@/lib/attention";
import { tileCount } from "@/lib/tile-actions";

// MD-E003 / JR-E007/E009: At a Glance pies (each with See All →) on the dashboard; the table on My Transactions (Active by default, 5 rows, Show 10 More).
const PILL: Record<DashRow["tone"], string> = { ok: "bg-state-accepted-bg text-state-accepted", pend: "bg-state-pending-bg text-state-pending", no: "bg-state-declined-bg text-state-declined", st: "bg-state-inactive-bg text-state-inactive" };
const DAY = 86_400_000;
import { txHref } from "@/lib/dashboard/tx-href";

function Ring({ d, size }: { d: Donut; size: number }) {
  const total = d.slices.reduce((n, s) => n + s.n, 0);
  const sw = size > 70 ? 13 : 10, r = size / 2 - sw / 2 - 1, c = size / 2;
  let a = -Math.PI / 2;
  const arcs = total ? d.slices.filter((s) => s.n > 0).map((s) => {
    const f = s.n / total;
    if (f >= 0.999) return <circle key={s.label} cx={c} cy={c} r={r} stroke={s.color} strokeWidth={sw} fill="none" />;
    const b = a + f * 2 * Math.PI, large = f > 0.5 ? 1 : 0;
    const path = `M${c + r * Math.cos(a)} ${c + r * Math.sin(a)} A${r} ${r} 0 ${large} 1 ${c + r * Math.cos(b)} ${c + r * Math.sin(b)}`;
    a = b;
    return <path key={s.label} d={path} stroke={s.color} strokeWidth={sw} fill="none"><title>{`${s.label}: ${s.n}`}</title></path>;
  }) : [<circle key="none" cx={c} cy={c} r={r} stroke="#C9CDDC" strokeWidth={sw} fill="none" />];
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-label={`${d.title}: ${total}`} className="shrink-0">
      {arcs}
      <text x={c} y={c + (total ? 5 : 3)} textAnchor="middle" className="fill-ink" style={{ fontWeight: 700, fontSize: total ? (size > 70 ? 16 : 14) : 8.5 }}>{d.center ?? (total || "None Yet")}</text>
    </svg>
  );
}

/** The pies; a slice or See All opens My Transactions filtered (or the slice's own page). */
export function DashPies({ donuts, side, size = 88, cols = "sm:grid-cols-2 lg:grid-cols-4", compact = false, actions, app }: { donuts: Donut[]; side: string; size?: number; cols?: string; /** WK-E009: home pages — title, ring and numbers only; the title opens the tile. */ compact?: boolean; /** NC-E004: the Worklist groups, for each tile's "n Actions Required →". */ actions?: AttentionItem[]; app?: string }) {
  return (
    <div className={`grid gap-3 ${cols}`} data-donuts>
      {donuts.map((d) => (
        <div key={d.key} className="flex flex-col rounded-[12px] border border-line bg-white p-3.5" data-donut={d.key}>
          <h4 className="flex flex-wrap items-baseline gap-x-1.5 text-[14px] font-extrabold">{compact ? <Link href={d.href ?? txHref(side, { donut: d.key })} className="hover:underline">{d.title}</Link> : <>{d.title}<span className="text-[11.5px] font-medium text-ink-3">{d.sub}</span></>}
            {d.total && <span className="text-[12px] font-semibold text-ink-3" data-tile-total>{d.total}</span>}
            {actions && (() => { const c = tileCount(actions, d.key, app); return c.n > 0 ? <Link href={c.href} className={`ml-auto rounded-full px-2.5 py-0.5 text-[11.5px] font-bold hover:underline ${c.overdue ? "bg-state-declined-bg text-state-declined" : "bg-state-pending-bg text-state-pending"}`} data-tile-actions>{c.overdue ? `${c.overdue} Overdue →` : `${c.n} Action${c.n === 1 ? "" : "s"} Required →`}</Link> : null; })()}
          </h4>
          {d.lead && !compact && <p className="mt-0.5 text-[11.5px] text-ink-2" data-donut-lead>{d.lead.text} · <Link href={d.lead.href} className="font-semibold text-ink hover:underline">{d.lead.label} →</Link></p>}
          <div className="mt-2 flex items-center gap-3">
            <Ring d={d} size={size} />
            <div className="min-w-0 flex-1 space-y-0.5 text-[12px]">
              {d.checklist?.map((i) => (
                <Link key={i.label} href={i.href} className="flex w-full items-center gap-1.5 text-ink-2 hover:underline" data-checklist-item={i.label}>
                  <i className={`inline-block h-2 w-2 shrink-0 rounded-full ${i.n > 0 ? "bg-ink" : "bg-[#C9CDDC]"}`} />
                  <span className="min-w-0 flex-1 truncate">{i.label}</span>{i.n > 0 ? <em className="not-italic tabular-nums">{i.n}</em> : <em className="not-italic font-semibold text-ink">{i.action}</em>}
                </Link>
              ))}
              {!d.checklist && d.slices.map((s) => s.untracked ? (
                <span key={s.label} className="flex w-full items-center gap-1.5 text-ink-3" title="Not tracked yet" data-untracked>
                  <i className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ background: s.color }} />
                  <span className="min-w-0 flex-1 truncate">{s.label}</span><em className="not-italic">—</em>
                </span>
              ) : (
                <Link key={s.label} href={s.href ?? txHref(side, { donut: d.key, slice: s.label })} className={`flex w-full items-center gap-1.5 text-left hover:underline ${s.mine && s.n ? `font-bold text-state-pending ${compact ? "-mx-1 rounded bg-state-pending-bg px-1" : ""}` : "text-ink-2"}`}>
                  <i className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ background: s.color }} />
                  <span className="min-w-0 flex-1 truncate">{s.label}</span><em className="not-italic tabular-nums">{s.n}</em>
                </Link>
              ))}
              {!compact && d.slices.some((s) => s.untracked) && <p className="pt-0.5 text-[10.5px] text-ink-3">— Not tracked yet</p>}
              {d.note && !compact && <p className="pt-1 text-[11px] text-ink-3">{d.note}</p>}
            </div>
          </div>
          {!compact && <Link href={d.href ?? txHref(side, { donut: d.key })} className="mt-auto self-end pt-1.5 text-[12px] font-semibold text-ink-2 hover:text-ink" data-see-all>{d.seeAllLabel ?? "See All"} →</Link>}
        </div>
      ))}
    </div>
  );
}

/** Active = not finished; finished rows (Filled, Closed, Completed) older than 30 days drop out of every view but Closed. */
export function DashTable({ rows, filters, title, whoLabel, side, initial, pick: pick0, seeAll = true }: { rows: DashRow[]; filters: [string, string][]; title: string; whoLabel: string; side: string; initial?: string; pick?: { donut: string; slice?: string } | null; seeAll?: boolean }) {
  const [filter, setFilter] = useState<string>(initial ?? "active");
  const [pick, setPick] = useState(pick0 ?? null);
  const [count, setCount] = useState(5);
  const [now] = useState(() => Date.now());
  const fresh = (r: DashRow) => !r.done || now - Date.parse(r.updatedAt) <= 30 * DAY;
  const shown = rows.filter((r) => (pick ? r.donut === pick.donut && (!pick.slice || r.slice === pick.slice)
    : filter === "closed" ? r.done
    : !fresh(r) ? false
    : filter === "active" ? !r.done : filter === "mine" ? r.waitingOnYou : r.type === filter));
  const list = shown.slice(0, count);
  return (
    <>
      <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-[16px] font-extrabold">{title}{seeAll && <Link href={txHref(side)} className="ml-3 text-[12.5px] font-semibold text-ink-2 hover:text-ink">See All →</Link>}</h3>
        <div className="flex flex-wrap gap-1.5 text-[12.5px]" data-dash-filters>
          {pick && <button type="button" onClick={() => setPick(null)} className="rounded-full border border-magenta-dark bg-[#fbeafb] px-3 py-1 font-semibold text-magenta-dark">{pick.slice ?? pick.donut} ×</button>}
          {filters.map(([k, l]) => <button key={k} type="button" onClick={() => { setFilter(k); setPick(null); setCount(5); }} className={!pick && filter === k ? "rounded-full border border-ink bg-ink px-3 py-1 font-semibold text-surface" : "rounded-full border border-line px-3 py-1 font-semibold"}>{l}</button>)}
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
      {shown.length > count && <button type="button" onClick={() => setCount((c) => c + 10)} className="mt-2 text-[13px] font-semibold underline">Show {Math.min(10, shown.length - count)} More</button>}
    </>
  );
}
