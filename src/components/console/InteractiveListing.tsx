"use client";

import { useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import {
  CARD,
  CARD_HEADER,
  CARD_TITLE,
  ROW,
  TABLE,
  TD,
  TD_EMPTY,
  TH,
  TH_BUTTON,
  THEAD,
} from "@/components/console/listing-shared";

export type RowMeta = {
  /** Everything this row should be findable by, pre-flattened and lower-cased. */
  text: string;
  /** One sortable value per column. `null` sorts last in both directions. */
  sort: (string | number | null)[];
};

type SortState = { col: number; dir: "asc" | "desc" } | null;

const storageListeners = new Set<() => void>();

function subscribeToStorage(onChange: () => void): () => void {
  storageListeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    storageListeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

function readStoredSize(key: string): number | null {
  try {
    const raw = window.localStorage.getItem(key);
    const n = raw ? Number(raw) : NaN;
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

export function InteractiveListing({
  title,
  columns,
  rows,
  rowMeta,
  empty,
  action,
  searchPlaceholder,
  sortable = true,
  pageSize = 25,
  pageSizeOptions,
  pageSizeKey,
}: {
  title: string;
  columns: string[];
  rows: ReactNode[][];
  rowMeta: RowMeta[];
  empty: ReactNode;
  action?: ReactNode;
  searchPlaceholder?: string;
  sortable?: boolean;
  pageSize?: number;
  pageSizeOptions?: number[];
  /** Where the viewer's choice is remembered. Omit and nothing is stored. */
  pageSizeKey?: string;
}) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortState>(null);
  const [page, setPage] = useState(0);

  const stored = useSyncExternalStore(
    subscribeToStorage,
    () => (pageSizeKey ? readStoredSize(pageSizeKey) : null),
    () => null
  );
  const size =
    stored !== null && pageSizeOptions?.includes(stored) ? stored : pageSize;

  const chooseSize = (n: number) => {
    setPage(0);
    if (!pageSizeKey) return;
    try {
      window.localStorage.setItem(pageSizeKey, String(n));
    } catch {
    }
    for (const l of storageListeners) l();
  };

  /* Index the rows with their meta so filtering and sorting move them together. */
  const indexed = useMemo(
    () => rows.map((cells, i) => ({ cells, meta: rowMeta[i] ?? { text: "", sort: [] } })),
    [rows, rowMeta]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return indexed;
    return indexed.filter((r) => r.meta.text.includes(q));
  }, [indexed, query]);

  const sorted = useMemo(() => {
    if (!sort) return filtered;
    const { col, dir } = sort;
    const sign = dir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const av = a.meta.sort[col] ?? null;
      const bv = b.meta.sort[col] ?? null;
      if (av === null && bv === null) return 0;
      if (av === null) return 1;
      if (bv === null) return -1;
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * sign;
      return String(av).localeCompare(String(bv), undefined, { sensitivity: "base" }) * sign;
    });
  }, [filtered, sort]);

  const total = sorted.length;
  const pages = Math.max(1, Math.ceil(total / size));
  const current = Math.min(page, pages - 1);
  const from = total === 0 ? 0 : current * size + 1;
  const to = Math.min(total, (current + 1) * size);
  const visible = sorted.slice(current * size, (current + 1) * size);

  const toggle = (col: number) => {
    setPage(0);
    setSort((s) =>
      s && s.col === col ? { col, dir: s.dir === "asc" ? "desc" : "asc" } : { col, dir: "asc" }
    );
  };

  return (
    <section className={CARD}>
      <header className={CARD_HEADER}>
        <h2 className={CARD_TITLE}>{title}</h2>
        <span className="ml-auto flex items-center gap-3">
          {searchPlaceholder && (
            <span className="relative">
              <svg
                aria-hidden
                viewBox="0 0 24 24"
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-2/60"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
              <input
                type="search"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(0);
                }}
                placeholder={searchPlaceholder}
                aria-label={searchPlaceholder}
                className="w-[268px] rounded-full border border-line py-1.5 pl-9 pr-3 text-[13.5px] text-ink placeholder:text-ink-2/60 outline-none transition-colors focus:border-magenta"
              />
            </span>
          )}
          {action}
        </span>
      </header>

      <div className="overflow-x-auto">
        <table className={TABLE}>
          <thead className={THEAD}>
            <tr>
              {columns.map((c, i) => {
                const active = sort?.col === i;
                return (
                  <th key={c} className={TH} aria-sort={active ? (sort!.dir === "asc" ? "ascending" : "descending") : "none"}>
                    {sortable ? (
                      <button type="button" onClick={() => toggle(i)} className={TH_BUTTON}>
                        {c}
                        {}
                        <span aria-hidden className={active ? "text-ink" : "text-ink-2/30"}>
                          {active ? (sort!.dir === "asc" ? "▲" : "▼") : "▾"}
                        </span>
                      </button>
                    ) : (
                      c
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {visible.length > 0 ? (
              visible.map((r, i) => (
                <tr key={i} className={ROW}>
                  {r.cells.map((cell, j) => (
                    <td key={j} className={TD}>
                      {cell}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className={TD_EMPTY}>
                  {}
                  {query.trim() ? (
                    <span className="text-[14px] text-ink-2">
                      Nothing matches “{query.trim()}”.
                    </span>
                  ) : (
                    empty
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {}
      <div className="flex flex-wrap items-center gap-3 border-t border-line px-6 py-3 text-[12.5px] text-ink-2">
        <span>
          {total === 0 ? "No rows" : <>Showing <b className="text-ink">{from}–{to}</b> of <b className="text-ink">{total}</b></>}
          {query.trim() && total !== rows.length && <> (filtered from {rows.length})</>}
        </span>
        {}
        {pageSizeOptions?.length ? (
          <span className="flex items-center gap-1.5">
            <span className="text-ink-2">Rows</span>
            {pageSizeOptions.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => chooseSize(n)}
                aria-pressed={size === n}
                aria-label={`Show ${n} rows per page`}
                className={
                  "border px-2.5 py-1 font-semibold transition-colors " +
                  (size === n
                    ? "border-magenta bg-magenta text-white"
                    : "border-line text-ink-2 hover:border-magenta hover:text-magenta focus-visible:border-magenta")
                }
              >
                {n}
              </button>
            ))}
          </span>
        ) : null}

        <span className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPage(Math.max(0, current - 1))}
            disabled={current === 0}
            className="border border-line px-3 py-1 font-semibold transition-colors hover:border-magenta disabled:opacity-40 disabled:hover:border-line"
          >
            Previous
          </button>
          <span>
            Page {current + 1} of {pages}
          </span>
          <button
            type="button"
            onClick={() => setPage(Math.min(pages - 1, current + 1))}
            disabled={current >= pages - 1}
            className="border border-line px-3 py-1 font-semibold transition-colors hover:border-magenta disabled:opacity-40 disabled:hover:border-line"
          >
            Next
          </button>
        </span>
      </div>
    </section>
  );
}
