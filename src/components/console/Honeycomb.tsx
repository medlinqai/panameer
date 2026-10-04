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
          /* ⚠⚠ `fig` IS A `const` ALIAS AND `counted` IS A `const` BOOLEAN, so
             TypeScript narrows the union through BOTH — the figure is a number
             inside the true branch and `{ uncounted }` inside the false one,
             with no cast anywhere. ⚠⚠⚠ A CAST WOULD HAVE SILENCED EXACTLY THE
             CHECK THIS TYPE EXISTS TO MAKE, which is why there is not one. */
          const fig = c.figure;
          const counted = isCounted(fig);
          return (
            <Link
              key={c.key}
              href={c.href}
              className="pm-hive-cell"
              data-cell={c.key}
              data-counted={counted ? "yes" : "no"}
              /* ⚠ Absent rather than `"null"` when there is no level — a missing attribute
                 cannot be matched by `[data-level="..."]`, so the hatched treatment stands
                 with no extra rule. */
              data-level={c.level ?? undefined}
              /* ⚠⚠ THE ACCESSIBLE NAME CARRIES THE REASON TOO. A screen reader
                 cannot see a dashed outline, so for an uncountable cell the
                 distinction the CSS makes visually must be in the WORDS. */
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
              {/* ⚠⚠⚠ THE REASON IS NOT OPTIONAL. It comes from the figure
                  itself, exactly as in `StatFigureRow`, so a cell cannot print
                  a dash without saying why. */}
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

  /* ⚠⚠ THE PICTURE FORM — no section, no border, no heading, no derived line. ⚠ The badge
     stays: it is what accounts for the movement. */
  if (!chrome) {
    return (
      <div className="pm-hive-picture">
        {grid}
        {/* ⚠⚠ THE KEY ONLY APPEARS WHERE LEVELS DO. ⚠ A legend for a scale the cells are
            not using would be a caption about nothing — the `grid` layout passes no
            `level`, so it gets none. */}
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

/**
 * ── ⚠⚠ THE KEY (`P2-A1.1-E731`) ──────────────────────────────────────────
 *
 * ⚠ **SCOTT: *"a small key under the honeycomb."*** ⚠⚠ **A TINTED CELL MEANS NOTHING
 * WITHOUT ONE.** Four shades of one hue carry an ordering a reader can see but cannot
 * NAME, and an unnamed ordering invites the wrong reading — darker could as easily mean
 * *"needs attention"* as *"doing well"*.
 * ⚠⚠⚠ **THE SWATCHES ARE THE REAL CELLS, NOT A SECOND SET OF COLOURS.** They carry the
 * same `data-level` attribute the hexagons do, so the key is painted by the same CSS rules
 * — it cannot drift from what it explains (`E585`).
 */
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

/**
 * ── ⚠⚠⚠ THE BUSIEST / QUIET LINE IS DERIVED, AND IT SAYS WHAT FROM ───────
 *
 * ⚠ SCOTT: *"The busiest/quiet line is derived, and says so plainly if every
 * area is empty."*
 *
 * ⚠⚠ IT READS THE SAME `cells` ARRAY THE GRID DRAWS, so it cannot name an area
 * the honeycomb is not showing. ⚠ It is given the UNROTATED array on purpose —
 * the sentence must not change when the cells move, because the cells moving
 * does not change which area is busiest.
 *
 * ⚠⚠⚠ ONLY COUNTED FIGURES VOTE. An uncountable area is not a quiet one — it is
 * an unmeasured one, and calling it "quietest" would report a result where
 * nothing was measured. That is the same rule `allZero` carries for the cards.
 *
 * ⚠⚠ AND IT STATES ITS OWN LIMITATION. Areas count different things, so "most
 * counted" is a comparison of raw counts and nothing more — saying "busiest"
 * without saying that would be a claim the data does not support.
 */
function BusiestLine({ cells }: { cells: HoneyCell[] }) {
  const counted = cells.filter(
    (c): c is HoneyCell & { figure: number } => isCounted(c.figure)
  );

  /* ⚠⚠ NOTHING COUNTABLE AT ALL — a different sentence from "all zero", and
     the two must not be merged: one means nobody has done anything, the other
     means nothing can be measured. */
  if (counted.length === 0) {
    return (
      <p className="mt-3 border-t border-line pt-3 text-[12.5px] text-ink-2">
        No area on this page can be counted yet, so there is nothing to compare.
      </p>
    );
  }

  /* ⚠ EVERY COUNTED AREA EMPTY — said plainly, with no busiest and no quietest.
     ⚠⚠ A "busiest" among a set of zeros would name an arbitrary winner. */
  if (counted.every((c) => c.figure === 0)) {
    const un = cells.length - counted.length;
    return (
      <p className="mt-3 border-t border-line pt-3 text-[12.5px] text-ink-2">
        {/*
          ⚠⚠⚠ *"Nothing counted in any area yet"* ON ITS OWN WOULD MERGE THE TWO
          STATES THIS WHOLE CARD EXISTS TO KEEP APART. ⚠ Found in the WS-B
          render, not in review: a buyer sees three measured zeros AND an
          uncountable Profile cell, and the sentence reported all four as
          empty. ⚠⚠ AN AREA THAT COULD NOT BE COUNTED IS NOT AN EMPTY ONE, and
          the line must not quietly absorb it — the cells are careful about
          this distinction and the sentence beneath them has to be too.
          ⚠ SUPERSEDED, quoted not deleted (`E164`):
          //   Nothing counted in any area yet.
        */}
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
      {/* ⚠ Only name a quietest when it is a DIFFERENT area — with one counted
          area, "busiest and quietest" is the same cell twice. */}
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
