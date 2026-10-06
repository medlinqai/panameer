"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CHIPS, LABELS, filtersToQuery, type ConnFilters } from "@/lib/connections-query";
import { SkillTreePicker, type PickerTree } from "@/components/console/SkillTreePicker";

// Connections: search, quick chips with counts, applied chips, Save as view, and the All Filters panel. Filters live in the URL.
type Props = {
  f: ConnFilters;
  total: number;
  chipCounts: Record<string, number>;
  invites: { in: number; out: number };
  applied: { label: string; query: string }[];
  tree: PickerTree;
};

const href = (q: string) => (q ? `?${q}` : "?");
const BTN = "inline-flex min-h-[40px] items-center border px-3.5 text-[13px] font-bold";

export function ConnectionsControls({ f, total, chipCounts, invites, applied, tree }: Props) {
  const router = useRouter();
  const [q, setQ] = useState(f.q);
  const [panel, setPanel] = useState(false);
  const [saving, setSaving] = useState(false);
  const [viewName, setViewName] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const panelCount = [f.rel, f.how, f.skills, f.roles, f.modes, f.trust, f.act].reduce((n, a) => n + a.length, 0) + (f.pastco ? 1 : 0) + (f.loc ? 1 : 0) + (f.rmin != null || f.rmax != null ? 1 : 0);

  const save = async () => {
    const r = await fetch("/api/connect/views", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: viewName, query: filtersToQuery(f) }) }).catch(() => null);
    const b = (await r?.json().catch(() => ({}))) as { error?: string } | undefined;
    if (!r?.ok) return setMsg(b?.error ?? "That didn't save.");
    setSaving(false);
    setViewName("");
    setMsg("Saved.");
    router.refresh();
  };

  return (
    <div data-connections-controls>
      <p className="text-[13px] text-ink-2">
        Your People · <b className="text-ink">{total}</b> connections
      </p>
      <form
        className="mt-2 flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          router.push(href(filtersToQuery({ ...f, q })));
        }}
      >
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, company, skill…" aria-label="Search your connections" className="h-10 min-w-[200px] flex-1 border border-line bg-surface px-3 text-[14px] focus:border-ink focus:outline-none" />
        <button type="button" data-all-filters onClick={() => setPanel(true)} className={`${BTN} border-ink`}>
          All Filters{panelCount ? ` (${panelCount})` : ""}
        </button>
        <Link href="/invite-colleague" className={`${BTN} border-ink bg-ink text-surface`}>
          Invite
        </Link>
      </form>

      <nav aria-label="Quick filters" className="-mx-1 mt-3 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {CHIPS.map((c) => {
          const on = f.chip === c.key;
          return (
            <Link
              key={c.key}
              href={href(filtersToQuery({ ...f, chip: c.key }))}
              data-chip={c.key}
              aria-current={on ? "true" : undefined}
              className={"shrink-0 whitespace-nowrap border px-3 py-1.5 text-[13px] font-semibold " + (on ? "border-ink bg-ink text-surface" : "border-line text-ink hover:border-ink")}
            >
              {c.label} <span className={on ? "opacity-80" : "text-ink-3"}>{c.key === "invites" ? `${invites.in} in · ${invites.out} out` : chipCounts[c.key] ?? 0}</span>
            </Link>
          );
        })}
      </nav>

      {applied.length > 0 && (
        <div data-applied className="mt-3 flex flex-wrap items-center gap-1.5 text-[12.5px]">
          <span className="text-ink-2">Showing:</span>
          {applied.map((a) => (
            <Link key={a.label} href={href(a.query)} className="border border-line px-2 py-0.5 font-semibold hover:border-ink" aria-label={`Remove ${a.label}`}>
              {a.label} ×
            </Link>
          ))}
          <Link href="?" className="font-bold text-magenta-dark underline underline-offset-2">Clear all</Link>
          {saving ? (
            <span className="flex items-center gap-1.5">
              <input autoFocus value={viewName} onChange={(e) => setViewName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && save()} placeholder="Name this view" aria-label="View name" className="h-8 w-[180px] border border-line px-2" />
              <button type="button" onClick={save} disabled={!viewName.trim()} className="border border-ink bg-ink px-2 py-1 font-bold text-surface disabled:opacity-50">Save</button>
              <button type="button" onClick={() => setSaving(false)} className="px-1 font-semibold text-ink-2">Cancel</button>
            </span>
          ) : (
            <button type="button" data-save-view onClick={() => setSaving(true)} className="font-bold text-magenta-dark underline underline-offset-2">Save as View</button>
          )}
          {msg && <span className="text-ink-2">{msg}</span>}
        </div>
      )}

      {panel && <FiltersPanel f={f} tree={tree} onClose={() => setPanel(false)} />}
    </div>
  );
}

/** Saved views (left column): click to apply, × to delete. */
export function SavedViews({ views }: { views: { id: string; name: string; query: string; count: number }[] }) {
  const router = useRouter();
  const del = async (id: string) => {
    await fetch(`/api/connect/views?id=${id}`, { method: "DELETE" }).catch(() => null);
    router.refresh();
  };
  return (
    <section data-saved-views className="border-t border-line pt-4">
      <h2 className="text-[11px] font-bold uppercase tracking-[0.1em] text-ink-2">Saved views</h2>
      <ul className="mt-2">
        {views.map((v) => (
          <li key={v.id} className="group flex items-center gap-2 border-b border-line/60 py-1.5 text-[13.5px]">
            <Link href={href(v.query)} className="min-w-0 flex-1 truncate font-semibold hover:text-magenta-dark">{v.name}</Link>
            <span className="text-ink-3">{v.count}</span>
            <button type="button" onClick={() => del(v.id)} aria-label={`Delete view ${v.name}`} className="px-1 text-ink-3 hover:text-ink">×</button>
          </li>
        ))}
      </ul>
      {views.length === 0 && <p className="mt-2 text-[12.5px] text-ink-2">Save any filter set to come back to it.</p>}
    </section>
  );
}

function FiltersPanel({ f, tree, onClose }: { f: ConnFilters; tree: PickerTree; onClose: () => void }) {
  const router = useRouter();
  const [d, setD] = useState<ConnFilters>({ ...f, chip: "all" });
  const [count, setCount] = useState<number | null>(null);
  const query = filtersToQuery(d);
  useEffect(() => {
    let live = true;
    const t = setTimeout(() => {
      fetch(`/api/connect/count?${query}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((b) => live && setCount(b?.count ?? null))
        .catch(() => {});
    }, 250);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [query]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);
  const toggle = (k: "rel" | "how" | "roles" | "modes" | "trust" | "act", v: string) => setD((x) => ({ ...x, [k]: x[k].includes(v) ? x[k].filter((y) => y !== v) : [...x[k], v] }));
  const pill = (k: "rel" | "how" | "roles" | "modes" | "trust" | "act", v: string) => (
    <button key={v} type="button" aria-pressed={d[k].includes(v)} data-filter={`${k}:${v}`} onClick={() => toggle(k, v)} className={"border px-2.5 py-1 text-[12.5px] font-semibold " + (d[k].includes(v) ? "border-ink bg-ink text-surface" : "border-line hover:border-ink")}>
      {LABELS[v]}
    </button>
  );
  const later = (label: string) => (
    <span key={label} className="cursor-not-allowed border border-dashed border-line px-2.5 py-1 text-[12.5px] text-ink-3" aria-disabled>
      {label} <b className="text-[10px] tracking-[0.06em]">LATER</b>
    </span>
  );
  const INPUT = "h-9 border border-line bg-surface px-2.5 text-[13.5px] focus:border-ink focus:outline-none";
  return (
    <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-label="All Filters">
      <button type="button" aria-label="Close filters" className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div data-filters-panel className="absolute inset-y-0 right-0 flex w-full max-w-[460px] flex-col bg-surface shadow-2xl">
        <div className="flex items-center justify-between border-b border-line px-5 py-3">
          <h2 className="text-[17px] font-bold">All Filters</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="px-2 text-[20px]">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto px-5">
          <G n={1} title="Relationship">
            <div className="flex flex-wrap gap-1.5">
              {["colleague", "mentor", "mentee", "connected", "invin", "invout"].map((v) => pill("rel", v))}
              {later("Their connections (2nd)")}
            </div>
          </G>
          <G n={2} title="How you know them">
            <div className="flex flex-wrap gap-1.5">
              {["worked", "samecompany", "course", "team"].map((v) => pill("how", v))}
              {later("Introduced by…")}
            </div>
            <input value={d.pastco} onChange={(e) => setD({ ...d, pastco: e.target.value })} placeholder="Past companies: type a company…" aria-label="Past company" className={`${INPUT} mt-2 w-full`} />
          </G>
          <G n={3} title="What they do">
            <SkillTreePicker tree={tree} selected={d.skills} onChange={(skills) => setD({ ...d, skills })} />
            <div className="mt-2 flex flex-wrap gap-1.5">{["func", "tech", "techfunc", "pm"].map((v) => pill("roles", v))}</div>
          </G>
          <G n={4} title="Availability & work">
            <div className="flex flex-wrap gap-1.5">{["onsite", "hybrid", "remote"].map((v) => pill("modes", v))}</div>
            <div className="mt-2 flex items-center gap-2 text-[13px]">
              Rate $<input inputMode="numeric" value={d.rmin ?? ""} onChange={(e) => setD({ ...d, rmin: /^\d+$/.test(e.target.value) ? Number(e.target.value) : null })} aria-label="Minimum rate" className={`${INPUT} w-20`} />
              to $<input inputMode="numeric" value={d.rmax ?? ""} onChange={(e) => setD({ ...d, rmax: /^\d+$/.test(e.target.value) ? Number(e.target.value) : null })} aria-label="Maximum rate" className={`${INPUT} w-20`} /> / hr
            </div>
            <input value={d.loc} onChange={(e) => setD({ ...d, loc: e.target.value })} placeholder="Location…" aria-label="Location" className={`${INPUT} mt-2 w-full`} />
          </G>
          <G n={5} title="Trust">
            <div className="flex flex-wrap gap-1.5">{["verified", "score70", "creds", "work"].map((v) => pill("trust", v))}</div>
          </G>
          <G n={6} title="Activity">
            <div className="flex flex-wrap gap-1.5">{["week", "month", "quiet"].map((v) => pill("act", v))}</div>
          </G>
        </div>
        <div className="flex items-center justify-between gap-2 border-t border-line px-5 py-3">
          <button type="button" onClick={() => setD({ ...d, rel: [], how: [], pastco: "", skills: [], roles: [], modes: [], rmin: null, rmax: null, loc: "", trust: [], act: [] })} className={`${BTN} border-ink`}>
            Reset
          </button>
          <button
            type="button"
            data-show-results
            onClick={() => {
              router.push(href(query));
              onClose();
            }}
            className={`${BTN} border-ink bg-ink text-surface`}
          >
            {count === null ? "Show Results" : `Show ${count} ${count === 1 ? "Person" : "People"}`}
          </button>
        </div>
      </div>
    </div>
  );
}

function G({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="border-b border-line py-4">
      <h3 className="mb-2 text-[13.5px] font-bold">{n} · {title}</h3>
      {children}
    </section>
  );
}
