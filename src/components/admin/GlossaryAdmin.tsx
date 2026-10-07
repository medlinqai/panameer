"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/Modal";

// Admin › Glossary (same look as the Skill Catalog list): search, filters, + Add Term, Edit, Hide/Show, visibility.
type Row = { id: string; term: string; category: string | null; type: string | null; definition: string; alsoCalled: string | null; dontSay: string | null; visibility: "PUBLIC" | "ADMIN"; hidden: boolean; confirmNote: string | null };
const BTN = "inline-flex min-h-[32px] items-center border border-ink px-2.5 text-[12.5px] font-bold disabled:opacity-50";
const BTN_K = "inline-flex min-h-[34px] items-center bg-ink px-3 text-[12.5px] font-bold text-surface disabled:opacity-50";
const SEL = "h-[34px] border border-line bg-surface px-2 text-[13px]";
const EMPTY: Row = { id: "", term: "", category: "", type: "Panameer term", definition: "", alsoCalled: "", dontSay: "", visibility: "PUBLIC", hidden: false, confirmNote: "" };

export function GlossaryAdmin({ rows }: { rows: Row[] }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [show, setShow] = useState<"" | "PUBLIC" | "ADMIN" | "hidden" | "confirm">("");
  const [edit, setEdit] = useState<Row | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const cats = useMemo(() => [...new Set(rows.map((r) => r.category).filter((c): c is string => !!c))].sort(), [rows]);
  const shown = useMemo(() => {
    const n = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (cat && r.category !== cat) return false;
      if (show === "hidden" ? !r.hidden : show === "confirm" ? !r.confirmNote : show ? r.visibility !== show : false) return false;
      return !n || [r.term, r.definition, r.alsoCalled ?? "", r.dontSay ?? ""].some((x) => x.toLowerCase().includes(n));
    });
  }, [rows, q, cat, show]);

  const post = async (body: Record<string, unknown>, done: string) => {
    setBusy(true);
    setNote(null);
    const r = await fetch("/api/admin/glossary", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
    const b = (await r?.json().catch(() => null)) as { error?: string } | null;
    setBusy(false);
    if (!r?.ok) return setNote({ ok: false, text: b?.error ?? "That didn't save." }), false;
    setNote({ ok: true, text: done });
    router.refresh();
    return true;
  };

  return (
    <div data-glossary-admin>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="font-display text-[26px] font-bold">Glossary</h1>
          <p className="text-[13px] text-ink-2">
            {rows.length} terms · {rows.filter((r) => r.visibility === "PUBLIC" && !r.hidden).length} on the public page · <a href="/glossary" target="_blank" rel="noreferrer" className="font-semibold underline">Open /glossary</a>
          </p>
        </div>
        <button type="button" data-add-term onClick={() => setEdit({ ...EMPTY })} className={BTN_K}>+ Add Term</button>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search terms, definitions, also called…" aria-label="Search the glossary" className={SEL + " min-w-[240px] flex-1"} />
        <select value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Category" className={SEL}>
          <option value="">All categories</option>
          {cats.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {([["PUBLIC", "Public"], ["ADMIN", "Admin only"], ["hidden", "Hidden"], ["confirm", "Scott to confirm"]] as const).map(([k, l]) => (
          <button key={k} type="button" aria-pressed={show === k} onClick={() => setShow(show === k ? "" : k)} className={"border px-2.5 py-1 text-[12.5px] font-semibold " + (show === k ? "border-ink bg-ink text-surface" : "border-line text-ink-2")}>{l}</button>
        ))}
      </div>
      {note && <p role="status" className={"mt-3 text-[13px] " + (note.ok ? "text-ink-2" : "font-semibold text-magenta-dark")}>{note.text}</p>}
      <p className="mt-3 text-[13.5px]"><b>{shown.length}</b> term{shown.length === 1 ? "" : "s"}</p>
      <div className="mt-2 overflow-x-auto border border-line">
        <table className="w-full min-w-[820px] text-[13.5px]">
          <thead>
            <tr className="border-b border-ink text-left text-[11px] font-bold uppercase tracking-[0.08em] text-ink-3">
              <th className="px-2 py-2">Term</th>
              <th className="px-2 py-2">Definition</th>
              <th className="px-2 py-2">Category</th>
              <th className="px-2 py-2">Shown to</th>
              <th className="px-2 py-2" />
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.id} data-term-row={r.term} className={"border-b border-line align-top " + (r.hidden ? "text-ink-3" : "")}>
                <td className="px-2 py-2">
                  <b>{r.term}</b>
                  {r.alsoCalled && <span className="block text-[11.5px] text-ink-3">also: {r.alsoCalled}</span>}
                  {r.confirmNote && <span className="mt-0.5 block text-[11.5px] font-semibold text-amber-800">To confirm: {r.confirmNote}</span>}
                </td>
                <td className="max-w-[420px] px-2 py-2 text-ink-2">{r.definition}{r.dontSay && <span className="mt-0.5 block text-[11.5px] text-ink-3">Don&apos;t say: {r.dontSay}</span>}</td>
                <td className="px-2 py-2 text-ink-2">{r.category ?? "—"}<span className="block text-[11.5px] text-ink-3">{r.type}</span></td>
                <td className="px-2 py-2">
                  <button type="button" disabled={busy} onClick={() => post({ action: "flags", id: r.id, visibility: r.visibility === "PUBLIC" ? "ADMIN" : "PUBLIC" }, `"${r.term}" is now ${r.visibility === "PUBLIC" ? "admin only" : "public"}.`)} className="border px-1.5 text-[10.5px] font-bold" title="Click to switch">
                    {r.visibility === "PUBLIC" ? "PUBLIC" : "ADMIN ONLY"}
                  </button>
                  {r.hidden && <span className="ml-1 border border-line px-1.5 text-[10.5px] font-bold">HIDDEN</span>}
                </td>
                <td className="whitespace-nowrap px-2 py-2 text-right">
                  <button type="button" onClick={() => setEdit(r)} className="mr-2 text-[12.5px] font-bold text-magenta-dark">Edit</button>
                  <button type="button" disabled={busy} onClick={() => post({ action: "flags", id: r.id, hidden: !r.hidden }, r.hidden ? `"${r.term}" is shown again.` : `"${r.term}" is hidden.`)} className={BTN}>{r.hidden ? "Show" : "Hide"}</button>
                </td>
              </tr>
            ))}
            {shown.length === 0 && <tr><td colSpan={5} className="px-3 py-6 text-center text-[13px] text-ink-2">No terms match.</td></tr>}
          </tbody>
        </table>
      </div>
      {edit && <TermForm key={edit.id || "new"} row={edit} cats={cats} busy={busy} onClose={() => setEdit(null)} onSave={(fields) => post(edit.id ? { action: "edit", id: edit.id, fields } : { action: "add", fields }, `Saved "${fields.term}".`)} />}
    </div>
  );
}

function TermForm({ row, cats, busy, onClose, onSave }: { row: Row; cats: string[]; busy: boolean; onClose: () => void; onSave: (f: Record<string, unknown> & { term: string }) => Promise<boolean> }) {
  const [f, setF] = useState(row);
  const set = (p: Partial<Row>) => setF({ ...f, ...p });
  const field = (label: string, el: React.ReactNode) => (
    <label className="block text-[11px] font-bold tracking-[0.08em] text-ink-3">{label}<span className="mt-1 block font-normal tracking-normal text-ink">{el}</span></label>
  );
  return (
    <Modal open onClose={onClose} title={row.id ? `Edit "${row.term}"` : "Add a term"} width="max-w-xl">
      <div data-term-form className="space-y-3">
        {field("TERM", <input value={f.term} onChange={(e) => set({ term: e.target.value })} className={SEL + " w-full"} />)}
        {field("DEFINITION", <textarea value={f.definition} onChange={(e) => set({ definition: e.target.value })} rows={4} className="w-full border border-line p-2 text-[13px]" />)}
        <div className="grid gap-3 sm:grid-cols-2">
          {field("CATEGORY", <><input list="glossary-cats" value={f.category ?? ""} onChange={(e) => set({ category: e.target.value })} className={SEL + " w-full"} /><datalist id="glossary-cats">{cats.map((c) => <option key={c} value={c} />)}</datalist></>)}
          {field("TYPE", <input value={f.type ?? ""} onChange={(e) => set({ type: e.target.value })} placeholder="Panameer term, Acronym, Status…" className={SEL + " w-full"} />)}
        </div>
        {field("ALSO CALLED (CROSS-REFERENCE)", <input value={f.alsoCalled ?? ""} onChange={(e) => set({ alsoCalled: e.target.value })} placeholder="Other names, separated by ;" className={SEL + " w-full"} />)}
        {field("DON'T SAY", <input value={f.dontSay ?? ""} onChange={(e) => set({ dontSay: e.target.value })} className={SEL + " w-full"} />)}
        <div className="grid gap-3 sm:grid-cols-2">
          {field("SHOWN TO", <select value={f.visibility} onChange={(e) => set({ visibility: e.target.value as Row["visibility"] })} className={SEL + " w-full"}><option value="PUBLIC">Public (on /glossary)</option><option value="ADMIN">Admin only</option></select>)}
          {field("TO CONFIRM", <input value={f.confirmNote ?? ""} onChange={(e) => set({ confirmNote: e.target.value })} placeholder="Clear when settled" className={SEL + " w-full"} />)}
        </div>
        <label className="flex items-center gap-2 text-[13px] font-semibold"><input type="checkbox" checked={f.hidden} onChange={(e) => set({ hidden: e.target.checked })} /> Hidden</label>
        <div className="flex justify-end gap-2 border-t border-line pt-3">
          <button type="button" onClick={onClose} className="text-[13px] font-semibold text-ink-2">Cancel</button>
          <button
            type="button"
            disabled={busy || !f.term.trim() || !f.definition.trim()}
            onClick={async () => (await onSave({ term: f.term, category: f.category, type: f.type, definition: f.definition, alsoCalled: f.alsoCalled, dontSay: f.dontSay, visibility: f.visibility, hidden: f.hidden, confirmNote: f.confirmNote })) && onClose()}
            className={BTN_K}
          >
            Save
          </button>
        </div>
      </div>
    </Modal>
  );
}
