"use client";

import Link from "next/link";
import { useRebuild, RebuildBadge } from "@/components/motion/Rebuild";
import { isCounted, type Figure } from "@/lib/figure";
import "@/components/console/honeycomb.css";

export type HoneyCell = {
  key: string;
  label: string;
  figure: Figure;
  counts: string;
  href: string;
  level?: "none" | "low" | "medium" | "strong" | null;
};

function rotate<T>(xs: T[], by: number): T[] {
  if (xs.length < 2) return xs;
  const n = ((by % xs.length) + xs.length) % xs.length;
  return [...xs.slice(n), ...xs.slice(0, n)];
}

export type HoneyLayout = "grid" | "flower";

export function Honeycomb({
  cells,
  layout = "grid",
  chrome = true,
}: {
  cells: HoneyCell[];
  layout?: HoneyLayout;
  chrome?: boolean;
}) {
  const { cycle, secondsLeft, still } = useRebuild();

  const CENTRE = 3;
  const shown = still
    ? cells
    : layout === "flower" && cells.length === 7
      ? (() => {
          const petals = cells.filter((_, i) => i !== CENTRE);
          const spun = rotate(petals, cycle);
          return [...spun.slice(0, CENTRE), cells[CENTRE], ...spun.slice(CENTRE)];
        })()
      : rotate(cells, cycle);

  const grid = (
    <>
      {}
      <div
        className={`pm-hive${layout === "flower" ? " pm-hive-flower" : ""}${chrome ? " mt-4" : ""}`}
        data-still={still ? "yes" : "no"}
        data-cycle={cycle}
        data-layout={layout}
        key={still ? "still" : cycle}
      >
        {shown.map((c) => {
          // TypeScript narrows the union through BOTH — the figure is a number
          const fig = c.figure;
          const counted = isCounted(fig);
          return (
            <Link
              key={c.key}
              href={c.href}
              className="pm-hive-cell"
              data-cell={c.key}
              data-counted={counted ? "yes" : "no"}
              // Absent rather than `"null"` when there is no level — a missing attribute
              data-level={c.level ?? undefined}
              // THE ACCESSIBLE NAME CARRIES THE REASON TOO. A screen reader
              aria-label={
                counted
                  ? `${c.label}: ${fig.toLocaleString("en-US")} ${c.counts}`
                  : `${c.label}: not counted \u2014 ${fig.uncounted}`
              }
            >
              <span className="pm-hive-figure" aria-hidden>
                {counted ? fig.toLocaleString("en-US") : "\u2014"}
              </span>
              <span className="pm-hive-label" aria-hidden>
                {c.label}
              </span>
              {/* THE REASON IS NOT OPTIONAL. It comes from the figure */}
              {!counted && (
                <span className="pm-hive-why" aria-hidden>
                  {fig.uncounted}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </>
  );

  // THE PICTURE FORM — no section, no border, no heading, no derived line. The badge
  if (!chrome) {
    return (
      <div className="pm-hive-picture">
        {grid}
        {/* THE KEY ONLY APPEARS WHERE LEVELS DO. A legend for a scale the cells are */}
        {cells.some((c) => c.level) && <LevelKey />}
        <RebuildBadge secondsLeft={secondsLeft} />
      </div>
    );
  }

  return (
    <section className="rounded-[14px] border border-line bg-white p-4 sm:p-5">
      <h2 className="font-display text-[16px] font-bold">Your Areas</h2>
      <p className="mt-0.5 text-[12.5px] text-ink-3">
        One cell per area. The cells move; the figures do not.
      </p>
      {grid}
      <BusiestLine cells={cells} />
      <RebuildBadge secondsLeft={secondsLeft} />
    </section>
  );
}

/** SCOTT: *"a small key under the honeycomb."* A TINTED CELL MEANS NOTHING */
function LevelKey() {
  const LEVELS = [
    ["none", "None"],
    ["low", "Low"],
    ["medium", "Medium"],
    ["strong", "Strong"],
  ] as const;
  return (
    <ul className="pm-hive-key" aria-label="What the shading means">
      {LEVELS.map(([key, label]) => (
        <li key={key}>
          <span className="pm-hive-key-swatch" data-level={key} aria-hidden />
          {label}
        </li>
      ))}
    </ul>
  );
}

/** THE BUSIEST / QUIET LINE IS DERIVED, AND IT SAYS WHAT FROM */
function BusiestLine({ cells }: { cells: HoneyCell[] }) {
  const counted = cells.filter(
    (c): c is HoneyCell & { figure: number } => isCounted(c.figure)
  );

  // NOTHING COUNTABLE AT ALL — a different sentence from "all zero", and
  if (counted.length === 0) {
    return (
      <p className="mt-3 border-t border-line pt-3 text-[12.5px] text-ink-2">
        No area on this page can be counted yet, so there is nothing to compare.
      </p>
    );
  }

  // EVERY COUNTED AREA EMPTY — said plainly, with no busiest and no quietest.
  if (counted.every((c) => c.figure === 0)) {
    const un = cells.length - counted.length;
    return (
      <p className="mt-3 border-t border-line pt-3 text-[12.5px] text-ink-2">
        {/* STATES THIS WHOLE CARD EXISTS TO KEEP APART. Found in the WS-B */}
        Nothing counted in any area yet
        {un > 0
          ? `, and ${un} area${un === 1 ? "" : "s"} could not be counted at all.`
          : "."}
      </p>
    );
  }

  const sorted = [...counted].sort((a, b) => b.figure - a.figure);
  const top = sorted[0];
  const bottom = sorted[sorted.length - 1];

  return (
    <p className="mt-3 border-t border-line pt-3 text-[12.5px] leading-relaxed text-ink-2">
      Busiest: <strong className="font-bold text-ink">{top.label}</strong>, with{" "}
      {top.figure.toLocaleString("en-US")} {top.counts}.
      {/* Only name a quietest when it is a DIFFERENT area — with one counted */}
      {sorted.length > 1 && bottom.key !== top.key && (
        <>
          {" "}
          Quietest: <strong className="font-bold text-ink">{bottom.label}</strong>, with{" "}
          {bottom.figure.toLocaleString("en-US")} {bottom.counts}.
        </>
      )}{" "}
      <span className="text-ink-3">
        Compared by count only &mdash; each area counts a different thing
        {counted.length < cells.length
          ? `, and ${cells.length - counted.length} area${cells.length - counted.length === 1 ? "" : "s"} could not be counted at all`
          : ""}
        .
      </span>
    </p>
  );
}
