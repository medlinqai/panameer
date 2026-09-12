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

/**
 * THE INTERACTIVE LISTING — search, sort, pagination (`P1-A1.5-E430` WS-2).
 *
 * ── ⚠⚠ WHAT WAS ACTUALLY BROKEN ─────────────────────────────────────────────
 *
 * Nothing. `ConsolePage.tsx` contained zero `onChange`, zero `useState` and
 * zero `useMemo`; the search input had no handler at all and its comment said
 * why — *"Every deck slide draws a Search box."* **SCOTT, 2026-09-12:** *"this
 * page is required to manage the users being added."* He had 93 accounts, could
 * see 50 of them (`page.tsx` sliced at 50, no pager, no total), could not
 * search, could not sort, and opened Resend to find which test ids were free.
 *
 * ── ⚠ WHY THIS IS A SEPARATE COMPONENT (WS-0, Scott chose option (c)) ───────
 *
 * `Listing` is rendered by THIRTEEN admin pages — four directly and nine
 * through `SpecPage`/`StubConsolePage`. Twelve of them are stubs with no rows to
 * search. So `Listing` stays a server component and hands off to this one ONLY
 * when it is given interactive props; the other twelve pages render exactly the
 * markup they rendered before, still on the server.
 * ⚠ THE LOOK IS SHARED ON PURPOSE — both renderers import the same class
 * strings from `listing-shared.ts`, so WS-5's header and row treatment reaches
 * every console page while the BEHAVIOUR stays opt-in.
 *
 * ── ⚠⚠ WHY `rowMeta` EXISTS, AND WHY IT IS NOT OPTIONAL HERE ────────────────
 *
 * `rows` are `ReactNode[][]` — avatars, links, pills. A ReactNode cannot be
 * compared or searched: `String(<Link/>)` is "[object Object]". So the caller
 * passes a parallel `rowMeta`, one entry per row: `text` for the search and
 * `sort` for the comparator. ⚠ IT IS THE CALLER'S JOB because only the caller
 * still has the underlying data — deriving it here would mean re-rendering React
 * elements to strings and guessing at their meaning.
 */
export type RowMeta = {
  /** Everything this row should be findable by, pre-flattened and lower-cased. */
  text: string;
  /** One sortable value per column. `null` sorts last in both directions. */
  sort: (string | number | null)[];
};

type SortState = { col: number; dir: "asc" | "desc" } | null;

/*
  ── THE PAGE-SIZE STORE (`P1-A1.5-E458`) ────────────────────────────────────

  A module-level subscriber set plus the `storage` event, which is the minimum a
  `useSyncExternalStore` needs. ⚠ EVERY ACCESS IS WRAPPED: a private window,
  cleared site data or a blocked store must fall back to the default rather than
  throw inside a render.
*/
const storageListeners = new Set<() => void>();

function subscribeToStorage(onChange: () => void): () => void {
  storageListeners.add(onChange);
  /* ⚠ OTHER TABS ONLY — the writing tab notifies `storageListeners` itself. */
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
  /** ⚠ The placeholder NAMES WHAT IS SEARCHED (WS-4b). */
  searchPlaceholder?: string;
  sortable?: boolean;
  pageSize?: number;
  /**
   * ── ⚠ THE PICKER IS OPT-IN (`P1-A1.5-E458`) ────────────────────────────────
   *
   * Supplying the options is what renders the control; a listing that passes
   * none keeps its fixed `pageSize` and shows nothing. ⚠ THE PRECEDENT IS
   * `TileRow`'s `icon` in Part A — `Listing` is shared by thirteen pages and
   * eleven of them pass no rows at all, so a control they cannot use should not
   * appear on them.
   */
  pageSizeOptions?: number[];
  /** Where the viewer's choice is remembered. Omit and nothing is stored. */
  pageSizeKey?: string;
}) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortState>(null);
  const [page, setPage] = useState(0);

  /*
    ── ⚠⚠ THE PAGE SIZE, REMEMBERED PER VIEWER (`P1-A1.5-E458`) ───────────────

    **SCOTT:** *"looks like we need to take the display rows down to 7 with the
    option to change how many return (to show the footer is there)."*

    ⚠ THE DEFAULT COMES FROM THE SERVER AND THE STORED CHOICE ARRIVES AFTER
    MOUNT, deliberately. Reading `localStorage` in the initial state would make
    the client's first render disagree with the server's HTML — a hydration
    mismatch — so the stored size is applied in an effect instead. The cost is
    one re-render for somebody who has chosen a non-default; the alternative is
    a React error.
    ⚠ BOTH THE READ AND THE WRITE ARE WRAPPED. A private window, cleared site
    data or a blocked store must not break the grid — it falls back to the
    server's default and simply forgets the preference.
    ⚠ PER VIEWER, NOT SHARED. This is a convenience on one person's machine; it
    is not state anybody else can see, which is exactly why `localStorage` is
    enough and a column on `Person` would be wrong.
  */
  /*
    ⚠⚠ `useSyncExternalStore`, NOT `useState` + `useEffect`. The first version of
    this read `localStorage` in an effect and called `setSize`, which is a
    CASCADING RENDER and `react-hooks/set-state-in-effect` says so — it was a NEW
    lint error and the rule on this repo is 0 new.

    ⚠ THIS IS THE RIGHT HOOK FOR THE JOB, not a workaround: `localStorage` IS an
    external store, and this hook exists to read one without a hydration
    mismatch. The SERVER snapshot is `null`, so the server renders the default
    page size; the CLIENT snapshot is the stored value, applied on hydration.
    ⚠ `AppHeader` ALREADY USES THIS HOOK for the same class of problem.
    ⚠ THE STORE IS THE SOURCE OF TRUTH — there is no local copy of the size to
    drift from what is written, which is what made the effect version awkward.
  */
  const stored = useSyncExternalStore(
    subscribeToStorage,
    () => (pageSizeKey ? readStoredSize(pageSizeKey) : null),
    /* ⚠ SERVER SNAPSHOT — the default, so SSR and the first client paint agree. */
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
      /* ⚠ SILENT ON PURPOSE — a blocked store is not an error the admin can act
         on, and the grid must keep working with the default. */
    }
    /* ⚠ `localStorage` FIRES NO EVENT IN THE TAB THAT WROTE IT, so subscribers
       are told directly; the `storage` event only covers OTHER tabs. */
    for (const l of storageListeners) l();
  };

  /* Index the rows with their meta so filtering and sorting move them together. */
  const indexed = useMemo(
    () => rows.map((cells, i) => ({ cells, meta: rowMeta[i] ?? { text: "", sort: [] } })),
    [rows, rowMeta]
  );

  /*
    ⚠ LIVE, PARTIAL, CASE-INSENSITIVE — Scott's reference: *"in medlinq, i can
    type and it will amend the grid section with the values equal to what i am
    typing."* Substring, not prefix, and not a word boundary: he searches for
    fragments of test email ids.
  */
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return indexed;
    return indexed.filter((r) => r.meta.text.includes(q));
  }, [indexed, query]);

  /*
    ⚠ NULLS LAST IN BOTH DIRECTIONS. A column of dates where half the rows have
    never logged in should not bury the real values under a block of dashes when
    you sort descending — "—" is the absence of a value, not the smallest one.
    ⚠ NUMBERS COMPARE AS NUMBERS; everything else compares with `localeCompare`,
    so "Ananya" sorts next to "ananya" rather than after "Zoe".
  */
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
  /* ⚠ CLAMPED, NOT TRUSTED: filtering can strand the viewer past the last page. */
  const current = Math.min(page, pages - 1);
  const from = total === 0 ? 0 : current * size + 1;
  const to = Math.min(total, (current + 1) * size);
  const visible = sorted.slice(current * size, (current + 1) * size);

  const toggle = (col: number) => {
    setPage(0);
    setSort((s) =>
      /* asc → desc → asc. Scott: *"asc/desc"*. */
      s && s.col === col ? { col, dir: s.dir === "asc" ? "desc" : "asc" } : { col, dir: "asc" }
    );
  };

  return (
    <section className={CARD}>
      <header className={CARD_HEADER}>
        <h2 className={CARD_TITLE}>{title}</h2>
        <span className="ml-auto flex items-center gap-3">
          {searchPlaceholder && (
            /*
              ── ⚠ THE SEARCH BOX, MATCHED TO MEDLINQ (WS-4b) ─────────────────

              **SCOTT:** *"the icon/text in the search is different. please match
              to medlinq."* Medlinq's carries an in-field magnifier on the left
              and a placeholder naming what is searched. Panameer's was a bare
              bordered box with the placeholder "Search" and no icon.

              ⚠ AND IT IS NEVER DISABLED NOW. The old box disabled itself when
              there were no rows, reasoning that *"a live box over no rows
              invites a query that cannot be answered."* That was written for a
              DECORATIVE box; once the search works, a disabled control on an
              empty grid is just a dead control. It stays live and returns
              nothing, which is an answer.
            */
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
                        {/* ⚠ THE DIRECTION IS VISIBLE, and the inactive arrow is
                            held at low opacity rather than hidden, so the column
                            still reads as sortable before it is clicked. */}
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
                  {/* ⚠ A SEARCH THAT MATCHES NOTHING IS NOT AN EMPTY TABLE. The
                      page's own empty state says "nobody has signed up yet",
                      which would be a lie mid-query. */}
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

      {/*
        ── ⚠⚠ THE PAGER — NO RECORD MAY BE UNREACHABLE (WS-2) ─────────────────

        The board sliced at 50 with no pager and no total, which is why Scott
        *"could not see half of them"*. The count is always shown, even on one
        page, because the total is the thing he was missing.
      */}
      <div className="flex flex-wrap items-center gap-3 border-t border-line px-6 py-3 text-[12.5px] text-ink-2">
        <span>
          {total === 0 ? "No rows" : <>Showing <b className="text-ink">{from}–{to}</b> of <b className="text-ink">{total}</b></>}
          {query.trim() && total !== rows.length && <> (filtered from {rows.length})</>}
        </span>
        {/*
          ── ⚠ THE PAGE-SIZE PICKER (`P1-A1.5-E458`) ──────────────────────────

          ⚠⚠ MAGENTA IS CORRECT HERE, and it is the opposite of the tile counts.
          `E433` reserves magenta for INTERACTIVE things; this is something you
          click, where a count is not. The selected value is filled magenta; the
          rest hover into it.
          ⚠ IT IS A ROW OF BUTTONS, NOT A `<select>`: four values, always
          visible, one tap each — and it matches the pager's own pill buttons
          beside it rather than introducing a second control idiom.
        */}
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
                  "rounded-full border px-2.5 py-1 font-semibold transition-colors " +
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
            className="rounded-full border border-line px-3 py-1 font-semibold transition-colors hover:border-magenta disabled:opacity-40 disabled:hover:border-line"
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
            className="rounded-full border border-line px-3 py-1 font-semibold transition-colors hover:border-magenta disabled:opacity-40 disabled:hover:border-line"
          >
            Next
          </button>
        </span>
      </div>
    </section>
  );
}
