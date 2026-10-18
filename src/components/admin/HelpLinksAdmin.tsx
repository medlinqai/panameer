"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// II-E001: Informational Items (Oracle term) — the list Scott keeps — title, one line, type, URL; up / down to reorder; On / Off; samples flagged.
type Row = { id: string; title: string; description: string | null; type: string; url: string; active: boolean; sample: boolean };
const TYPES = [["VIDEO", "Video"], ["INSTAGRAM", "Instagram"], ["WORD", "Word"], ["PDF", "PDF"], ["WEB_PAGE", "Web page"]] as const;
const FIELD = "w-full border border-line bg-white px-2.5 py-2 text-[14px]";
const BTN = "inline-flex min-h-9 items-center border border-ink px-3 text-[13px] font-semibold hover:bg-surface-hover disabled:opacity-40";
const empty = { title: "", description: "", type: "WEB_PAGE", url: "" };

export function HelpLinksAdmin({ rows }: { rows: Row[] }) {
  const router = useRouter();
  const [edit, setEdit] = useState<{ id: string | null; title: string; description: string; type: string; url: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const post = async (body: object) => {
    setBusy(true);
    setError(null);
    const r = await fetch("/api/admin/help-links", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
    setBusy(false);
    if (!r?.ok) { setError(((await r?.json().catch(() => ({}))) as { error?: string })?.error ?? "That didn't save."); return false; }
    router.refresh();
    return true;
  };
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-bold">Informational Items</h1>
          <p className="text-[13.5px] text-ink-2">Catalog entries that point to helpful content instead of being bought. They list on /help (Shop › Help), show in Shop search, and open inside Panameer when the source allows it.</p>
        </div>
        <button type="button" className={BTN} onClick={() => setEdit({ id: null, ...empty })}>+ Add Informational Item</button>
      </div>
      {error && <p role="alert" className="mt-2 text-[13.5px] font-semibold text-magenta-dark">{error}</p>}
      {edit && (
        <div className="mt-3 grid gap-2 border border-line bg-bg-soft p-3 sm:grid-cols-2" data-help-link-form>
          <label className="text-[12.5px] font-bold">Title<input className={FIELD} value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} /></label>
          <label className="text-[12.5px] font-bold">Type<select className={FIELD} value={edit.type} onChange={(e) => setEdit({ ...edit, type: e.target.value })}>{TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
          <label className="text-[12.5px] font-bold sm:col-span-2">One line<input className={FIELD} value={edit.description} onChange={(e) => setEdit({ ...edit, description: e.target.value })} /></label>
          <label className="text-[12.5px] font-bold sm:col-span-2">URL<input className={FIELD} value={edit.url} onChange={(e) => setEdit({ ...edit, url: e.target.value })} placeholder="https://" /></label>
          <div className="flex gap-2 sm:col-span-2">
            <button type="button" className={BTN} disabled={busy} onClick={async () => { if (await post({ action: "save", id: edit.id, input: { title: edit.title, description: edit.description, type: edit.type, url: edit.url } })) setEdit(null); }}>Save</button>
            <button type="button" className={BTN} onClick={() => setEdit(null)}>Cancel</button>
          </div>
        </div>
      )}
      <ul className="mt-4 divide-y divide-line border-y border-line">
        {rows.map((r, i) => (
          <li key={r.id} className="flex flex-wrap items-start gap-3 py-3" data-help-link-row>
            <div className="min-w-0 flex-1">
              <p className={r.active ? "text-[14.5px] font-bold" : "text-[14.5px] font-bold text-ink-3"}>
                {r.title} <span className="ml-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-3">{TYPES.find((t) => t[0] === r.type)?.[1]}</span>
                {r.sample && <span className="ml-2 border border-magenta px-1 text-[10.5px] font-bold text-magenta-dark">SAMPLE</span>}
                {!r.active && <span className="ml-2 text-[11px] font-semibold text-ink-3">Off</span>}
              </p>
              {r.description && <p className="text-[13px] text-ink-2">{r.description}</p>}
              <p className="truncate text-[12px] text-ink-3">{r.url}</p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button type="button" className={BTN} aria-label="Move up" disabled={busy || i === 0} onClick={() => post({ action: "move", id: r.id, dir: "up" })}>↑</button>
              <button type="button" className={BTN} aria-label="Move down" disabled={busy || i === rows.length - 1} onClick={() => post({ action: "move", id: r.id, dir: "down" })}>↓</button>
              <button type="button" className={BTN} onClick={() => setEdit({ id: r.id, title: r.title, description: r.description ?? "", type: r.type, url: r.url })}>Edit</button>
              <button type="button" className={BTN} disabled={busy} onClick={() => post({ action: "active", id: r.id, active: !r.active })}>{r.active ? "Turn Off" : "Turn On"}</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
