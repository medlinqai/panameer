"use client";

import { useCallback, useEffect, useState } from "react";
import { CapabilitiesEditor } from "@/components/profile/CapabilitiesEditor";

// CG-E005: "How do you work with what you know?" — one row per capability the résumé made; I implement it · I support it · I do the work.
type Mode = "IMPLEMENT" | "SUPPORT" | "OPERATE";
type Cap = { id: string; line: string; mode: Mode; confirmed: boolean; domainId: string | null; systemItemId: string | null };
const MODES: { mode: Mode; label: string; verb: string }[] = [
  { mode: "IMPLEMENT", label: "I implement it", verb: "Implements " },
  { mode: "SUPPORT", label: "I support it", verb: "Supports " },
  { mode: "OPERATE", label: "I do the work", verb: "Does the work in " },
];
const strip = (line: string) => MODES.reduce((l, m) => (l.startsWith(m.verb) ? l.slice(m.verb.length) : l), line);
const ON = "border-2 border-ink bg-ink px-3 py-1.5 text-[13px] font-bold text-surface";
const OFF = "border-2 border-line px-3 py-1.5 text-[13px] font-semibold hover:border-ink disabled:opacity-40 disabled:hover:border-line";

export function WhatYouDoModes({ skills, isAdmin, onSkip }: { skills: { id: string; name: string }[]; isAdmin: boolean; onSkip: () => void }) {
  const [caps, setCaps] = useState<Cap[] | null>(null);
  const [enabled, setEnabled] = useState(true);
  const [adding, setAdding] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const read = useCallback(() => fetch("/api/provider/capabilities").then((r) => (r.ok ? r.json() : null)).catch(() => null), []);
  useEffect(() => {
    read().then((b) => {
      if (!b?.enabled) { setEnabled(false); if (!isAdmin) onSkip(); return; }
      setCaps(b.capabilities ?? []);
    });
  }, [read, isAdmin, onSkip]);

  const post = async (body: object) => {
    setMsg(null);
    const r = await fetch("/api/provider/capabilities", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
    const j = await r?.json().catch(() => ({}));
    if (!r?.ok) return setMsg(j?.error ?? "That didn't save.");
    if (j.capabilities) setCaps(j.capabilities);
  };

  if (!enabled) {
    return (
      <div className="mt-3 space-y-2" data-modes-off>
        {isAdmin && <p className="border-l-2 border-magenta py-1 pl-3 text-[14px]">Turn on Global Taxonomy in Admin › Settings.</p>}
        {skills.map((s) => (
          <div key={s.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-line py-2">
            <span className="text-[15px] font-semibold">{s.name}</span>
            <span className="flex flex-wrap gap-1.5">{MODES.map((m) => <button key={m.mode} type="button" disabled className={OFF}>{m.label}</button>)}</span>
          </div>
        ))}
      </div>
    );
  }
  if (!caps) return <p className="mt-3 text-[14px] text-ink-2">Loading…</p>;

  // One row per thing you know (domain + system); its modes are the capabilities on it.
  const groups = new Map<string, Cap[]>();
  for (const c of caps) {
    const k = `${c.domainId ?? ""}|${c.systemItemId ?? ""}|${strip(c.line)}`;
    groups.set(k, [...(groups.get(k) ?? []), c]);
  }
  const toggle = async (g: Cap[], mode: Mode) => {
    const hit = g.find((c) => c.mode === mode);
    if (hit) {
      if (g.length > 1) await post({ action: "remove", id: hit.id });
      return;
    }
    // A single unconfirmed guess switches mode; otherwise this is a second way of working on the same thing.
    if (g.length === 1 && !g[0].confirmed) return post({ action: "confirm", id: g[0].id, mode });
    if (!g[0].domainId) return setMsg("This one can only have one way of working.");
    await post({ action: "addMany", mode, domainIds: [g[0].domainId], systemItemIds: g[0].systemItemId ? [g[0].systemItemId] : [] });
  };

  return (
    <div className="mt-3" data-modes>
      {groups.size === 0 && <p className="text-[14px] text-ink-2">Nothing on your profile yet — add what you know below.</p>}
      {[...groups.entries()].map(([k, g]) => (
        <div key={k} data-capability-row className="flex flex-wrap items-center justify-between gap-2 border-b border-line py-2.5">
          <span className="min-w-0 text-[15px] font-semibold">{strip(g[0].line)}</span>
          <span className="flex flex-wrap gap-1.5" role="group" aria-label={`How you work with ${strip(g[0].line)}`}>
            {MODES.map((m) => {
              const on = g.some((c) => c.mode === m.mode);
              return <button key={m.mode} type="button" aria-pressed={on} onClick={() => void toggle(g, m.mode)} className={on ? ON : OFF}>{m.label}</button>;
            })}
          </span>
        </div>
      ))}
      {msg && <p role="alert" className="mt-2 text-[13px] font-semibold text-magenta-dark">{msg}</p>}
      <button type="button" onClick={async () => { if (adding) setCaps((await read())?.capabilities ?? caps); setAdding((v) => !v); }} className="mt-3 text-[14px] font-semibold text-magenta-dark underline underline-offset-4" data-add-capability>
        {adding ? "Done adding" : "+ Add something you know"}
      </button>
      {adding && <div className="mt-3 border border-line p-4"><CapabilitiesEditor /></div>}
    </div>
  );
}
