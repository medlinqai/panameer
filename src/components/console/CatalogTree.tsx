"use client";

import { useState } from "react";

/**
 * The hierarchical catalog editor (WS6, ported from Medlinq's
 * /medlinq/services UX: catalog tiles + expandable groups with inline items).
 *
 * WHY A TREE AND NOT A TABLE. Roles > Domains > Skills and Learn's Path >
 * Course > Section > Lesson are the same SHAPE — a small set of parents each
 * owning a long tail of children — and a flat table of 522 lessons or 400
 * skills is unreadable. Medlinq solved this once; the structure ports directly
 * and only the palette changes.
 *
 * READ-ONLY FOR NOW, and deliberately so. Medlinq's version has inline editing
 * with Save/Discard on each group, but the write endpoints behind Panameer's
 * catalog don't exist yet — /admin/skill-catalog has been read-only "editing is
 * a later brief" since brief_M. Shipping Save buttons that cannot save would be
 * worse than shipping none, so the affordance says what it is waiting for.
 */

export type CatalogNode = {
  id: string;
  label: string;
  /** Right-aligned meta — a count, a status, a price. */
  meta?: string;
  children?: CatalogNode[];
};

export function CatalogTree({
  nodes,
  emptyLabel = "Nothing in this catalog yet.",
  toolbar = false,
}: {
  nodes: CatalogNode[];
  emptyLabel?: string;
  /** Medlinq's catalog-detail toolbar: Search + Expand All (2.5 slide 12). */
  toolbar?: boolean;
}) {
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [q, setQ] = useState("");

  /*
    SEARCH FILTERS, IT DOESN'T JUST HIGHLIGHT. A match at any depth keeps the
    whole branch above it — otherwise searching for a skill would return
    nothing, because the skill's name isn't on the Role that contains it.
    Matching branches auto-expand while a query is live; collapsing them again
    would hide the very rows the search found.
  */
  const needle = q.trim().toLowerCase();
  const filter = (n: CatalogNode): CatalogNode | null => {
    const hit = n.label.toLowerCase().includes(needle);
    const kids = (n.children ?? []).map(filter).filter(Boolean) as CatalogNode[];
    if (!hit && kids.length === 0) return null;
    return { ...n, children: hit && kids.length === 0 ? n.children : kids };
  };
  const shown = needle ? (nodes.map(filter).filter(Boolean) as CatalogNode[]) : nodes;

  const allIds = (ns: CatalogNode[]): string[] =>
    ns.flatMap((n) => [n.id, ...allIds(n.children ?? [])]);
  const expandedAll = open.size > 0;

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
            placeholder="Search the catalog"
            className="w-[260px] rounded-[8px] border border-line bg-white px-3 py-1.5 text-[13.5px] outline-none focus:border-magenta"
          />
          <button
            type="button"
            onClick={() => setOpen(expandedAll ? new Set() : new Set(allIds(nodes)))}
            className="rounded-[8px] border-[1.5px] border-line px-3 py-1.5 text-[13px] font-bold text-ink-2 transition-colors hover:border-magenta hover:text-magenta"
          >
            {expandedAll ? "Collapse All" : "Expand All"}
          </button>
          {needle && (
            <span className="text-[13px] text-ink-2">
              {shown.length} of {nodes.length} match
            </span>
          )}
        </div>
      )}

      <div className="space-y-2">
        {shown.map((n) => (
          <Group
            key={n.id}
            node={n}
            open={needle ? new Set(allIds(shown)) : open}
            toggle={toggle}
            depth={0}
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
}: {
  node: CatalogNode;
  open: Set<string>;
  toggle: (id: string) => void;
  depth: number;
}) {
  const kids = node.children ?? [];
  const isOpen = open.has(node.id);
  const isLeaf = kids.length === 0;

  if (isLeaf) {
    return (
      <div
        className="flex items-center gap-3 rounded-[10px] px-4 py-2 text-[14px]"
        style={{ paddingLeft: 16 + depth * 18 }}
      >
        <span className="min-w-0 flex-1 truncate">{node.label}</span>
        {node.meta && <span className="text-[12.5px] text-ink-2">{node.meta}</span>}
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
        <span
          className={
            "min-w-0 flex-1 truncate " +
            (depth === 0 ? "text-[15.5px] font-bold" : "text-[14.5px] font-semibold")
          }
        >
          {node.label}
        </span>
        <span className="shrink-0 text-[12.5px] text-ink-2">
          {node.meta ?? `${kids.length}`}
        </span>
      </button>

      {isOpen && (
        <div className={depth === 0 ? "border-t border-line pb-2" : ""}>
          {kids.map((k) => (
            <Group key={k.id} node={k} open={open} toggle={toggle} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * The Save/Discard bar Medlinq's editor carries, in its disabled state.
 *
 * Present because the pattern is what was asked for, disabled because the write
 * path isn't built — and it SAYS so, rather than looking broken.
 */
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
          className="cursor-not-allowed rounded-full border-[1.5px] border-line px-4 py-1.5 text-[13px] font-bold text-ink-2/50"
        >
          Discard
        </button>
        <button
          type="button"
          disabled
          className="cursor-not-allowed rounded-full bg-magenta/30 px-4 py-1.5 text-[13px] font-bold text-white"
        >
          Save
        </button>
      </span>
    </div>
  );
}
