"use client";

import { Fragment, useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { CatalogMark } from "@/components/console/CatalogMark";
import type { Mark } from "@/lib/catalog-marks";

export type CatalogSkill = {
  id: string;
  name: string;
  hidden: boolean;
  retired: boolean;
  added: boolean;
  members: number;
  aliases?: string;
  aliasList?: string[];
};
export type CatalogFilters = { q?: string; role?: string; domain?: string; status?: string };
const STATUSES = [
  ["", "Any status"],
  ["shown", "Shown"],
  ["hidden", "Hidden"],
  ["new", "New (from members)"],
] as const;

/** Wraps every case-insensitive hit of `needle` in <mark>. */
function hl(text: string, needle: string): ReactNode {
  if (!needle) return text;
  const out: ReactNode[] = [];
  const low = text.toLowerCase();
  let i = 0;
  for (let j = low.indexOf(needle); j >= 0; j = low.indexOf(needle, i)) {
    if (j > i) out.push(text.slice(i, j));
    out.push(<mark key={j} className="bg-magenta/15 text-inherit">{text.slice(j, j + needle.length)}</mark>);
    i = j + needle.length;
  }
  out.push(text.slice(i));
  return out;
}

function csvCell(v: string | number) {
  const t = String(v);
  return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
}
export type CatalogDomain = { id: string; name: string; mark: Mark | null; skills: CatalogSkill[] };
export type CatalogRole = {
  id: string;
  label: string;
  paren?: string;
  mark: Mark | null;
  domains: CatalogDomain[];
};
type Dest = { roleTypeId: string; pillarId: string; label: string };

const BTN =
  "inline-flex h-9 shrink-0 items-center whitespace-nowrap border border-ink bg-surface px-3.5 text-[12px] font-semibold text-ink hover:bg-ink/5 disabled:opacity-40";
const BTN_K =
  "inline-flex h-9 shrink-0 items-center whitespace-nowrap border border-black bg-black px-3.5 text-[12px] font-semibold text-white disabled:opacity-40";
const ACT = "px-2 py-1.5 text-[12px] font-semibold text-ink-2 hover:text-magenta disabled:opacity-40";
const TAG = "shrink-0 border px-[5px] py-px text-[10px] font-bold tracking-[0.06em]";

async function post(body: unknown) {
  const res = await fetch("/api/admin/catalog", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; message?: string };
}

export function SkillCatalogTree({
  roles,
  unassigned,
  destinations,
  initial = {},
}: {
  roles: CatalogRole[];
  unassigned: CatalogSkill[];
  destinations: Dest[];
  initial?: CatalogFilters;
}) {
  const router = useRouter();
  const [q, setQ] = useState(initial.q ?? "");
  const [roleF, setRoleF] = useState(initial.role ?? "");
  const [domF, setDomF] = useState(initial.domain ?? "");
  const [statusF, setStatusF] = useState(STATUSES.some(([v]) => v === initial.status) ? initial.status! : "");
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [shut, setShut] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameTo, setRenameTo] = useState("");
  const [moving, setMoving] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ at: string; text: string } | null>(null);

  const needle = q.trim().toLowerCase();
  const closeAdd = (key: string) => {
    setAdding(null);
    setOpen((o) => new Set(o).add(key));
  };
  const allOpen = open.size > 0;
  const flip = (set: typeof setOpen, k: string) =>
    set((s) => {
      const n = new Set(s);
      n.has(k) ? n.delete(k) : n.add(k);
      return n;
    });
  const active = !!(needle || roleF || domF || statusF);
  const toggle = (k: string) => flip(active ? setShut : setOpen, k);

  // The URL holds the filters so a view can be bookmarked.
  useEffect(() => {
    const u = new URL(window.location.href);
    for (const [k, v] of [["q", q.trim()], ["role", roleF], ["domain", domF], ["status", statusF]] as const)
      if (v) u.searchParams.set(k, v);
      else u.searchParams.delete(k);
    if (u.href !== window.location.href) window.history.replaceState(window.history.state, "", u.href);
  }, [q, roleF, domF, statusF]);

  const run = async (at: string, body: unknown, done?: () => void) => {
    setBusy(true);
    setNote(null);
    const r = await post(body);
    setBusy(false);
    if (r.ok) {
      done?.();
      router.refresh();
    } else setNote({ at, text: r.error ?? "That didn't save." });
  };

  const addWarning = (role: CatalogRole, dom: CatalogDomain): { block: boolean; text: string } | null => {
    const v = newName.trim().toLowerCase();
    if (!v) return null;
    if (dom.skills.some((s) => s.name.toLowerCase() === v)) return { block: true, text: `Already in ${dom.name}.` };
    for (const r of roles)
      for (const d of r.domains)
        if (d.id !== dom.id || r.id !== role.id)
          if (d.skills.some((s) => s.name.toLowerCase() === v))
            return {
              block: false,
              text: `Note: "${newName.trim()}" also exists in ${r.label} › ${d.name}. Fine if it means the same thing there.`,
            };
    return null;
  };

  const skillRow = (s: CatalogSkill, inset: boolean) => (
    <Fragment key={s.id}>
      <div
        data-testid="catalog-skill"
        data-id={s.id}
        className={
          "group flex min-h-[42px] flex-wrap items-center gap-x-2.5 border-t border-line/60 text-[14px] " +
          (inset ? "pl-[30px] sm:pl-[52px]" : "")
        }
      >
        {renaming === s.id ? (
          <input
            autoFocus
            value={renameTo}
            disabled={busy}
            aria-label={`Rename ${s.name}`}
            onChange={(e) => setRenameTo(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") setRenaming(null);
              if (e.key === "Enter" && renameTo.trim() && renameTo.trim() !== s.name)
                void run(s.id, { action: "skill.rename", id: s.id, name: renameTo.trim() }, () => setRenaming(null));
            }}
            className="h-8 min-w-0 flex-1 border-0 border-b-2 border-magenta bg-transparent px-1 outline-none"
          />
        ) : (
          <span className={"min-w-[60%] flex-1 sm:min-w-0 " + (s.hidden || s.retired ? "text-ink-2/70 line-through" : "")}>
            <span className="block truncate">{hl(s.name, needle)}</span>
            {s.aliases && <span className="block truncate text-[11.5px] text-ink-2 no-underline">{hl(s.aliases, needle)}</span>}
          </span>
        )}
        {s.hidden && <span className={TAG + " border-line text-ink-2/70"}>HIDDEN</span>}
        {s.retired && <span className={TAG + " border-line text-ink-2/70"}>RETIRED</span>}
        {s.added && <span className={TAG + " border-magenta text-magenta"}>ADDED</span>}
        <span className="shrink-0 text-[11px] text-ink-2">
          {s.members} member{s.members === 1 ? "" : "s"}
        </span>
        <span className="flex shrink-0 gap-0.5 opacity-60 group-hover:opacity-100 focus-within:opacity-100">
          <button
            type="button"
            className={ACT}
            disabled={busy}
            onClick={() => {
              setRenaming(s.id);
              setRenameTo(s.name);
              setMoving(null);
            }}
          >
            Rename
          </button>
          <button
            type="button"
            className={ACT}
            disabled={busy}
            onClick={() => {
              setMoving(moving === s.id ? null : s.id);
              setRenaming(null);
            }}
          >
            Move
          </button>
          <button
            type="button"
            className={ACT}
            disabled={busy}
            onClick={() => void run(s.id, { action: "skill.visible", id: s.id, visible: s.hidden })}
          >
            {s.hidden ? "Show" : "Hide"}
          </button>
        </span>
      </div>
      {moving === s.id && (
        <div className={"pb-2.5 " + (inset ? "pl-[30px] sm:pl-[52px]" : "")}>
          <select
            autoFocus
            defaultValue=""
            disabled={busy}
            aria-label={`Move ${s.name} to`}
            className="h-[34px] min-w-[220px] max-w-full border-0 border-b border-line bg-transparent text-[13px]"
            onChange={(e) => {
              const d = destinations.find((x) => `${x.roleTypeId}|${x.pillarId}` === e.target.value);
              if (d)
                void run(s.id, { action: "skill.move", id: s.id, roleTypeId: d.roleTypeId, pillarId: d.pillarId }, () =>
                  setMoving(null)
                );
            }}
          >
            <option value="">Move to domain…</option>
            {destinations.map((d) => (
              <option key={`${d.roleTypeId}|${d.pillarId}`} value={`${d.roleTypeId}|${d.pillarId}`}>
                {d.label}
              </option>
            ))}
          </select>
        </div>
      )}
      {note?.at === s.id && (
        <p className={"pb-2 text-[12px] font-semibold text-magenta " + (inset ? "pl-[30px] sm:pl-[52px]" : "")}>
          {note.text}
        </p>
      )}
    </Fragment>
  );

  const textHit = (s: CatalogSkill) =>
    !needle || s.name.toLowerCase().includes(needle) || (s.aliasList ?? []).some((a) => a.toLowerCase().includes(needle));
  const statusHit = (s: CatalogSkill) =>
    !statusF || (statusF === "shown" ? !s.hidden && !s.retired : statusF === "hidden" ? s.hidden || s.retired : false);
  const hit = (s: CatalogSkill) => statusHit(s) && textHit(s);

  // Role → Domain → matching skills, pruned by every filter at once.
  const tree = useMemo(
    () =>
      roles.map((r) => {
        const inRole = !roleF || r.id === roleF;
        const doms = r.domains.map((d) => {
          const inScope = inRole && (!domF || d.id === domF);
          return { d, inScope, skills: inScope ? d.skills.filter(hit) : [] };
        });
        const total = r.domains.reduce((n, d) => n + d.skills.length, 0);
        return { r, doms, total, matches: doms.reduce((n, x) => n + x.skills.length, 0) };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [roles, roleF, domF, statusF, needle]
  );
  const newShown = unassigned.filter((s) => (!statusF || statusF === "new") && !roleF && !domF && textHit(s));
  const total = roles.reduce((n, r) => n + r.domains.reduce((m, d) => m + d.skills.length, 0), 0) + unassigned.length;
  const shownCount = tree.reduce((n, t) => n + t.matches, 0) + newShown.length;
  const missRoles = active ? tree.filter((t) => t.matches === 0) : [];

  const roleOpts = roles.map((r) => ({ id: r.id, label: r.label }));
  const domOpts = useMemo(() => {
    const m = new Map<string, string>();
    for (const r of roles) if (!roleF || r.id === roleF) for (const d of r.domains) m.set(d.id, d.name);
    return [...m].sort((a, b) => a[1].localeCompare(b[1]));
  }, [roles, roleF]);
  const roleLabel = roles.find((r) => r.id === roleF)?.label;
  const domLabel = domOpts.find(([id]) => id === domF)?.[1] ?? roles.flatMap((r) => r.domains).find((d) => d.id === domF)?.name;
  const clearAll = () => {
    setQ("");
    setRoleF("");
    setDomF("");
    setStatusF("");
  };

  const exportCsv = () => {
    const rows: (string | number)[][] = [["Role", "Domain", "Skill", "Aliases", "Status", "Members"]];
    const st = (s: CatalogSkill) => (s.retired ? "Retired" : s.hidden ? "Hidden" : "Shown");
    for (const t of tree) for (const x of t.doms) for (const s of x.skills) rows.push([t.r.label, x.d.name, s.name, s.aliases ?? "", st(s), s.members]);
    for (const s of newShown) rows.push(["", "", s.name, s.aliases ?? "", "New", s.members]);
    const blob = new Blob([rows.map((r) => r.map(csvCell).join(",")).join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `skill-catalog-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const LBL = "mb-1 block text-[11px] font-bold uppercase tracking-[0.08em] text-ink-2";
  const FIELD = "h-10 w-full border border-ink bg-surface px-3 text-[14px] text-ink outline-none focus:border-magenta";
  const CRUMB = "font-semibold text-ink underline underline-offset-2 hover:text-magenta";
  const GREY = "flex min-h-10 items-center border-t border-line pl-2 text-[12.5px] text-ink-2/70 sm:pl-[22px]";

  return (
    <div className="font-sans text-ink">
      <div data-finder-bar className="mt-1 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1fr]">
        <label className="block">
          <span className={LBL}>Search</span>
          <input
            type="search"
            data-finder-search
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Any part of a skill name or alias"
            className={FIELD}
          />
        </label>
        <label className="block">
          <span className={LBL}>Role</span>
          <select
            data-finder-role
            value={roleF}
            onChange={(e) => {
              setRoleF(e.target.value);
              if (e.target.value && domF && !roles.find((r) => r.id === e.target.value)?.domains.some((d) => d.id === domF)) setDomF("");
            }}
            className={FIELD}
          >
            <option value="">All roles</option>
            {roleOpts.map((r) => (
              <option key={r.id} value={r.id}>{r.label}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className={LBL}>Domain</span>
          <select data-finder-domain value={domF} onChange={(e) => setDomF(e.target.value)} className={FIELD}>
            <option value="">All domains</option>
            {domOpts.map(([id, name]) => (
              <option key={id} value={id}>{name}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className={LBL}>Status</span>
          <select data-finder-status value={statusF} onChange={(e) => setStatusF(e.target.value)} className={FIELD}>
            {STATUSES.map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-[13px]">
        {active && (
          <nav data-finder-crumbs aria-label="Filters" className="flex flex-wrap items-center gap-1.5 text-ink-2">
            <button type="button" className={CRUMB} onClick={clearAll}>All</button>
            {roleLabel && (
              <>
                <span>›</span>
                <button type="button" className={CRUMB} onClick={() => { setDomF(""); setQ(""); }}>{roleLabel}</button>
              </>
            )}
            {domLabel && (
              <>
                <span>›</span>
                <button type="button" className={CRUMB} onClick={() => setQ("")}>{domLabel}</button>
              </>
            )}
            {needle && (
              <>
                <span>›</span>
                <span className="font-semibold text-ink">&ldquo;{q.trim()}&rdquo;</span>
              </>
            )}
            <button type="button" data-finder-clear className="ml-1 text-[12.5px] font-bold text-ink underline underline-offset-2" onClick={clearAll}>
              Clear
            </button>
          </nav>
        )}
        <span className="ml-auto flex items-center gap-3 text-ink-2">
          <span data-finder-count>
            <b className="text-ink">{shownCount}</b> of {total} skills
          </span>
          <button type="button" data-finder-export className={BTN + " h-8 px-2.5"} onClick={exportCsv}>
            Export CSV
          </button>
          {!active && (
            <button
              type="button"
              className={BTN + " h-8 px-2.5"}
              onClick={() =>
                setOpen(allOpen ? new Set() : new Set(roles.flatMap((r) => r.domains.map((d) => `${r.id}:${d.id}`))))
              }
            >
              {allOpen ? "Collapse All" : "Expand All"}
            </button>
          )}
        </span>
      </div>

      {tree.map(({ r, doms, total: rTotal, matches }) => {
        if (active && matches === 0) return null;
        const shownDoms = active ? doms.filter((x) => x.skills.length > 0) : doms;
        const missDoms = active ? doms.length - shownDoms.length : 0;
        return (
          <section key={r.id} data-testid="catalog-role" data-role-id={r.id} className="mt-[22px] border-b border-ink">
            <div className="flex flex-wrap items-center gap-2.5 py-2.5">
              <CatalogMark mark={r.mark} />
              <span className="text-[16px] font-bold">
                {r.label}
                {r.paren && <span className="text-[14px] font-medium text-ink-2"> ({r.paren})</span>}
              </span>
              <span className="text-[11px] tracking-[0.05em] text-ink-2/70">FIXED</span>
              <span data-node-count className="ml-auto text-[12px] text-ink-2/70">
                {active ? `${rTotal} skills · ${matches} match` : `${r.domains.length} domains · ${rTotal} skills`}
              </span>
            </div>
            {shownDoms.map(({ d, skills }) => {
              const key = `${r.id}:${d.id}`;
              const isOpen = (active ? !shut.has(key) : open.has(key)) || adding === key;
              const warn = adding === key ? addWarning(r, d) : null;
              return (
                <div key={key} data-testid="catalog-domain" data-domain-id={d.id} className="border-t border-line">
                  <div className="flex min-h-12 items-center gap-2.5 pl-2 sm:pl-[22px]">
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      onClick={() => toggle(key)}
                      className="flex min-h-12 min-w-0 flex-1 items-center gap-2.5 text-left"
                    >
                      <span className="w-4 text-[12px] text-ink-2">{isOpen ? "▾" : "▸"}</span>
                      <CatalogMark mark={d.mark} />
                      <span className="min-w-0 flex-1 truncate text-[14px] font-semibold">{d.name}</span>
                      <span data-node-count className="text-[12px] text-ink-2/70">
                        {active ? `${d.skills.length} · ${skills.length} match` : `${d.skills.length} skills`}
                      </span>
                    </button>
                    <button
                      type="button"
                      className={BTN + " h-8 px-2.5"}
                      onClick={() => {
                        setAdding(key);
                        setNewName("");
                        setNote(null);
                      }}
                    >
                      + Add Skill
                    </button>
                  </div>
                  {isOpen && skills.map((s) => skillRow(s, true))}
                  {adding === key && (
                    <>
                      <div className="flex items-center gap-2 border-t border-line/60 pb-2.5 pl-[30px] pt-2 sm:pl-[52px]">
                        <input
                          autoFocus
                          value={newName}
                          disabled={busy}
                          aria-label={`New skill in ${d.name}`}
                          placeholder={`New skill in ${d.name}…`}
                          onChange={(e) => setNewName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Escape") setAdding(null);
                            if (e.key === "Enter" && newName.trim() && !warn?.block)
                              void run(key, { action: "skill.add", name: newName.trim(), roleTypeId: r.id, pillarId: d.id }, () =>
                                closeAdd(key)
                              );
                          }}
                          className="h-9 min-w-0 flex-1 border-0 border-b-2 border-magenta bg-transparent px-1 text-[14px] outline-none"
                        />
                        <button
                          type="button"
                          className={BTN_K + " h-8 px-2.5"}
                          disabled={busy || !newName.trim() || !!warn?.block}
                          onClick={() =>
                            void run(key, { action: "skill.add", name: newName.trim(), roleTypeId: r.id, pillarId: d.id }, () =>
                              closeAdd(key)
                            )
                          }
                        >
                          Add
                        </button>
                        <button type="button" className={BTN + " h-8 px-2.5"} onClick={() => setAdding(null)}>
                          Cancel
                        </button>
                      </div>
                      {(warn || note?.at === key) && (
                        <p className="pb-2 pl-[30px] text-[12px] text-[#a04a00] sm:pl-[52px]">
                          {note?.at === key ? note.text : warn?.text}
                        </p>
                      )}
                      <p className="pb-2.5 pl-[30px] text-[11px] text-ink-2/70 sm:pl-[52px]">
                        Starts hidden. Click Show when it&apos;s ready for members.
                      </p>
                    </>
                  )}
                </div>
              );
            })}
            {missDoms > 0 && (
              <div data-no-match className={GREY}>
                {missDoms} other domain{missDoms === 1 ? "" : "s"} — no match
              </div>
            )}
          </section>
        );
      })}

      {missRoles.length > 0 && missRoles.length < tree.length && (
        <div data-no-match className="mt-[22px] border-b border-line py-2.5 text-[12.5px] text-ink-2/70">
          {missRoles.map((t) => t.r.label).join(" · ")} — no match
        </div>
      )}

      {newShown.length > 0 && (
        <section data-testid="catalog-unassigned" className="mt-[30px] border-t border-ink">
          <div className="flex flex-wrap items-center gap-2.5 py-2.5">
            <span className="text-[16px] font-bold">New from Members</span>
            <span className="ml-auto text-[12px] text-ink-2/70">
              {unassigned.length} skills with no domain{active ? ` · ${newShown.length} match` : " · pick one for each"}
            </span>
          </div>
          {newShown.map((s) => (
            <Fragment key={s.id}>
              <div data-testid="catalog-new" className="flex min-h-[42px] flex-wrap items-center gap-2.5 border-t border-line/60 text-[14px]">
                <span className="min-w-0 flex-1 truncate">{hl(s.name, needle)}</span>
                <span className="text-[11px] text-ink-2">
                  {s.members} member{s.members === 1 ? "" : "s"}
                </span>
                <select
                  defaultValue=""
                  disabled={busy}
                  aria-label={`Assign ${s.name} to a domain`}
                  className="h-[34px] min-w-[220px] max-w-full border-0 border-b border-line bg-transparent text-[13px]"
                  onChange={(e) => {
                    const d = destinations.find((x) => `${x.roleTypeId}|${x.pillarId}` === e.target.value);
                    if (d) void run(s.id, { action: "skill.move", id: s.id, roleTypeId: d.roleTypeId, pillarId: d.pillarId });
                  }}
                >
                  <option value="">Assign to domain…</option>
                  {destinations.map((d) => (
                    <option key={`${d.roleTypeId}|${d.pillarId}`} value={`${d.roleTypeId}|${d.pillarId}`}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </div>
              {note?.at === s.id && <p className="pb-2 text-[12px] font-semibold text-magenta">{note.text}</p>}
            </Fragment>
          ))}
        </section>
      )}

      {active && shownCount === 0 && (
        <p data-finder-empty className="mt-6 text-[14px] text-ink-2">Nothing matches these filters.</p>
      )}

      <p className="mt-[26px] text-[12px] leading-[1.8] text-ink-2">
        <b className="text-ink">+ Add skill</b> adds a skill to that domain. New skills start <b className="text-ink">Hidden</b>{" "}
        until you click Show. <b className="text-ink">Hide</b> takes a skill out of pickers and search; people who claimed it keep it.{" "}
        <b className="text-ink">Move</b> keeps every claim. There is no delete.
      </p>
    </div>
  );
}
