import Link from "next/link";
import type { ReactNode } from "react";

/**
 * THE CONSOLE PAGE PATTERN (WS1, Scott's template; Medlinq /medlinq is the
 * structural source).
 *
 *   T1–T5 action/KPI tiles  →  M1 full-width listing  →  Volume-Over-Time footer
 *
 * One component so every console page is the same shape. The alternative —
 * each page assembling its own grid — is how the Medlinq console pages drifted
 * apart, and this template is explicitly the thing Scott asked to be reused.
 *
 * EVERY NUMBER HERE IS OPTIONAL AND DEFAULTS TO UNKNOWN. The transaction layer
 * does not exist, so tiles take `value?: string | number` and render "—" when
 * it is absent, with a hint saying what they are waiting for. A tile that shows
 * a real count and one that shows a placeholder must be visibly different, or
 * the dashboard becomes a set of numbers nobody can trust.
 */

export type Tile = {
  label: string;
  /** Absent = not knowable yet; renders as "—" in muted type. */
  value?: string | number;
  hint?: string;
  href?: string;
};

export function TileRow({ tiles }: { tiles: Tile[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {tiles.map((t) => {
        const known = t.value !== undefined && t.value !== null;
        const body = (
          <>
            <p className="text-[12px] font-semibold uppercase tracking-wide text-ink-2">
              {t.label}
            </p>
            <p
              className={
                "mt-1 font-display text-[26px] font-bold leading-none " +
                (known ? "text-magenta" : "text-ink-2/30")
              }
            >
              {known ? t.value : "—"}
            </p>
            {t.hint && <p className="mt-1 text-[11.5px] text-ink-2">{t.hint}</p>}
          </>
        );
        return t.href ? (
          <Link
            key={t.label}
            href={t.href}
            className="rounded-brand border border-line bg-white p-4 transition-colors hover:border-magenta"
          >
            {body}
          </Link>
        ) : (
          <div key={t.label} className="rounded-brand border border-line bg-white p-4">
            {body}
          </div>
        );
      })}
    </div>
  );
}

/** M1 — the page's main listing. Full width, per the template. */
export function Listing({
  title,
  columns,
  rows,
  empty,
  action,
}: {
  title: string;
  columns: string[];
  /** Cells per row. Empty array renders the honest empty state. */
  rows?: ReactNode[][];
  empty: ReactNode;
  action?: ReactNode;
}) {
  const hasRows = rows && rows.length > 0;
  return (
    <section className="mt-6 overflow-hidden rounded-brand border border-line bg-white">
      <header className="flex flex-wrap items-center gap-4 px-6 py-4">
        <h2 className="font-display text-[18px] font-bold">{title}</h2>
        <span className="ml-auto">{action}</span>
      </header>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-[14px]">
          <thead className="border-y border-line bg-bg-soft text-[12.5px] text-ink-2">
            <tr>
              {columns.map((c) => (
                <th key={c} className="px-6 py-3 font-semibold">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {hasRows ? (
              rows!.map((cells, i) => (
                <tr key={i} className="border-b border-line last:border-0">
                  {cells.map((cell, j) => (
                    <td key={j} className="px-6 py-3">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="px-6 py-12 text-center">
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

/**
 * The Volume-Over-Time footer.
 *
 * Medlinq's version links each tile to a time-series report. Ours doesn't:
 * there are no reports and no series to plot, so a link would promise a page
 * that isn't there. The tiles state the metric and say the series is pending.
 */
export function VolumeFooter({ tiles }: { tiles: Tile[] }) {
  return (
    <div className="mt-6">
      <h2 className="mb-2 text-[11.5px] font-bold uppercase tracking-wide text-ink-2">
        Volume Over Time
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {tiles.map((t) => {
          const known = t.value !== undefined && t.value !== null;
          return (
            <div key={t.label} className="rounded-brand border border-line bg-white p-4">
              <p className="text-[12px] font-semibold text-ink-2">{t.label}</p>
              <p
                className={
                  "mt-1 font-display text-[20px] font-bold leading-none " +
                  (known ? "text-ink" : "text-ink-2/30")
                }
              >
                {known ? t.value : "—"}
              </p>
              <p className="mt-1 text-[11px] text-ink-2/70">
                {known ? "Total to date" : "No series yet"}
              </p>
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
