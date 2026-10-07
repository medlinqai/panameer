"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Modal } from "@/components/Modal";
import type { AreaRow } from "@/lib/skill-area-store";

// Admin › Skill Catalog as one searchable list (mockup skill_catalog_admin 2026-10-07): A list, B edit panel, C To Review.
export type ListSkill = { id: string; name: string; aliases: string[]; roleTypeId: string; pillarId: string | null; role: string; domain: string; area: string | null; members: number; hidden: boolean; isNew: boolean };
export type Pair = { roleTypeId: string; pillarId: string; role: string; domain: string };
export type ReviewCard = { id: string; typed: string; members: number; place: string | null; guess: string | null; addAs: string; closest: { id: string; name: string; domain: string; members: number; same: boolean } | null };
type Initial = { tab?: string; q?: string; role?: string; domain?: string; area?: string; st?: string; page?: string };

const PAGE = 100;
const BTN = "inline-flex min-h-[34px] items-center border border-ink px-3 text-[12.5px] font-bold disabled:opacity-50";
const BTN_K = "inline-flex min-h-[34px] items-center bg-ink px-3 text-[12.5px] font-bold text-surface disabled:opacity-50";
const SEL = "h-[34px] border border-line bg-surface px-2 text-[13px]";
const statusOf = (s: ListSkill) => (s.hidden ? "hidden" : s.isNew ? "new" : "live");
const STATUS_LABEL: Record<string, string> = { live: "LIVE", hidden: "HIDDEN", new: "NEW" };
const pairKey = (r: string, p: string | null) => `${r}:${p ?? ""}`;
const csvCell = (v: string | number) => (/[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));

async function post(body: Record<string, unknown>) {
  const r = await fetch("/api/admin/catalog", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
  const b = (await r?.json().catch(() => null)) as { ok?: boolean; error?: string; message?: string; code?: string } | null;
  return r?.ok ? { ok: true as const, message: b?.message ?? "Saved.", code: b?.code } : { ok: false as const, error: b?.error ?? "That didn't save." };
}

// Areas come from the SkillArea table; every picker can add one ("+ New Area…").
const AreasCtx = createContext<{ areas: AreaRow[]; run: Run }>({ areas: [], run: async () => false });
const NEW = "__new";

/** An area picker: visible areas (plus the current one even if hidden) and "+ New Area…" last, which adds inline. */
function AreaSelect({ value, onChange, empty, extra, className = SEL, label = "Area" }: { value: string; onChange: (v: string) => void; empty: string; extra?: React.ReactNode; className?: string; label?: string }) {
  const { areas, run } = useContext(AreasCtx);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const opts = areas.filter((a) => !a.hidden || a.code === value);
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);
  void run;
  // Calls the API directly so a refusal shows HERE, not behind the edit box.
  const save = async () => {
    setErr(null);
    const r = await post({ action: "area.add", label: name.trim(), ...(code.trim() ? { code: code.trim().toUpperCase() } : {}) });
    if (!r.ok) { setErr(r.error); return; }
    if (r.code) onChange(r.code);
    setAdding(false);
    setName("");
    setCode("");
    router.refresh();
  };
  return (
    <span className="inline-block">
      <select value={value} aria-label={label} onChange={(e) => (e.target.value === NEW ? setAdding(true) : onChange(e.target.value))} className={className}>
        <option value="">{empty}</option>
        {opts.map((a) => <option key={a.code} value={a.code}>{a.label}{a.hidden ? " (hidden)" : ""}</option>)}
        {extra}
        <option value={NEW}>+ New Area…</option>
      </select>
      {adding && (
        <span data-new-area className="mt-1.5 flex flex-wrap items-center gap-1.5 border border-ink bg-surface p-2 text-[12.5px] font-normal tracking-normal text-ink">
          <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Name (required)" aria-label="New area name" className={SEL + " w-[200px]"} />
          <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="Short code (optional)" aria-label="New area short code" className={SEL + " w-[150px] uppercase"} />
          <button type="button" disabled={name.trim().length < 2} onClick={save} className={BTN_K}>Save</button>
          <button type="button" onClick={() => setAdding(false)} className="font-semibold text-ink-2">Cancel</button>
          {err && <span role="alert" className="w-full font-semibold text-magenta-dark">{err}</span>}
        </span>
      )}
    </span>
  );
}

/** One area's name + short code; a code change moves every skill that uses it. */
function AreaEdit({ area, onDone }: { area: AreaRow; onDone: () => void }) {
  const { run } = useContext(AreasCtx);
  const [label, setLabel] = useState(area.label);
  const [code, setCode] = useState(area.code);
  return (
    <span data-area-edit className="flex flex-wrap items-center gap-1.5 text-[12.5px] font-normal tracking-normal text-ink">
      <input value={label} onChange={(e) => setLabel(e.target.value)} aria-label="Area name" className={SEL + " w-[200px]"} />
      <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} aria-label="Area short code" className={SEL + " w-[120px] uppercase"} />
      <button type="button" disabled={label.trim().length < 2 || code.trim().length < 2} onClick={async () => (await run({ action: "area.update", id: area.id, label: label.trim(), code: code.trim() })) && onDone()} className={BTN_K}>Save</button>
      <button type="button" onClick={onDone} className="font-semibold text-ink-2">Cancel</button>
    </span>
  );
}

function ManageAreas({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { areas, run } = useContext(AreasCtx);
  const [editing, setEditing] = useState<string | null>(null);
  return (
    <Modal open={open} onClose={onClose} title="Manage Areas" width="max-w-2xl">
      <p className="mb-3 text-[12.5px] text-ink-2">Hidden areas drop out of pickers; skills keep them. Areas are never deleted.</p>
      <ul data-manage-areas className="border-t border-line">
        {areas.map((a, i) => (
          <li key={a.id} data-area-row={a.code} className="flex flex-wrap items-center justify-between gap-2 border-b border-line py-2 text-[13.5px]">
            {editing === a.id ? (
              <AreaEdit area={a} onDone={() => setEditing(null)} />
            ) : (
              <span className={a.hidden ? "text-ink-3" : ""}>
                <b>{a.label}</b> <span className="text-[12px] text-ink-3">{a.code}{a.hidden ? " · hidden" : ""}</span>
              </span>
            )}
            {editing !== a.id && (
              <span className="flex items-center gap-1.5">
                <button type="button" aria-label={`Move ${a.label} up`} disabled={i === 0} onClick={() => run({ action: "area.move", id: a.id, dir: "up" })} className={BTN}>↑</button>
                <button type="button" aria-label={`Move ${a.label} down`} disabled={i === areas.length - 1} onClick={() => run({ action: "area.move", id: a.id, dir: "down" })} className={BTN}>↓</button>
                <button type="button" onClick={() => setEditing(a.id)} className={BTN}>Edit</button>
                <button type="button" onClick={() => run({ action: "area.hidden", id: a.id, hidden: !a.hidden })} className={BTN}>{a.hidden ? "Show" : "Hide"}</button>
              </span>
            )}
          </li>
        ))}
      </ul>
      <div className="mt-3"><AreaSelect value="" onChange={() => null} empty="Add an area…" label="Add an area" /></div>
    </Modal>
  );
}

export function SkillCatalogList({ rows, pairs, review, specReviewCount, initial, areas }: { rows: ListSkill[]; pairs: Pair[]; review: ReviewCard[]; specReviewCount: number; initial: Initial; areas: AreaRow[] }) {
  const router = useRouter();
  const path = usePathname();
  const [tab, setTab] = useState(initial.tab === "review" || initial.tab === "compare" ? "review" : initial.tab === "hidden" ? "hidden" : "all");
  const [q, setQ] = useState(initial.q ?? "");
  const [role, setRole] = useState(initial.role ?? "");
  const [domain, setDomain] = useState(initial.domain ?? "");
  const [area, setArea] = useState(initial.area ?? "");
  const [st, setSt] = useState<Set<string>>(new Set((initial.st ?? "").split(",").filter(Boolean)));
  const [page, setPage] = useState(Math.max(0, Number(initial.page ?? 1) - 1));
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<{ id: string; value: string } | null>(null);
  const [panel, setPanel] = useState<string | null>(null);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  // The URL keeps the filters.
  useEffect(() => {
    const p = new URLSearchParams();
    if (tab !== "all") p.set("tab", tab);
    if (q) p.set("q", q);
    if (role) p.set("role", role);
    if (domain) p.set("domain", domain);
    if (area) p.set("area", area);
    if (st.size) p.set("st", [...st].join(","));
    if (page) p.set("page", String(page + 1));
    const qs = p.toString();
    window.history.replaceState(null, "", qs ? `${path}?${qs}` : path);
  }, [tab, q, role, domain, area, st, page, path]);

  const roles = useMemo(() => [...new Map(pairs.map((p) => [p.roleTypeId, p.role])).entries()], [pairs]);
  const domains = useMemo(() => [...new Map(pairs.filter((p) => !role || p.roleTypeId === role).map((p) => [p.pillarId, p.domain])).entries()].sort((a, b) => a[1].localeCompare(b[1])), [pairs, role]);
  const run = async (body: Record<string, unknown>, after?: () => void) => {
    setBusy(true);
    setNote(null);
    const r = await post(body);
    setBusy(false);
    setNote(r.ok ? { ok: true, text: r.message } : { ok: false, text: r.error });
    if (r.ok) {
      after?.();
      router.refresh();
    }
    return r.ok ? r : false;
  };
  const AREA_LABEL: Record<string, string> = Object.fromEntries(areas.map((a) => [a.code, a.label]));
  const [manage, setManage] = useState(false);

  const shown = useMemo(() => {
    const n = q.trim().toLowerCase();
    return rows.filter((s) => {
      if (tab === "hidden" && !s.hidden) return false;
      if (n && !s.name.toLowerCase().includes(n) && !s.aliases.some((a) => a.toLowerCase().includes(n))) return false;
      if (role && s.roleTypeId !== role) return false;
      if (domain && s.pillarId !== domain) return false;
      if (area && (area === "none" ? s.area : s.area !== area)) return false;
      const status = [...st].filter((x) => x !== "unused");
      if (status.length && !status.includes(statusOf(s))) return false;
      if (st.has("unused") && s.members > 0) return false;
      return true;
    });
  }, [rows, tab, q, role, domain, area, st]);
  const pages = Math.max(1, Math.ceil(shown.length / PAGE));
  const pageRows = shown.slice(Math.min(page, pages - 1) * PAGE, Math.min(page, pages - 1) * PAGE + PAGE);
  const where = [roles.find(([id]) => id === role)?.[1], domains.find(([id]) => id === domain)?.[1]].filter(Boolean).join(" › ");
  const hiddenCount = rows.filter((s) => s.hidden).length;
  const reset = () => setPage(0);
  const toggleSt = (k: string) => { const n = new Set(st); if (n.has(k)) n.delete(k); else n.add(k); setSt(n); reset(); };

  const exportCsv = () => {
    const out = [["Skill", "Role", "Domain", "Area", "Members", "Status", "Also matches"], ...shown.map((s) => [s.name, s.role, s.domain, s.area ? AREA_LABEL[s.area] : "", s.members, STATUS_LABEL[statusOf(s)], s.aliases.join("; ")])];
    const blob = new Blob([out.map((r) => r.map(csvCell).join(",")).join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `skill-catalog-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  return (
    <AreasCtx.Provider value={{ areas, run }}>
    <div data-skill-catalog-list>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="font-display text-[26px] font-bold">Skill Catalog</h1>
          <p className="text-[13px] text-ink-2">{rows.length.toLocaleString()} skills · {roles.length} roles · {new Set(pairs.map((p) => p.pillarId)).size} domains</p>
        </div>
        <a href="?view=tree" className="text-[12.5px] font-semibold text-ink-2 underline underline-offset-2">Old tree view</a>
      </div>
      <div role="tablist" className="mt-3 flex gap-1 border-b border-line">
        {([["all", "All Skills", null], ["review", "To Review", review.length], ["hidden", "Hidden", hiddenCount]] as const).map(([k, label, n]) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} data-tab={k} onClick={() => { setTab(k); reset(); setPicked(new Set()); }} className={"-mb-px border-b-2 px-3 py-2 text-[13.5px] font-bold " + (tab === k ? "border-ink text-ink" : "border-transparent text-ink-2")}>
            {label}{n != null && <span className="ml-1.5 bg-bg-soft px-1.5 text-[11.5px]">{n}</span>}
          </button>
        ))}
      </div>
      {note && <p role="status" className={"mt-3 text-[13px] " + (note.ok ? "text-ink-2" : "font-semibold text-magenta-dark")}>{note.text}</p>}

      {tab === "review" ? (
        <Review cards={review} pairs={pairs} rows={rows} busy={busy} run={run} specReviewCount={specReviewCount} />
      ) : (
        <>
          <div className="mt-4 flex flex-wrap items-end gap-2">
            <label className="flex min-w-[220px] flex-1 flex-col text-[11px] font-bold tracking-[0.08em] text-ink-3">
              SEARCH
              <input value={q} onChange={(e) => { setQ(e.target.value); reset(); }} placeholder="Skill name or what résumés say…" aria-label="Search skills" className={SEL + " mt-1 font-normal tracking-normal text-ink"} />
            </label>
            <label className="flex flex-col text-[11px] font-bold tracking-[0.08em] text-ink-3">
              ROLE
              <select value={role} onChange={(e) => { setRole(e.target.value); setDomain(""); reset(); }} className={SEL + " mt-1 font-normal tracking-normal text-ink"}>
                <option value="">All</option>
                {roles.map(([id, l]) => <option key={id} value={id}>{l}</option>)}
              </select>
            </label>
            <label className="flex flex-col text-[11px] font-bold tracking-[0.08em] text-ink-3">
              DOMAIN / APP
              <select value={domain} onChange={(e) => { setDomain(e.target.value); reset(); }} className={SEL + " mt-1 max-w-[220px] font-normal tracking-normal text-ink"}>
                <option value="">All</option>
                {domains.map(([id, l]) => <option key={id} value={id}>{l}</option>)}
              </select>
            </label>
            <label className="flex flex-col text-[11px] font-bold tracking-[0.08em] text-ink-3">
              <span className="flex items-center justify-between gap-2">AREA <button type="button" data-manage-areas-link onClick={() => setManage(true)} className="text-[11px] font-semibold tracking-normal text-magenta-dark underline">Manage Areas</button></span>
              <span className="mt-1"><AreaSelect value={area} onChange={(v) => { setArea(v); reset(); }} empty="All" extra={<option value="none">No area</option>} className={SEL + " font-normal tracking-normal text-ink"} /></span>
            </label>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {([["live", "Live"], ["hidden", "Hidden"], ["new", "New"], ["unused", "Unused (0 members)"]] as const).map(([k, l]) => (
              <button key={k} type="button" aria-pressed={st.has(k)} data-chip={k} onClick={() => toggleSt(k)} className={"border px-2.5 py-1 text-[12.5px] font-semibold " + (st.has(k) ? "border-ink bg-ink text-surface" : "border-line text-ink-2")}>{l}</button>
            ))}
            <button type="button" aria-pressed={area === "none"} data-chip="noarea" onClick={() => { setArea(area === "none" ? "" : "none"); reset(); }} className={"border px-2.5 py-1 text-[12.5px] font-semibold " + (area === "none" ? "border-ink bg-ink text-surface" : "border-line text-ink-2")}>No Area</button>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <p data-count className="text-[13.5px]">
              <b>{shown.length.toLocaleString()}</b> skill{shown.length === 1 ? "" : "s"} match{shown.length === 1 ? "es" : ""}
              {q.trim() ? ` "${q.trim()}"` : ""}{where ? ` in ${where}` : ""}{area ? ` · ${area === "none" ? "No area" : AREA_LABEL[area]}` : ""}
            </p>
            <span className="flex gap-2">
              <AddSkill pairs={pairs} busy={busy} run={run} />
              <button type="button" onClick={exportCsv} className={BTN}>Export CSV</button>
            </span>
          </div>

          {picked.size > 0 && <BulkBar ids={[...picked]} pairs={pairs} rows={rows} busy={busy} run={run} clear={() => setPicked(new Set())} />}

          <div className="mt-2 overflow-x-auto border border-line">
            <table className="w-full min-w-[760px] text-[13.5px]">
              <thead>
                <tr className="border-b border-ink text-left text-[11px] font-bold uppercase tracking-[0.08em] text-ink-3">
                  <th className="w-8 px-2 py-2">
                    <input type="checkbox" aria-label="Select all on this page" checked={pageRows.length > 0 && pageRows.every((s) => picked.has(s.id))} onChange={(e) => { const n = new Set(picked); for (const s of pageRows) if (e.target.checked) n.add(s.id); else n.delete(s.id); setPicked(n); }} />
                  </th>
                  <th className="px-2 py-2">Skill</th>
                  <th className="px-2 py-2">Role › Domain</th>
                  <th className="px-2 py-2">Area</th>
                  <th className="px-2 py-2 text-right">Members</th>
                  <th className="px-2 py-2">Status</th>
                  <th className="px-2 py-2" />
                </tr>
              </thead>
              <tbody>
                {pageRows.map((s) => (
                  <tr key={s.id} data-skill-row={s.id} className="border-b border-line align-top">
                    <td className="px-2 py-2"><input type="checkbox" aria-label={`Select ${s.name}`} checked={picked.has(s.id)} onChange={() => { const n = new Set(picked); if (n.has(s.id)) n.delete(s.id); else n.add(s.id); setPicked(n); }} /></td>
                    <td className="px-2 py-2">
                      {editing?.id === s.id ? (
                        <span className="block">
                          <input
                            autoFocus
                            value={editing.value}
                            aria-label={`Rename ${s.name}`}
                            onChange={(e) => setEditing({ id: s.id, value: e.target.value })}
                            onKeyDown={(e) => {
                              if (e.key === "Escape") setEditing(null);
                              if (e.key === "Enter" && editing.value.trim() && editing.value.trim() !== s.name) void run({ action: "skill.update", id: s.id, name: editing.value.trim() }, () => setEditing(null));
                            }}
                            className="h-[32px] w-full border-2 border-ink px-2 text-[13.5px]"
                          />
                          <span className="mt-0.5 block text-[11.5px] text-ink-3">Was &ldquo;{s.name}&rdquo; · Enter to save · Esc to cancel</span>
                        </span>
                      ) : (
                        <button type="button" data-rename onClick={() => setEditing({ id: s.id, value: s.name })} className="text-left font-semibold hover:underline" title="Click to rename">
                          {s.name}
                        </button>
                      )}
                      {s.aliases.length > 0 && editing?.id !== s.id && <span className="block truncate text-[11.5px] text-ink-3">also: {s.aliases.join(", ")}</span>}
                    </td>
                    <td className="px-2 py-2 text-ink-2">{s.role} › {s.domain}</td>
                    <td className="px-2 py-2 text-ink-2">{s.area ? AREA_LABEL[s.area] : <span className="text-ink-3">—</span>}</td>
                    <td className="px-2 py-2 text-right">{s.members}</td>
                    <td className="px-2 py-2"><span className={"border px-1.5 text-[10.5px] font-bold " + (s.hidden ? "border-line text-ink-3" : "border-ink")}>{STATUS_LABEL[statusOf(s)]}</span></td>
                    <td className="px-2 py-2 text-right"><button type="button" data-edit onClick={() => setPanel(s.id)} className="text-[12.5px] font-bold text-magenta-dark">Edit</button></td>
                  </tr>
                ))}
                {pageRows.length === 0 && <tr><td colSpan={7} className="px-3 py-6 text-center text-[13px] text-ink-2">No skills match.</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="mt-2 flex items-center justify-between text-[12.5px] text-ink-2">
            <span>Showing {pageRows.length} of {shown.length.toLocaleString()}</span>
            {pages > 1 && (
              <span className="flex items-center gap-2">
                <button type="button" disabled={page === 0} onClick={() => setPage(page - 1)} className={BTN}>Previous</button>
                Page {Math.min(page, pages - 1) + 1} of {pages}
                <button type="button" disabled={page >= pages - 1} onClick={() => setPage(page + 1)} className={BTN}>Next</button>
              </span>
            )}
          </div>
        </>
      )}
      {panel && <EditPanel key={panel} skill={rows.find((r) => r.id === panel)!} pairs={pairs} rows={rows} busy={busy} run={run} onClose={() => setPanel(null)} />}
      <ManageAreas open={manage} onClose={() => setManage(false)} />
    </div>
    </AreasCtx.Provider>
  );
}

type Run = (body: Record<string, unknown>, after?: () => void) => Promise<false | { ok: true; message: string; code?: string }>;

function PairSelect({ pairs, value, onChange, label }: { pairs: Pair[]; value: string; onChange: (v: string) => void; label: string }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} aria-label={label} className={SEL}>
      <option value="">{label}…</option>
      {pairs.map((p) => <option key={pairKey(p.roleTypeId, p.pillarId)} value={pairKey(p.roleTypeId, p.pillarId)}>{p.role} › {p.domain}</option>)}
    </select>
  );
}
const splitPair = (v: string) => { const [roleTypeId, pillarId] = v.split(":"); return { roleTypeId, pillarId }; };

/** Search the live catalog and pick one skill (for Merge into…). */
function SkillPicker({ rows, exclude, onPick, label = "Merge into…" }: { rows: ListSkill[]; exclude: string[]; onPick: (s: ListSkill) => void; label?: string }) {
  const [q, setQ] = useState("");
  const hits = q.trim().length < 2 ? [] : rows.filter((r) => !exclude.includes(r.id) && r.name.toLowerCase().includes(q.trim().toLowerCase())).slice(0, 8);
  return (
    <span className="relative inline-block">
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={label} aria-label={label} className={SEL + " w-[220px]"} />
      {hits.length > 0 && (
        <ul className="absolute z-20 mt-1 max-h-[220px] w-[320px] overflow-y-auto border border-ink bg-surface shadow-lg">
          {hits.map((h) => (
            <li key={h.id}>
              <button type="button" onClick={() => { onPick(h); setQ(""); }} className="w-full px-2 py-1.5 text-left text-[13px] hover:bg-bg-soft">
                <b>{h.name}</b> <span className="text-ink-3">· {h.domain} · {h.members}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </span>
  );
}

function BulkBar({ ids, pairs, rows, busy, run, clear }: { ids: string[]; pairs: Pair[]; rows: ListSkill[]; busy: boolean; run: Run; clear: () => void }) {
  const [to, setTo] = useState("");
  const [area, setArea] = useState("");
  return (
    <div data-bulk className="mt-2 flex flex-wrap items-center gap-2 border border-ink bg-bg-soft p-2 text-[13px]">
      <b>{ids.length} ticked:</b>
      <PairSelect pairs={pairs} value={to} onChange={setTo} label="Move to domain" />
      <button type="button" disabled={busy || !to} onClick={() => run({ action: "skill.bulk", op: "move", ids, ...splitPair(to) }, clear)} className={BTN}>Move</button>
      <AreaSelect value={area} onChange={setArea} empty="Set area…" label="Set area" extra={<option value="none">No area</option>} />
      <button type="button" disabled={busy || !area} onClick={() => run({ action: "skill.bulk", op: "area", ids, area: area === "none" ? null : area }, clear)} className={BTN}>Set</button>
      <button type="button" disabled={busy} onClick={() => run({ action: "skill.bulk", op: "hide", ids }, clear)} className={BTN}>Hide</button>
      <button type="button" disabled={busy} onClick={() => run({ action: "skill.bulk", op: "show", ids }, clear)} className={BTN}>Show</button>
      <SkillPicker rows={rows} exclude={ids} onPick={(s) => { if (window.confirm(`Merge ${ids.length} skill${ids.length === 1 ? "" : "s"} into "${s.name}"? Members move to it and the merged names become its aliases.`)) void run({ action: "skill.bulk", op: "merge", ids, intoId: s.id }, clear); }} />
      <button type="button" onClick={clear} className="text-[12.5px] font-semibold text-ink-2">Clear</button>
    </div>
  );
}

function AddSkill({ pairs, busy, run }: { pairs: Pair[]; busy: boolean; run: Run }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [at, setAt] = useState("");
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={BTN_K}>+ Add Skill</button>
      <Modal open={open} onClose={() => setOpen(false)} title="Add a skill">
        <label className="block text-[12px] font-bold text-ink-2">Name<input value={name} onChange={(e) => setName(e.target.value)} className={SEL + " mt-1 block w-full"} /></label>
        <div className="mt-3"><PairSelect pairs={pairs} value={at} onChange={setAt} label="Role › Domain" /></div>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={() => setOpen(false)} className="text-[13px] font-semibold text-ink-2">Cancel</button>
          <button type="button" disabled={busy || name.trim().length < 2 || !at} onClick={() => run({ action: "skill.add", name: name.trim(), ...splitPair(at) }, () => { setOpen(false); setName(""); })} className={BTN_K}>Add</button>
        </div>
      </Modal>
    </>
  );
}

function EditPanel({ skill, pairs, rows, busy, run, onClose }: { skill: ListSkill; pairs: Pair[]; rows: ListSkill[]; busy: boolean; run: Run; onClose: () => void }) {
  const [name, setName] = useState(skill.name);
  const [at, setAt] = useState(pairKey(skill.roleTypeId, skill.pillarId));
  const [area, setArea] = useState(skill.area ?? "");
  const { areas } = useContext(AreasCtx);
  const [editArea, setEditArea] = useState(false);
  const areaRow = areas.find((a) => a.code === area);
  const [aliases, setAliases] = useState(skill.aliases.join(", "));
  const [hidden, setHidden] = useState(skill.hidden);
  const save = () => run({ action: "skill.update", id: skill.id, name: name.trim(), ...splitPair(at), area: area || null, aliases: aliases.split(",").map((a) => a.trim()).filter(Boolean), visible: !hidden }, onClose);
  return (
    <Modal open onClose={onClose} title="Edit Skill" width="max-w-xl">
      <div data-edit-panel className="space-y-3 text-[13px]">
        <label className="block text-[11px] font-bold tracking-[0.08em] text-ink-3">
          NAME
          <input value={name} onChange={(e) => setName(e.target.value)} className={SEL + " mt-1 block w-full text-[14px] font-semibold tracking-normal text-ink"} />
          <span className="mt-0.5 block font-normal tracking-normal text-ink-3">Spelling and capitals are exactly what members see.</span>
        </label>
        <label className="block text-[11px] font-bold tracking-[0.08em] text-ink-3">
          ROLE › DOMAIN / APP
          <span className="mt-1 block font-normal tracking-normal"><PairSelect pairs={pairs} value={at} onChange={setAt} label="Role › Domain" /></span>
        </label>
        <label className="block text-[11px] font-bold tracking-[0.08em] text-ink-3">
          AREA
          <span className="mt-1 flex flex-wrap items-start gap-2 font-normal tracking-normal">
            <AreaSelect value={area} onChange={setArea} empty="No area" className={SEL + " text-ink"} />
            {area && !editArea && <button type="button" data-area-pencil aria-label="Edit this area" title="Edit this area" onClick={() => setEditArea(true)} className="h-[34px] px-1.5 text-[15px] text-ink-2 hover:text-ink">✎</button>}
          </span>
          {editArea && areaRow && <span className="mt-1.5 block"><AreaEdit area={areaRow} onDone={() => setEditArea(false)} /></span>}
        </label>
        <label className="block text-[11px] font-bold tracking-[0.08em] text-ink-3">
          ALSO MATCHES (WHAT RÉSUMÉS SAY)
          <input value={aliases} onChange={(e) => setAliases(e.target.value)} placeholder="Comma-separated" className={SEL + " mt-1 block w-full font-normal tracking-normal text-ink"} />
          <span className="mt-0.5 block font-normal tracking-normal text-ink-3">The parser files these words under this skill.</span>
        </label>
        <div className="flex flex-wrap items-center gap-3 border-t border-line pt-3">
          <SkillPicker rows={rows} exclude={[skill.id]} label="Merge into another…" onPick={(s) => { if (window.confirm(`Merge "${skill.name}" into "${s.name}"? Its ${skill.members} member${skill.members === 1 ? "" : "s"} move and "${skill.name}" becomes an alias.`)) void run({ action: "skill.merge", id: skill.id, intoId: s.id }, onClose); }} />
          <label className="flex items-center gap-1.5 font-semibold"><input type="checkbox" checked={hidden} onChange={(e) => setHidden(e.target.checked)} /> Hide</label>
        </div>
        <p className="text-[12.5px] text-ink-2"><b className="text-ink">{skill.members}</b> member{skill.members === 1 ? " has" : "s have"} this skill{skill.members ? " — renaming updates their profiles" : ""}.</p>
        <div className="flex justify-end gap-2 border-t border-line pt-3">
          <button type="button" onClick={onClose} className="text-[13px] font-semibold text-ink-2">Cancel</button>
          <button type="button" disabled={busy || name.trim().length < 2 || !at} onClick={save} className={BTN_K}>Save</button>
        </div>
      </div>
    </Modal>
  );
}

function Review({ cards, pairs, rows, busy, run, specReviewCount }: { cards: ReviewCard[]; pairs: Pair[]; rows: ListSkill[]; busy: boolean; run: Run; specReviewCount: number }) {
  return (
    <div data-review className="mt-4">
      <p className="text-[14px] font-bold">To Review <span className="font-normal text-ink-2">· skills members typed that aren&apos;t in the catalog</span></p>
      {specReviewCount > 0 && <p className="mt-1 text-[12.5px] text-ink-2">{specReviewCount} specialization{specReviewCount === 1 ? "" : "s"} also waiting — <a href="?view=tree&tab=compare" className="font-bold underline">review them in the old view</a>.</p>}
      {cards.length === 0 && <p className="mt-4 text-[13.5px] text-ink-2">Nothing waiting.</p>}
      <div className="mt-3 grid gap-3">
        {cards.map((c) => <ReviewItem key={c.id} c={c} pairs={pairs} rows={rows} busy={busy} run={run} />)}
      </div>
    </div>
  );
}

function ReviewItem({ c, pairs, rows, busy, run }: { c: ReviewCard; pairs: Pair[]; rows: ListSkill[]; busy: boolean; run: Run }) {
  const [name, setName] = useState(c.addAs);
  const [at, setAt] = useState(c.guess ?? "");
  return (
    <div data-review-card={c.id} className="grid gap-3 border border-line p-3 sm:grid-cols-[1fr_1.4fr]">
      <div>
        <p className="text-[10.5px] font-bold tracking-[0.1em] text-ink-3">MEMBERS TYPED</p>
        <p className="text-[16px] font-bold">{c.typed}</p>
        <p className="text-[12.5px] text-ink-2">{c.members} member{c.members === 1 ? "" : "s"}{c.place ? ` · ${c.place}` : ""}</p>
      </div>
      <div className="space-y-2">
        <label className="block text-[10.5px] font-bold tracking-[0.1em] text-ink-3">
          ADD AS
          <input value={name} onChange={(e) => setName(e.target.value)} aria-label={`Add ${c.typed} as`} className={SEL + " mt-1 block w-full text-[14px] font-semibold tracking-normal text-ink"} />
        </label>
        <PairSelect pairs={pairs} value={at} onChange={setAt} label="Domain / App" />
        {c.closest && (
          <p className="text-[12.5px] text-ink-2">
            {c.closest.same ? "Already in the catalog" : "Closest"}: <b className="text-ink">{c.closest.name}</b> ({c.closest.domain}, {c.closest.members} member{c.closest.members === 1 ? "" : "s"}){c.closest.same ? " — merging is probably right." : "."}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-2">
          {c.closest && <button type="button" disabled={busy} onClick={() => run({ action: "review.skill.merge", id: c.id, intoId: c.closest!.id })} className={BTN_K}>Merge into {c.closest.name}</button>}
          <SkillPicker rows={rows} exclude={[]} onPick={(s) => void run({ action: "review.skill.merge", id: c.id, intoId: s.id })} />
          <button type="button" disabled={busy || name.trim().length < 2 || !at} onClick={() => run({ action: "review.skill.add", id: c.id, name: name.trim(), ...splitPair(at) })} className={BTN}>Add as New</button>
          <button type="button" disabled={busy} onClick={() => run({ action: "review.skill.reject", id: c.id })} className="text-[12.5px] font-bold text-ink-2">Reject</button>
        </div>
      </div>
    </div>
  );
}
