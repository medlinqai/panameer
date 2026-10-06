import Link from "next/link";
import type { ReactNode } from "react";
import {
  InteractiveListing,
  type RowMeta,
} from "@/components/console/InteractiveListing";
import {
  CARD,
  CARD_HEADER,
  CARD_TITLE,
  ROW,
  TABLE,
  TD,
  TD_EMPTY,
  TH,
  THEAD,
} from "@/components/console/listing-shared";

export type TileTone = "neutral" | "amber" | "emerald" | "emeraldDeep" | "emeraldSolid";

const TILE_TONES: Record<TileTone, string> = {
  neutral: "bg-ink/[0.07] text-ink-2",
  amber: "bg-amber-100 text-amber-800",
  emerald: "bg-emerald-100 text-emerald-800",
  emeraldDeep: "bg-emerald-200 text-emerald-900",
  emeraldSolid: "bg-emerald-600 text-white",
};

export type Tile = {
  label: string;
  /** Opt-in: supplying one switches this tile to the Learn-style layout. */
  icon?: ReactNode;
  tone?: TileTone;
  /** Absent = not knowable yet; renders as "—" in muted type. */
  value?: string | number;
  hint?: string;
  href?: string;
  tbd?: boolean;
};

export function TileRow({ tiles }: { tiles: Tile[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {tiles.map((t, ti) => {
        const known = t.value !== undefined && t.value !== null;

        if (t.icon && !t.tbd) {
          const tile = (
            <div className="flex items-center gap-3 rounded-brand border border-line bg-white p-3.5 transition-colors hover:border-magenta">
              <span
                className={
                  "grid h-[38px] w-[38px] shrink-0 place-items-center rounded-[11px] " +
                  TILE_TONES[t.tone ?? "neutral"]
                }
              >
                {t.icon}
              </span>
              <div className="min-w-0">
                {}
                <b
                  className={
                    "block font-display text-[21px] leading-tight " +
                    (known ? "text-ink" : "text-ink-2/30")
                  }
                >
                  {known ? t.value : "—"}
                </b>
                <span className="mt-0.5 block truncate text-[11px] text-ink-2" title={t.label}>
                  {t.label}
                </span>
              </div>
            </div>
          );
          return t.href ? (
            <Link key={`${t.label}-${ti}`} href={t.href} className="block">
              {tile}
            </Link>
          ) : (
            <div key={`${t.label}-${ti}`}>{tile}</div>
          );
        }

        const body = (
          <>
            <p className="text-[12px] font-semibold uppercase tracking-wide text-ink-2">
              {t.tbd ? "TBD" : t.label}
            </p>
            {t.tbd ? (
              <p className="mt-2 inline-block rounded-[6px] border border-dashed border-line px-2 py-1 text-[11.5px] font-semibold text-ink-2/70">
                metric to be defined
              </p>
            ) : (
              // THE COUNTS ARE INK, NOT MAGENTA WS-5a)
              <p
                className={
                  "mt-1 font-display text-[26px] font-bold leading-none " +
                  (known ? "text-ink" : "text-ink-2/30")
                }
              >
                {known ? t.value : "—"}
              </p>
            )}
            {!t.tbd && t.hint && (
              <p className="mt-1 text-[11.5px] text-ink-2">{t.hint}</p>
            )}
          </>
        );
        return t.href ? (
          <Link
            key={`${t.label}-${ti}`}
            href={t.href}
            className="rounded-brand border border-line bg-white p-4 transition-colors hover:border-magenta"
          >
            {body}
          </Link>
        ) : (
          <div key={`${t.label}-${ti}`} className="rounded-brand border border-line bg-white p-4">
            {body}
          </div>
        );
      })}
    </div>
  );
}

/** M1 — the page's main listing. Full width, per the template. */
/** INTERACTIVITY IS OPT-IN WS-0) */
export function Listing({
  title,
  columns,
  rows,
  rowMeta,
  empty,
  action,
  search,
  searchPlaceholder,
  sortable,
  pageSize,
  pageSizeOptions,
  pageSizeKey,
}: {
  title: string;
  columns: string[];
  /** Cells per row. Empty array renders the honest empty state. */
  rows?: ReactNode[][];
  /** THE OPT-IN SWITCH. One entry per row — `text` for the search, `sort` for */
  rowMeta?: RowMeta[];
  empty: ReactNode;
  action?: ReactNode;
  /** Set false to omit the search box (pages the deck draws without one). */
  search?: boolean;
  /** Names what is searched, per WS-4b. Implies the interactive renderer. */
  searchPlaceholder?: string;
  sortable?: boolean;
  pageSize?: number;
  /** `E458` — opt-in, like `TileRow`'s `icon`. See `InteractiveListing`. */
  pageSizeOptions?: number[];
  pageSizeKey?: string;
}) {
  const hasRows = rows && rows.length > 0;

  // ONE CONDITION, STATED ONCE. Interactive only when the caller supplied the
  if (rowMeta && rows) {
    return (
      <InteractiveListing
        title={title}
        columns={columns}
        rows={rows}
        rowMeta={rowMeta}
        empty={empty}
        action={action}
        searchPlaceholder={search === false ? undefined : searchPlaceholder}
        sortable={sortable}
        pageSize={pageSize}
        pageSizeOptions={pageSizeOptions}
        pageSizeKey={pageSizeKey}
      />
    );
  }

  return (
    <section className={CARD}>
      <header className={CARD_HEADER}>
        <h2 className={CARD_TITLE}>{title}</h2>
        <span className="ml-auto flex items-center gap-3">
          {search !== false && (
            // Every deck slide draws a Search box. DISABLED while the listing
            <input
              type="search"
              placeholder="Search"
              disabled={!hasRows}
              title={hasRows ? undefined : "Search opens when there is data"}
              className="w-[200px] rounded-full border border-line px-3 py-1.5 text-[13.5px] outline-none focus:border-magenta disabled:bg-black/[0.02] disabled:text-ink-2/60"
            />
          )}
          {action}
        </span>
      </header>
      <div className="overflow-x-auto">
        <table className={TABLE}>
          <thead className={THEAD}>
            <tr>
              {columns.map((c) => (
                <th key={c} className={TH}>
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {hasRows ? (
              rows!.map((cells, i) => (
                <tr key={i} className={ROW}>
                  {cells.map((cell, j) => (
                    <td key={j} className={TD}>
                      {cell}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className={TD_EMPTY}>
                  {empty}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/** The Volume-Over-Time footer. */
export function VolumeFooter({
  tiles,
  title = "Volume Last 90 Days",
}: {
  tiles: Tile[];
  title?: string;
}) {
  return (
    <div className="mt-6">
      <h2 className="mb-2 text-[11.5px] font-bold uppercase tracking-wide text-ink-2">
        {title}
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {tiles.map((t, ti) => {
          const known = t.value !== undefined && t.value !== null;
          // WS3 — a volume tile with an href IS the entry to that metric's
          const cls =
            "block rounded-brand border border-line bg-white p-4 " +
            (t.href ? "transition-colors hover:border-magenta" : "");

          // THE LEARN-STYLE CHIP IS OPT-IN HERE TOO
          if (t.icon && !t.tbd) {
            const inner = (
              <>
                <span className="flex items-center gap-2.5">
                  <span
                    className={
                      "grid h-[30px] w-[30px] shrink-0 place-items-center rounded-[9px] " +
                      TILE_TONES[t.tone ?? "neutral"]
                    }
                  >
                    {t.icon}
                  </span>
                  <span className="min-w-0 truncate text-[12px] font-semibold text-ink-2" title={t.label}>
                    {t.label}
                  </span>
                </span>
                {/* INK, NOT MAGENTA (`E433`) — a count is not interactive. */}
                <p
                  className={
                    "mt-1.5 font-display text-[22px] font-bold leading-none " +
                    (known ? "text-ink" : "text-ink-2/30")
                  }
                >
                  {known ? t.value : "—"}
                </p>
                {t.hint && <p className="mt-1 text-[11px] text-ink-2/70">{t.hint}</p>}
              </>
            );
            return t.href ? (
              <Link key={`${t.label}-${ti}`} href={t.href} className={cls}>
                {inner}
              </Link>
            ) : (
              <div key={`${t.label}-${ti}`} className={cls}>
                {inner}
              </div>
            );
          }
          const inner = (
            <>
              <p className="text-[12px] font-semibold text-ink-2">
                {t.tbd ? "TBD" : t.label}
              </p>
              <p
                className={
                  "mt-1 font-display text-[20px] font-bold leading-none " +
                  (known ? "text-ink" : "text-ink-2/30")
                }
              >
                {known ? t.value : "—"}
              </p>
              {/* THE LEADER LINE IS OPT-IN / ), exactly */}
              <p className="mt-1 text-[11px] text-ink-2/70">
                {t.tbd
                  ? "metric to be defined"
                  : (t.hint ??
                    (t.href
                      ? "Open report →"
                      : known
                        ? "Total to date"
                        : "No series yet"))}
              </p>
            </>
          );
          return t.href ? (
            <Link key={`${t.label}-${ti}`} href={t.href} className={cls}>
              {inner}
            </Link>
          ) : (
            <div key={`${t.label}-${ti}`} className={cls}>
              {inner}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Standard empty state for a listing with no data layer behind it. */
export function StubEmpty({
  what,
  why,
}: {
  what: string;
  why: string;
}) {
  return (
    <>
      <p className="text-[15.5px] font-bold">No {what} yet.</p>
      <p className="mx-auto mt-2 max-w-lg text-[14px] leading-relaxed text-ink-2">
        {why}
      </p>
    </>
  );
}
