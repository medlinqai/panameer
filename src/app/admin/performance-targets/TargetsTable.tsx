"use client";

import { useState } from "react";
import type { TargetRow } from "@/lib/dashboard/targets";

// MD-E005: one editable table per role — value + optional label; unsaved rows show their default.
export function TargetsTable({ role, title, initial }: { role: "BUYER" | "SELLER"; title: string; initial: TargetRow[] }) {
  const [rows, setRows] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const save = async () => {
    setBusy(true); setMsg(null);
    const r = await fetch("/api/admin/performance-targets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role, rows: rows.map((x) => ({ metric: x.metric, value: x.value, label: x.label })) }) }).catch(() => null);
    setBusy(false);
    setMsg(r?.ok ? "Saved." : "Couldn't save — try again.");
    if (r?.ok) setRows((rs) => rs.map((x) => ({ ...x, saved: true })));
  };
  return (
    <section className="mt-6" data-targets={role}>
      <h2 className="text-[18px] font-extrabold">{title}</h2>
      <table className="mt-2 w-full text-left text-[13.5px]">
        <thead><tr className="border-b border-line text-ink-2"><th className="py-2">Metric</th><th>Label</th><th className="w-32 text-right">Target</th><th className="w-24" /></tr></thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.metric} className="border-b border-line">
              <td className="py-1.5 font-mono text-[12px] text-ink-2">{r.metric}</td>
              <td><input value={r.label} onChange={(e) => setRows((rs) => rs.map((x, k) => (k === i ? { ...x, label: e.target.value } : x)))} className="w-full border border-line px-2 py-1" /></td>
              <td className="text-right"><input inputMode="decimal" value={String(r.value)} onChange={(e) => setRows((rs) => rs.map((x, k) => (k === i ? { ...x, value: Number(e.target.value.replace(/[^0-9.]/g, "")) || 0 } : x)))} className="w-24 border border-line px-2 py-1 text-right" /></td>
              <td className="pl-2 text-[11.5px] text-ink-3">{r.saved ? "Target" : "Default Target"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-3 flex items-center gap-3"><button type="button" disabled={busy} onClick={save} className="inline-flex min-h-10 items-center bg-ink px-5 text-[14px] font-semibold text-surface disabled:opacity-40">Save {title}</button>{msg && <span className="text-[13px] text-ink-2">{msg}</span>}</div>
    </section>
  );
}
