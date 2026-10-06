"use client";

import { Fragment, useState } from "react";
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
};
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
}: {
  roles: CatalogRole[];
  unassigned: CatalogSkill[];
  destinations: Dest[];
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [showHidden, setShowHidden] = useState(true);
  const [open, setOpen] = useState<Set<string>>(new Set());
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
  const toggle = (k: string) =>
    setOpen((s) => {
      const n = new Set(s);
      n.has(k) ? n.delete(k) : n.add(k);
      return n;
    });

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
            <span className="block truncate">{s.name}</span>
            {s.aliases && <span className="block truncate text-[11.5px] text-ink-2 no-underline">{s.aliases}</span>}
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

  const visible = (s: CatalogSkill, r: CatalogRole, d: CatalogDomain) =>
    (showHidden || !s.hidden) &&
    (!needle ||
      s.name.toLowerCase().includes(needle) ||
      d.name.toLowerCase().includes(needle) ||
      r.label.toLowerCase().includes(needle));

  const shownUnassigned = unassigned.filter(
    (s) => (showHidden || !s.hidden) && (!needle || s.name.toLowerCase().includes(needle))
  );

  return (
    <div className="font-sans text-ink">
      <div className="mb-2 mt-1 flex flex-wrap items-center gap-2.5">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Find a skill, domain or role…"
          className="h-10 min-w-[220px] flex-1 border-0 border-b border-line bg-transparent px-1 text-[14px] outline-none focus:border-b-2 focus:border-magenta"
        />
        <label className="flex items-center gap-1.5 text-[12px] text-ink-2">
          <input type="checkbox" checked={showHidden} onChange={(e) => setShowHidden(e.target.checked)} /> Show hidden
        </label>
        <button
          type="button"
          className={BTN}
          onClick={() =>
            setOpen(allOpen ? new Set() : new Set(roles.flatMap((r) => r.domains.map((d) => `${r.id}:${d.id}`))))
          }
        >
          {allOpen ? "Collapse All" : "Expand All"}
        </button>
      </div>

      {roles.map((r) => {
        const doms = r.domains
          .map((d) => ({ d, skills: d.skills.filter((s) => visible(s, r, d)) }))
          .filter((x) => !needle || x.skills.length > 0);
        if (needle && doms.length === 0) return null;
        return (
          <section key={r.id} data-testid="catalog-role" className="mt-[22px] border-b border-ink">
            <div className="flex items-center gap-2.5 py-2.5">
              <CatalogMark mark={r.mark} />
              <span className="text-[16px] font-bold">
                {r.label}
                {r.paren && <span className="text-[14px] font-medium text-ink-2"> ({r.paren})</span>}
              </span>
              <span className="text-[11px] tracking-[0.05em] text-ink-2/70">FIXED</span>
              <span className="ml-auto hidden text-[12px] text-ink-2/70 sm:inline">
                {r.domains.length} domains · domains fixed
              </span>
            </div>
            {doms.map(({ d, skills }) => {
              const key = `${r.id}:${d.id}`;
              const isOpen = !!needle || open.has(key) || adding === key;
              const warn = adding === key ? addWarning(r, d) : null;
              return (
                <div key={key} data-testid="catalog-domain" className="border-t border-line">
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
                      <span className="hidden text-[12px] text-ink-2/70 sm:inline">{d.skills.length} skills</span>
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
          </section>
        );
      })}

      {shownUnassigned.length > 0 && (
        <section data-testid="catalog-unassigned" className="mt-[30px] border-t border-ink">
          <div className="flex items-center gap-2.5 py-2.5">
            <span className="text-[16px] font-bold">Unassigned</span>
            <span className="ml-auto text-[12px] text-ink-2/70">
              {unassigned.length} skills with no domain · pick one for each
            </span>
          </div>
          {shownUnassigned.map((s) => (
            <Fragment key={s.id}>
              <div className="flex min-h-[42px] flex-wrap items-center gap-2.5 border-t border-line/60 text-[14px]">
                <span className="min-w-0 flex-1 truncate">{s.name}</span>
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

      {needle && roles.every((r) => r.domains.every((d) => !d.skills.some((s) => visible(s, r, d)))) && shownUnassigned.length === 0 && (
        <p className="mt-6 text-[14px] text-ink-2">Nothing matches &ldquo;{q.trim()}&rdquo;.</p>
      )}

      <p className="mt-[26px] text-[12px] leading-[1.8] text-ink-2">
        <b className="text-ink">+ Add skill</b> adds a skill to that domain. New skills start <b className="text-ink">Hidden</b>{" "}
        until you click Show. <b className="text-ink">Hide</b> takes a skill out of pickers and search; people who claimed it keep it.{" "}
        <b className="text-ink">Move</b> keeps every claim. There is no delete.
      </p>
    </div>
  );
}
