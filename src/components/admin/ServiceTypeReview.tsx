"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Row = { id: string; name: string; baseline: boolean; reviewed: boolean; services: number };

export function ServiceTypeReview({ rows }: { rows: Row[] }) {
  const router = useRouter();
  const [into, setInto] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const act = async (id: string, action: "approve" | "merge") => {
    setBusy(id);
    await fetch("/api/admin/service-types", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, action, into: into[id] }) });
    setBusy(null);
    router.refresh();
  };
  return (
    <table className="w-full text-left text-[13.5px]">
      <thead><tr className="border-b border-line text-ink-2"><th className="py-2">Type</th><th>Source</th><th>Services</th><th /></tr></thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.id} className="border-b border-line" data-service-type={r.reviewed ? "reviewed" : "new"}>
            <td className="py-2 font-semibold">{r.name}</td>
            <td>{r.baseline ? "Baseline" : r.reviewed ? "Added · approved" : "Added · to review"}</td>
            <td>{r.services}</td>
            <td className="text-right">
              {!r.baseline && (
                <span className="inline-flex flex-wrap items-center justify-end gap-2">
                  {!r.reviewed && <button type="button" disabled={busy === r.id} onClick={() => act(r.id, "approve")} className="border border-ink px-3 py-1 text-[12.5px] font-semibold">Approve</button>}
                  <select value={into[r.id] ?? ""} onChange={(e) => setInto({ ...into, [r.id]: e.target.value })} aria-label={`Merge ${r.name} into`} className="h-8 border border-line px-2 text-[12.5px]">
                    <option value="">Merge into…</option>
                    {rows.filter((x) => x.id !== r.id).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                  </select>
                  <button type="button" disabled={!into[r.id] || busy === r.id} onClick={() => act(r.id, "merge")} className="border border-ink px-3 py-1 text-[12.5px] font-semibold disabled:opacity-40">Merge</button>
                </span>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
