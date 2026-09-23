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
};

/** ⚠ Rotation by `cycle`, so cycle 0 is the order the server rendered. */
function rotate<T>(xs: T[], by: number): T[] {
  if (xs.length < 2) return xs;
  const n = ((by % xs.length) + xs.length) % xs.length;
  return [...xs.slice(n), ...xs.slice(0, n)];
}

export function Honeycomb({ cells }: { cells: HoneyCell[] }) {
  const { cycle, secondsLeft, still } = useRebuild();

  /*
    ⚠⚠⚠ A READER WHO ASKED FOR NO MOTION GETS THE ORDER FROZEN, NOT JUST THE
    FADE REMOVED. ⚠ Cells silently swapping places with no transition is the
    WORST version of motion for that reader, not the safest: it happens with
    nothing to explain it. ⚠⚠ `still` also makes `secondsLeft` null, so there
    is no countdown — a countdown beside a picture that never redraws is a
    promise the page does not keep.
  */
  const shown = still ? cells : rotate(cells, cycle);

  return (
    <section className="rounded-[14px] border border-line bg-white p-4 sm:p-5">
      <h2 className="font-display text-[16px] font-bold">Your Areas</h2>
      <p className="mt-0.5 text-[12.5px] text-ink-3">
        One cell per area. The cells move; the figures do not.
      </p>

      {/*
        ⚠ `key={still ? "still" : cycle}` REPLAYS THE SETTLE ANIMATION each
        cycle. ⚠⚠ THE KEY IS ON THE GRID, NOT ON A CELL: keying each cell by
        cycle would remount every cell every 15 seconds, which throws away
        focus if somebody is tabbing through them.
      */}
      <div
        className="pm-hive mt-4"
        data-still={still ? "yes" : "no"}
        data-cycle={cycle}
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

      <BusiestLine cells={cells} />
      <RebuildBadge secondsLeft={secondsLeft} />
    </section>
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
