"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// CH-E005: Export to Excel · Import (dry run first, then Apply) — like loading a PCCH in Oracle.
type Change = { op: string; level: string; what: string };
const BTN = "inline-flex min-h-9 items-center border border-ink bg-white px-3 text-[13px] font-semibold hover:bg-surface-hover disabled:opacity-40";

export function CategoryHierarchyIO() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [changes, setChanges] = useState<Change[] | null>(null);
  const [applied, setApplied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const send = async (f: File, apply: boolean) => {
    setBusy(true);
    setError(null);
    const body = new FormData();
    body.set("file", f);
    body.set("apply", apply ? "1" : "0");
    const r = await fetch("/api/admin/category-hierarchy", { method: "POST", body }).catch(() => null);
    const j = (await r?.json().catch(() => ({}))) as { changes?: Change[]; error?: string };
    setBusy(false);
    if (!r?.ok) { setError(j.error ?? "Could not read that file."); return; }
    setChanges(j.changes ?? []);
    setApplied(apply);
    if (apply) router.refresh();
  };
  return (
    <section className="mb-6 border border-line bg-white p-4" data-hierarchy-io>
      <div className="flex flex-wrap items-center gap-2">
        <a href="/api/admin/category-hierarchy" className={BTN}>Export to Excel</a>
        <label className={BTN}>
          Import…
          <input type="file" accept=".xlsx" className="sr-only" onChange={(e) => { const f = e.target.files?.[0] ?? null; setFile(f); setChanges(null); if (f) void send(f, false); }} />
        </label>
        <span className="text-[12.5px] text-ink-2">Edit the exported sheet in Excel; import shows the adds, renames and moves first. Nothing is deleted.</span>
      </div>
      {error && <p role="alert" className="mt-2 text-[13px] font-semibold text-magenta-dark">{error}</p>}
      {changes && (
        <div className="mt-3" data-import-changes>
          <p className="text-[13.5px] font-bold">{applied ? `Applied ${changes.length} change${changes.length === 1 ? "" : "s"}.` : changes.length ? `Dry run: ${changes.length} change${changes.length === 1 ? "" : "s"}` : "Dry run: nothing to change."}</p>
          {changes.length > 0 && (
            <ul className="mt-1 max-h-64 overflow-y-auto text-[13px]">
              {changes.map((c, i) => <li key={i} className="border-t border-line py-1"><b className="uppercase text-ink-2">{c.op}</b> · {c.level} · {c.what}</li>)}
            </ul>
          )}
          {!applied && changes.length > 0 && file && <button type="button" disabled={busy} onClick={() => send(file, true)} className="mt-2 inline-flex min-h-9 items-center bg-ink px-4 text-[13px] font-bold text-surface hover:bg-ink-hover disabled:opacity-40">Apply</button>}
        </div>
      )}
    </section>
  );
}
