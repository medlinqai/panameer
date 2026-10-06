"use client";

import { useMemo, useState } from "react";

// Role → Domain → Skill tree with partial search that prunes and auto-expands (the catalog finder's shape).
export type PickerTree = { id: string; label: string; domains: { id: string; name: string; skills: { id: string; name: string }[] }[] }[];

export function SkillTreePicker({ tree, selected, onChange }: { tree: PickerTree; selected: string[]; onChange: (ids: string[]) => void }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<Set<string>>(new Set());
  const needle = q.trim().toLowerCase();
  const pruned = useMemo(
    () =>
      tree
        .map((r) => ({ ...r, domains: r.domains.map((d) => ({ ...d, skills: needle ? d.skills.filter((s) => s.name.toLowerCase().includes(needle)) : d.skills })).filter((d) => !needle || d.skills.length) }))
        .filter((r) => !needle || r.domains.length),
    [tree, needle]
  );
  const toggle = (k: string) => setOpen((s) => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n; });
  const pick = (id: string) => onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  const mark = (name: string) => {
    if (!needle) return name;
    const i = name.toLowerCase().indexOf(needle);
    return i < 0 ? name : (<>{name.slice(0, i)}<mark className="bg-magenta/15 text-inherit">{name.slice(i, i + needle.length)}</mark>{name.slice(i + needle.length)}</>);
  };
  return (
    <div data-skill-tree-picker>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search skills… (e.g. procure)" aria-label="Search skills" className="h-10 w-full border border-line bg-surface px-3 text-[14px] focus:border-ink focus:outline-none" />
      <div className="mt-2 max-h-[300px] overflow-y-auto border border-line/60">
        {pruned.map((r) => {
          const rk = `r:${r.id}`;
          const rOpen = !!needle || open.has(rk);
          return (
            <div key={r.id}>
              <button type="button" onClick={() => toggle(rk)} aria-expanded={rOpen} className="flex w-full items-center gap-2 px-2 py-1.5 text-left text-[13px] font-bold">
                <span className="w-3 text-ink-2">{rOpen ? "▾" : "▸"}</span>{r.label}
              </button>
              {rOpen && r.domains.map((d) => {
                const dk = `d:${r.id}:${d.id}`;
                const dOpen = !!needle || open.has(dk);
                return (
                  <div key={dk} className="pl-4">
                    <button type="button" onClick={() => toggle(dk)} aria-expanded={dOpen} className="flex w-full items-center gap-2 px-2 py-1 text-left text-[13px] font-semibold">
                      <span className="w-3 text-ink-2">{dOpen ? "▾" : "▸"}</span>{d.name}
                      <span className="ml-auto text-[11px] font-normal text-ink-3">{d.skills.length}</span>
                    </button>
                    {dOpen && (
                      <div className="pb-1 pl-7">
                        {d.skills.map((s) => (
                          <label key={s.id} className="flex cursor-pointer items-center gap-2 py-0.5 text-[13px]">
                            <input type="checkbox" checked={selected.includes(s.id)} onChange={() => pick(s.id)} data-skill={s.id} />
                            <span>{mark(s.name)}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
        {pruned.length === 0 && <p className="p-2 text-[13px] text-ink-2">No skill matches &ldquo;{q}&rdquo;.</p>}
      </div>
    </div>
  );
}
