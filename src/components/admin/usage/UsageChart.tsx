"use client";

import Link from "next/link";
import { useState } from "react";

// A-E002: one series per chart — Panameer magenta line + light fill, hover crosshair + tooltip, table view toggle. No dual axes.
type Point = { day: string; n: number };
const W = 720, H = 200, PAD = { l: 34, r: 10, t: 12, b: 26 };
const fmt = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

export function UsageChart({ title, subtitle, points, tabs, unit = "" }: { title: string; subtitle?: string; points: Point[]; tabs?: { label: string; href: string; on: boolean }[]; unit?: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const [table, setTable] = useState(false);
  const max = Math.max(1, ...points.map((p) => p.n));
  const x = (i: number) => PAD.l + (points.length <= 1 ? 0 : (i * (W - PAD.l - PAD.r)) / (points.length - 1));
  const y = (n: number) => PAD.t + (1 - n / max) * (H - PAD.t - PAD.b);
  const line = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(p.n).toFixed(1)}`).join(" ");
  const area = points.length ? `${line} L${x(points.length - 1).toFixed(1)} ${H - PAD.b} L${x(0).toFixed(1)} ${H - PAD.b} Z` : "";
  const total = points.reduce((s, p) => s + p.n, 0);
  const h = hover != null ? points[hover] : null;
  return (
    <section data-usage-chart className="border border-line bg-white p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-[17px] font-bold">{title}</h2>
        <span className="text-[12.5px] text-ink-2">{subtitle}{subtitle ? " · " : ""}total {total}{unit}</span>
      </div>
      {tabs && (
        <nav className="mt-2 flex flex-wrap gap-1">
          {tabs.map((t) => <Link key={t.label} href={t.href} className={"border px-2.5 py-1 text-[12px] font-semibold " + (t.on ? "border-ink bg-ink text-surface" : "border-line hover:border-ink")}>{t.label}</Link>)}
        </nav>
      )}
      {table ? (
        <div className="mt-3 max-h-[260px] overflow-auto">
          <table className="w-full text-left text-[13px]"><thead><tr className="text-ink-3"><th className="py-1">Day</th><th className="text-right">Count</th></tr></thead>
            <tbody>{points.map((p) => <tr key={p.day} className="border-t border-line"><td className="py-1">{fmt(p.day)}</td><td className="text-right tabular-nums">{p.n}</td></tr>)}</tbody></table>
        </div>
      ) : (
        <div className="relative mt-3">
          <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label={`${title}, ${points.length} days`} onMouseLeave={() => setHover(null)}
            onMouseMove={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              const px = ((e.clientX - r.left) / r.width) * W;
              const i = Math.round(((px - PAD.l) / (W - PAD.l - PAD.r)) * (points.length - 1));
              setHover(Math.max(0, Math.min(points.length - 1, i)));
            }}>
            {[0, 0.5, 1].map((f) => <g key={f}><line x1={PAD.l} x2={W - PAD.r} y1={y(max * f)} y2={y(max * f)} stroke="#ECEEF4" /><text x={PAD.l - 6} y={y(max * f) + 4} textAnchor="end" fontSize={10} fill="#8A90A8">{Math.round(max * f)}</text></g>)}
            <path d={area} fill="rgba(201,59,208,0.10)" />
            <path d={line} fill="none" stroke="#C93BD0" strokeWidth={2.2} strokeLinejoin="round" />
            {points.length > 0 && <text x={PAD.l} y={H - 8} fontSize={10} fill="#8A90A8">{fmt(points[0].day)}</text>}
            {points.length > 1 && <text x={W - PAD.r} y={H - 8} textAnchor="end" fontSize={10} fill="#8A90A8">{fmt(points[points.length - 1].day)}</text>}
            {h && hover != null && <g><line x1={x(hover)} x2={x(hover)} y1={PAD.t} y2={H - PAD.b} stroke="#272334" strokeDasharray="3 3" /><circle cx={x(hover)} cy={y(h.n)} r={4} fill="#C93BD0" /></g>}
          </svg>
          {h && hover != null && (
            <div className="pointer-events-none absolute top-0 border border-line bg-white px-2 py-1 text-[12px] shadow" style={{ left: `${(x(hover) / W) * 100}%`, transform: "translateX(-50%)" }}>
              <b>{h.n}{unit}</b> · {fmt(h.day)}
            </div>
          )}
        </div>
      )}
      <button type="button" onClick={() => setTable((t) => !t)} className="mt-2 text-[12px] font-semibold text-ink-2 underline underline-offset-2">{table ? "Show Chart" : "Show Table"}</button>
    </section>
  );
}
