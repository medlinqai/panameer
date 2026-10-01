"use client";

import Link from "next/link";
import { useRebuild, RebuildBadge } from "@/components/motion/Rebuild";
/* ⚠⚠⚠ FROM `lib/figure`, NOT `lib/statistics` — this is a CLIENT component and
   `lib/statistics` imports prisma. Importing it here put `pg` in the browser
   bundle and the build died on "Can't resolve 'dns'". ⚠⚠ `tsc` STAYED GREEN
   THROUGHOUT; only `next build` can see a bundling error. See `lib/figure.ts`. */
import { isCounted, type Figure } from "@/lib/figure";
import "@/components/console/honeycomb.css";

/**
 * ── ⚠⚠⚠ THE HONEYCOMB — ONE CELL PER AREA (`P2-A2-E603` WS-B) ────────────
 *
 * ⚠ SCOTT, 2026-09-23: *"One cell per area on the shared 15-second rebuild.
 * The rebuild rearranges cells and never changes a number."*
 *
 * ⚠⚠ IT USES `E600` WS-D's `useRebuild` RATHER THAN A SECOND CLOCK. A page with
 * two 15-second timers has two 15-second timers — they start at different
 * moments and drift, and then one picture redraws while another counts down to
 * something that already happened.
 *
 * ── ⚠⚠⚠ THE NUMBERS NEVER CHANGE, AND THAT IS STRUCTURAL ─────────────────
 *
 * ⚠ `cells` ARRIVES AS A PROP FROM THE SERVER AND IS NEVER REFETCHED HERE.
 * ⚠⚠ THERE IS NO `fetch`, NO `router.refresh()` AND NO STATE HOLDING A FIGURE
 * IN THIS FILE — so a rebuild **cannot** change a number, rather than merely
 * happening not to. `useRebuild` returns a counter; a counter cannot carry
 * data. ⚠ That is `Rebuild.tsx`'s own rule 3, inherited rather than restated.
 *
 * ── ⚠⚠ THE ORDER IS A ROTATION, AND IT IS DETERMINISTIC ──────────────────
 *
 * ⚠ `cycle` starts at 0 and rotation by 0 is the identity, so **the server and
 * the first client render produce the same order** and there is no hydration
 * mismatch. ⚠⚠ A `Math.random()` shuffle would have rendered one order on the
 * server and another in the browser, which React reports as a hydration error
 * and a reader sees as the page flickering before it settles.
 * ⚠⚠⚠ AND A ROTATION IS WHAT MAKES THE PROOF POSSIBLE: with n > 1 cells the
 * order is DIFFERENT on every consecutive cycle, so "did it rearrange?" has a
 * yes/no answer that does not depend on luck.
 */
export type HoneyCell = {
  key: string;
  label: string;
  /** ⚠ The area's headline figure — counted, or a dash carrying its reason. */
  figure: Figure;
  /** ⚠ What the figure counts, e.g. `"colleagues"`. Used in the derived line. */
  counts: string;
  href: string;
  /**
   * ── ⚠⚠⚠ THE LEVEL, DECIDED ELSEWHERE (`P2-A1.1-E731`) ───────────────────────────
   *
   * ⚠ **THIS COMPONENT NEVER COMPUTES IT.** `levelFor()` in `lib/usage-areas.ts` is the one
   * function, and the gauge card beside this comb calls the same one (`E585`).
   * ⚠⚠ **`null` IS NOT `"none"`.** `none` means a MEASURED ZERO and tints pale-with-an-edge;
   * `null` means no level applies — an uncounted figure, or one with no goal — and keeps the
   * hatched treatment it already had. ⚠⚠⚠ **COLLAPSING THE TWO WOULD UNDO THE ONE RULE THIS
   * COMB ALREADY ENFORCES** (counting rule 2).
   * ⚠ Optional, so the `grid` layout's existing callers are unchanged.
   */
  level?: "none" | "low" | "medium" | "strong" | null;
};

/** ⚠ Rotation by `cycle`, so cycle 0 is the order the server rendered. */
function rotate<T>(xs: T[], by: number): T[] {
  if (xs.length < 2) return xs;
  const n = ((by % xs.length) + xs.length) % xs.length;
  return [...xs.slice(n), ...xs.slice(0, n)];
}

/**
 * ── ⚠⚠ TWO LAYOUTS, AND THE SECOND ONE IS WHY THIS PROP EXISTS (`E730` WS-B) ──────
 *
 * ⚠ `grid` is what `E603` shipped: a plain rectangular grid, 2 columns then 3.
 * ⚠⚠ `flower` is the TESSELLATED comb Scott approved for the Usage header — odd rows
 * offset by half a cell and pulled up so the hexagons interlock. ⚠⚠⚠ **A 3×3 RECTANGULAR
 * GRID OF HEXAGONS DOES NOT TESSELLATE AND HAS NO CENTRE CELL**, which is the measured
 * reason this could not simply be "pass nine cells to the existing layout".
 */
export type HoneyLayout = "grid" | "flower";

/**
 * ── ⚠⚠⚠ `chrome` — THE COMB CAN BE A CARD, OR JUST THE PICTURE ────────────────────
 *
 * ⚠ With `chrome` (the default) it is what it has always been: a bordered `<section>`
 * carrying its own heading, lede, derived line and rebuild badge.
 * ⚠⚠ **WITHOUT IT, THE SECTION, THE BORDER, THE HEADING AND THE LEDE ALL GO** — because
 * `PatternHeader` mounts this in its `picture` slot, and ⚠⚠⚠ **A BORDERED CARD WITH AN
 * `<h2>` NESTED INSIDE A BORDERED PANEL READS AS TWO CARDS AND TWO HEADINGS FOR ONE
 * THING.** ⚠ The derived busiest/quietest line goes too, because the header renders that
 * sentence itself from the same figures — two copies of one sentence on one screen is
 * `E585` in prose.
 * ⚠ **THE REBUILD BADGE SURVIVES**, because it is the only thing that explains why the
 * cells are moving. A comb that rearranges with nothing saying it will is motion with no
 * account of itself.
 */
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

  /*
    ⚠⚠⚠ A READER WHO ASKED FOR NO MOTION GETS THE ORDER FROZEN, NOT JUST THE
    FADE REMOVED. ⚠ Cells silently swapping places with no transition is the
    WORST version of motion for that reader, not the safest: it happens with
    nothing to explain it. ⚠⚠ `still` also makes `secondsLeft` null, so there
    is no countdown — a countdown beside a picture that never redraws is a
    promise the page does not keep.
  */
  /*
    ── ⚠⚠⚠ THE FLOWER ROTATES ITS PETALS AROUND A FIXED CENTRE (`P2-A1.1-E731`) ──────

    ⚠ **SCOTT: *"the flower with Profile in the centre, as in the mockup."*** ⚠⚠ A plain
    rotation carries the centre cell out of the middle fifteen seconds after load, so
    *"Profile in the centre"* was true of the first render and of nothing after it.
    ⚠⚠⚠ **THE CENTRE IS HELD AND THE SIX AROUND IT ROTATE**, which keeps `E603`'s rule —
    *"the rebuild rearranges cells and never changes a number"* — completely intact while
    making the centre a fact rather than a coincidence of timing. ⚠ It is also what a
    flower does.
    ⚠ Index 3 of seven is the middle of 2-3-2. ⚠⚠ The `grid` layout is untouched and still
    rotates everything, because it has no centre to hold.
  */
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
      {/*
        ⚠ `key={still ? "still" : cycle}` REPLAYS THE SETTLE ANIMATION each
        cycle. ⚠⚠ THE KEY IS ON THE GRID, NOT ON A CELL: keying each cell by
        cycle would remount every cell every 15 seconds, which throws away
        focus if somebody is tabbing through them.
      */}
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
