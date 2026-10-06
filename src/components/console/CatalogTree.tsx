"use client";

import { useState } from "react";
import { CatalogMark } from "@/components/console/CatalogMark";
import type { Mark } from "@/lib/catalog-marks";
import { CatalogEditor, type EditTarget } from "@/components/console/CatalogEditor";

export type CatalogNode = {
  id: string;
  label: string;
  /** Right-aligned meta — a count, a status, a price. */
  meta?: string;
  custom?: boolean;
  children?: CatalogNode[];
  total?: number;
  mark?: Mark | null;
  sub?: string;
  action?: { label: string; kind: "skill.add"; roleTypeId?: string; pillarId?: string };
  retired?: boolean;
  /** Supplying this puts an Edit affordance on the row (admin surfaces only). */
  edit?: EditTarget;
  /** Destinations for a skill move, passed straight to the editor. */
  moveTo?: { roleTypeId: string; pillarId: string; label: string }[];
};

export function CatalogTree({
  nodes,
  emptyLabel = "Nothing in this catalog yet.",
  toolbar = false,
  searchPlaceholder = "Search the catalog",
  leafLabel = "items",
  groupLabel = "groups",
}: {
  nodes: CatalogNode[];
  emptyLabel?: string;
  /** Medlinq's catalog-detail toolbar: Search + Expand All (2.5 slide 12). */
  toolbar?: boolean;
  searchPlaceholder?: string;
  /** Nouns for the match summary: `47 skills in 12 domains match "pro"`. */
  leafLabel?: string;
  groupLabel?: string;
}) {
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [q, setQ] = useState("");

  const needle = q.trim().toLowerCase();
  const filter = (n: CatalogNode): CatalogNode | null => {
    const hit = n.label.toLowerCase().includes(needle);
    const kids = (n.children ?? []).map(filter).filter(Boolean) as CatalogNode[];
    if (!hit && kids.length === 0) return null;
    return {
      ...n,
      children: hit && kids.length === 0 ? n.children : kids,
      total: n.children?.length,
    };
  };
  const shown = needle ? (nodes.map(filter).filter(Boolean) as CatalogNode[]) : nodes;

  const allIds = (ns: CatalogNode[]): string[] =>
    ns.flatMap((n) => [n.id, ...allIds(n.children ?? [])]);
  const expandedAll = open.size > 0;

  const openNow = needle
    ? new Set([...shown.map((n) => n.id), ...open])
    : open;

  const countLeaves = (ns: CatalogNode[]): number =>
    ns.reduce(
      (n, x) => n + ((x.children?.length ?? 0) === 0 ? 1 : countLeaves(x.children!)),
      0
    );
  const countGroupsWithLeaves = (ns: CatalogNode[]): number =>
    ns.reduce((n, x) => {
      const kids = x.children ?? [];
      if (kids.length === 0) return n;
      const leafKids = kids.filter((k) => (k.children?.length ?? 0) === 0).length;
      return n + (leafKids > 0 ? 1 : 0) + countGroupsWithLeaves(kids);
    }, 0);

  if (nodes.length === 0) {
    return (
      <p className="rounded-brand border border-line bg-white p-6 text-[14.5px] text-ink-2">
        {emptyLabel}
      </p>
    );
  }

  const toggle = (id: string) =>
    setOpen((s) => {
      const next = new Set(s);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  return (
    <div>
      {toolbar && (
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-[320px] max-w-full rounded-[8px] border border-line bg-white px-3 py-1.5 text-[13.5px] outline-none focus:border-magenta"
          />
          <button
            type="button"
            onClick={() => setOpen(expandedAll ? new Set() : new Set(allIds(nodes)))}
            className="border-[1.5px] border-line px-3 py-1.5 text-[13px] font-bold text-ink-2 transition-colors hover:border-magenta hover:text-magenta"
          >
            {expandedAll ? "Collapse All" : "Expand All"}
          </button>
          {needle && (
            <span className="text-[13px] text-ink-2">
              {countLeaves(shown)} {leafLabel} in {countGroupsWithLeaves(shown)}{" "}
              {groupLabel} match &ldquo;{q.trim()}&rdquo;
            </span>
          )}
        </div>
      )}

      <div className="space-y-2">
        {shown.map((n) => (
          <Group
            key={n.id}
            node={n}
            open={openNow}
            toggle={toggle}
            depth={0}
            searching={!!needle}
          />
        ))}
        {shown.length === 0 && (
          <p className="rounded-brand border border-line bg-white p-6 text-[14.5px] text-ink-2">
            Nothing matches &ldquo;{q}&rdquo;.
          </p>
        )}
      </div>
    </div>
  );
}

function Group({
  node,
  open,
  toggle,
  depth,
  searching = false,
}: {
  node: CatalogNode;
  open: Set<string>;
  toggle: (id: string) => void;
  depth: number;
  searching?: boolean;
}) {
  const kids = node.children ?? [];
  const isOpen = open.has(node.id);
  const isLeaf = kids.length === 0;
  const [editing, setEditing] = useState<string | null>(null);

  if (isLeaf) {
    return (
      <div style={{ paddingLeft: 0 }}>
      <div
        className="flex items-center gap-3 rounded-[10px] px-4 py-2 text-[14px]"
        style={{ paddingLeft: 16 + depth * 18 }}
      >
        {node.mark !== undefined && <CatalogMark mark={node.mark} />}
        <span className="min-w-0 flex-1">
          <span className={"block truncate " + (node.retired ? "text-ink-2 line-through" : "")}>
            {node.label}
          </span>
          {node.sub && (
            <span className="block truncate text-[11.5px] text-ink-2">{node.sub}</span>
          )}
        </span>
        {node.retired && (
          <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10.5px] font-semibold text-amber-800">
            Retired
          </span>
        )}
        {node.custom && (
          <span className="shrink-0 rounded-full bg-ink/[0.06] px-2 py-0.5 text-[10.5px] font-semibold text-ink-2">
            Custom
          </span>
        )}
        {node.meta && <span className="shrink-0 text-[12.5px] text-ink-2">{node.meta}</span>}
        {node.action && <CatalogAddButton action={node.action} />}
        {node.edit && (
          <button
            type="button"
            onClick={() => setEditing(editing === node.id ? null : node.id)}
            className="shrink-0 border-[1.5px] border-line px-2.5 py-0.5 text-[11.5px] font-bold text-ink-2 transition-colors hover:border-magenta hover:text-magenta-ink"
          >
            {editing === node.id ? "Close" : "Edit"}
          </button>
        )}
      </div>
      {node.edit && editing === node.id && (
        <div style={{ paddingLeft: 16 + depth * 18 }} className="pr-4">
          <CatalogEditor
            target={node.edit}
            destinations={node.moveTo}
            onClose={() => setEditing(null)}
          />
        </div>
      )}
      </div>
    );
  }

  return (
    <div className={depth === 0 ? "rounded-brand border border-line bg-white" : ""}>
      <button
        type="button"
        onClick={() => toggle(node.id)}
        aria-expanded={isOpen}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-black/[0.02]"
        style={{ paddingLeft: 16 + depth * 18 }}
      >
        <span className="w-4 shrink-0 text-ink-2">{isOpen ? "▾" : "▸"}</span>
        {node.mark !== undefined && <CatalogMark mark={node.mark} />}
        <span
          className={
            "min-w-0 flex-1 truncate " +
            (depth === 0 ? "text-[15.5px] font-bold" : "text-[14.5px] font-semibold")
          }
        >
          {node.label}
        </span>
        {node.custom && (
          <span className="shrink-0 rounded-full bg-ink/[0.06] px-2 py-0.5 text-[10.5px] font-semibold text-ink-2">
            Custom
          </span>
        )}
        <span className="shrink-0 text-[12.5px] text-ink-2">
          {}
          {searching && node.total !== undefined
            ? `${kids.length} of ${node.total} match`
            : (node.meta ?? `${kids.length}`)}
        </span>
      </button>

      {isOpen && (
        <div className={depth === 0 ? "border-t border-line pb-2" : ""}>
          {kids.map((k) => (
            <Group
              key={k.id}
              node={k}
              open={open}
              toggle={toggle}
              depth={depth + 1}
              searching={searching}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/** The Save/Discard bar Medlinq's editor carries, in its disabled state. */
export function CatalogEditBar({ sticky = false }: { sticky?: boolean }) {
  return (
    <div className={(sticky ? "sticky bottom-3 z-10 bg-bg-soft/95 backdrop-blur " : "") + "mt-4 flex flex-wrap items-center gap-3 rounded-[12px] border border-dashed border-line px-4 py-3"}>
      <span className="text-[13px] text-ink-2">
        Editing this catalog needs write endpoints that aren&apos;t built yet —
        it&apos;s read-only for now.
      </span>
      <span className="ml-auto flex gap-2">
        <button
          type="button"
          disabled
          className="cursor-not-allowed border-[1.5px] border-line px-4 py-1.5 text-[13px] font-bold text-ink-2/50"
        >
          Discard
        </button>
        <button
          type="button"
          disabled
          className="cursor-not-allowed bg-magenta/30 px-4 py-1.5 text-[13px] font-bold text-white"
        >
          Save
        </button>
      </span>
    </div>
  );
}

/** + ADD DOMAIN / + ADD SKILL, on the header row . */
function CatalogAddButton({
  action,
}: {
  action: NonNullable<CatalogNode["action"]>;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const save = async () => {
    const clean = name.trim();
    if (!clean) return;
    setBusy(true);
    setNote(null);
    const res = await fetch("/api/admin/catalog", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      /* Skills only (`E820`): roles and domains are locked. */
      body: JSON.stringify({
        action: "skill.add",
        name: clean,
        roleTypeId: action.roleTypeId,
        pillarId: action.pillarId,
      }),
    });
    const json = (await res.json().catch(() => ({}))) as { ok?: boolean; message?: string; error?: string };
    setBusy(false);
    if (json.ok) {
      setName("");
      setOpen(false);
      setNote(null);
      /* A full reload rather than a refetch: the tree is built on the server
         and the new row has to arrive with its counts already right. */
      window.location.reload();
    } else {
      setNote(json.error ?? "That didn't save.");
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        /* ≥44px, square, ink-bordered — the brand button, and the size the
           header row needs to stay tappable. */
        className="ml-2 inline-flex min-h-11 shrink-0 items-center border border-ink bg-surface px-2.5 text-[12px] font-bold text-ink transition-colors hover:bg-ink/5"
        onClick={(e) => {
          /* The header row is a toggle; adding must not also collapse it. */
          e.stopPropagation();
          e.preventDefault();
          setOpen(true);
        }}
      >
        {action.label}
      </button>
    );
  }

  return (
    <span
      className="ml-2 inline-flex shrink-0 items-center gap-1.5"
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
      }}
    >
      <input
        autoFocus
        value={name}
        disabled={busy}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") void save();
          if (e.key === "Escape") {
            setOpen(false);
            setName("");
            setNote(null);
          }
        }}
        placeholder="New skill"
        aria-label={action.label}
        className="min-h-11 w-44 border border-line bg-surface px-2 text-[13px]"
      />
      <button
        type="button"
        disabled={busy || !name.trim()}
        onClick={() => void save()}
        className="inline-flex min-h-11 items-center bg-ink px-2.5 text-[12px] font-bold text-surface disabled:opacity-40"
      >
        Save
      </button>
      {note && <span className="text-[12px] font-semibold text-magenta">{note}</span>}
    </span>
  );
}
