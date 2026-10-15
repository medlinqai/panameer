"use client";

import { useState } from "react";

// TX-E006 / BR-E004: What We Buy — orders Shop (ticked first); it no longer hides anything.
type G = { id: string; name: string; parked: boolean; on: boolean; businessTypes: { id: string; name: string; on: boolean }[] };

export function WhatWeBuyEditor({ initial, canEdit }: { initial: G[]; canEdit: boolean }) {
  const [groups, setGroups] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const set = async (body: object) => {
    setError(null);
    const r = await fetch("/api/company/what-we-buy", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = (await r.json().catch(() => ({}))) as { groups?: G[]; error?: string };
    if (r.ok && j.groups) setGroups(j.groups);
    else setError(j.error ?? "Could not save that");
  };
  return (
    <section id="what-we-buy" data-what-we-buy className="mt-8 border-t border-line pt-5">
      <h2 className="text-[19px] font-bold">What We Buy · Show These First</h2>
      <p className="mt-1 text-[13.5px] text-ink-2">Shop shows everything. What you tick here comes first; nothing is hidden.</p>
      <ul className="mt-3 grid gap-2">
        {groups.map((g) => (
          <li key={g.id} className="border border-line p-3">
            <label className="flex items-center gap-2 text-[14px] font-bold">
              <input type="checkbox" checked={g.on} disabled={!canEdit} onChange={(e) => set({ commodityGroupId: g.id, enabled: e.target.checked })} className="h-4 w-4 accent-ink" />
              {g.name}
              {g.parked && <span className="text-[11px] font-semibold text-ink-3">· not open yet</span>}
            </label>
            {g.on && g.businessTypes.length > 0 && (
              <span className="mt-2 flex flex-wrap gap-3 pl-6">
                {g.businessTypes.map((b) => (
                  <label key={b.id} className="flex items-center gap-1.5 text-[13px]">
                    <input type="checkbox" checked={b.on} disabled={!canEdit} onChange={(e) => set({ businessTypeId: b.id, enabled: e.target.checked })} className="h-4 w-4 accent-ink" />
                    {b.name}
                  </label>
                ))}
              </span>
            )}
          </li>
        ))}
      </ul>
      {error && <p role="alert" className="mt-2 text-[13px] font-semibold text-magenta-dark">{error}</p>}
    </section>
  );
}
