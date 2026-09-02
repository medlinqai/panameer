"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import type { DashPath } from "@/lib/learn-dashboard";

/**
 * THE COVERAGE ROW — one row, what the width fits, an arrow to the rest
 * (`P1-J3-E045`).
 *
 * **SCOTT, 2026-09-02:** *"thought we show what space allows and then give an
 * arrow pointing to the right… and they can use it to scroll to other courses
 * we cant show in the normal space."*
 *
 * ── ⚠⚠ WHAT WAS ACTUALLY WRONG, BECAUSE IT WAS NOT WHAT IT LOOKED LIKE ───────
 *
 * Nothing was broken and there was never a missing `<img>`. The tiles are
 * coloured STATE squares, and for a new provider every one of them is the same
 * pale not-started square — so the grid read as a wall of identical blanks.
 * ⚠ THE TILE STATES ARE NOT REDESIGNED HERE. Certified fills with a check,
 * in-progress outlines with a proportional slab and its percentage, not-started
 * carries its lesson count — the same three, the same classes, moved.
 *
 * ── ⚠⚠ THE FIX FOR "THE TILES IDENTIFY NOTHING" IS A VISIBLE NAME ────────────
 *
 * The old grid identified a path ONLY through `title` and `aria-label` — a
 * tooltip you have to hover to get and a string only a screen reader speaks. A
 * mouse never touches it on a phone. So each tile now carries its path title
 * UNDER it, clamped to two lines, and KEEPS the tooltip and the aria-label it
 * already had. That is why the item is a fixed-width column rather than a
 * square: the square alone cannot hold a name.
 *
 * ── ⚠⚠ NATIVE OVERFLOW FIRST, ARROWS AS AN ADDITION ──────────────────────────
 *
 * The row is `overflow-x-auto`. Touch-drag, shift-wheel, and tabbing to a tile
 * beyond the fold all scroll it WITHOUT the arrows existing — the arrows are an
 * affordance on a container that is genuinely scrollable, not a carousel and
 * not pagination. Remove all the JavaScript on this page and the row still
 * works.
 * ⚠ `overflow-x` ON THE ROW IS ALSO WHAT KEEPS THE PAGE BODY FROM SCROLLING
 * SIDEWAYS. It only contains the overflow if every ancestor can shrink, which is
 * why `CoverageCard`'s right column is `min-w-0` and this wrapper is too.
 *
 * ⚠ BOTH ARROWS ARE HIDDEN WHEN EVERYTHING FITS — an arrow to nowhere is worse
 * than no arrow. The left one appears only once scrolled. State comes from the
 * element's own `scrollLeft` / `scrollWidth` / `clientWidth`, re-read on scroll
 * AND on resize, because "everything fits" is a function of the width and the
 * window is resizable.
 * ⚠ `useState` STARTS BOTH FALSE, so the server render and the first client
 * render agree and there is no hydration mismatch; the effect turns the right
 * arrow on a frame later if it is needed.
 */
export function CoverageRow({ paths }: { paths: DashPath[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    /* One pixel of slack: sub-pixel layout makes an exactly-fitting row report
       a scrollWidth a hair over its clientWidth, which would light the arrow. */
    const max = el.scrollWidth - el.clientWidth;
    setCanLeft(el.scrollLeft > 1);
    setCanRight(el.scrollLeft < max - 1);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [measure, paths.length]);

  /* Nearly a full view per press, with an overlap so nothing is jumped over. */
  const nudge = (dir: 1 | -1) => {
    const el = ref.current;
    if (el) el.scrollBy({ left: dir * Math.max(160, el.clientWidth * 0.85), behavior: "smooth" });
  };

  return (
    <div className="relative min-w-0">
      <div
        ref={ref}
        onScroll={measure}
        className="flex min-w-0 gap-2 overflow-x-auto scroll-smooth pb-1 [scrollbar-width:thin]"
      >
        {paths.map((p) => {
          const label = p.certified
            ? `${p.title} — certified`
            : p.completed > 0
              ? `${p.title} — ${p.percent}% complete`
              : `${p.title} — not started, ${p.lessons} lesson${p.lessons === 1 ? "" : "s"}`;
          return (
            <Link
              key={p.id}
              href={`/learn/${p.slug}`}
              title={label}
              aria-label={label}
              className="group w-[78px] shrink-0"
            >
              {/*
                ⚠ THE THREE STATE APPEARANCES ARE CARRIED OVER UNCHANGED from the
                grid this replaces — same border, same gradient, same slab, same
                glyphs. Only the container around them is new.
              */}
              <span
                className={
                  "relative grid aspect-square w-full place-items-center overflow-hidden rounded-[9px] transition-transform group-hover:scale-105 " +
                  (p.certified
                    ? "border border-transparent bg-[linear-gradient(140deg,var(--color-magenta),#8b1fa8)]"
                    : p.completed > 0
                      ? "border-2 border-magenta bg-white"
                      : "border border-line bg-bg-soft")
                }
              >
                {p.certified ? (
                  <Check className="h-3.5 w-3.5 text-white" strokeWidth={3.5} aria-hidden />
                ) : p.completed > 0 ? (
                  <>
                    <span
                      className="absolute inset-x-0 bottom-0 bg-magenta/20"
                      style={{ height: `${p.percent}%` }}
                      aria-hidden
                    />
                    <b className="relative font-display text-[9px] font-bold text-magenta">
                      {p.percent}%
                    </b>
                  </>
                ) : (
                  <em className="text-[9.5px] not-italic text-ink-2/70">{p.lessons}</em>
                )}
              </span>
              {/* ⚠ `aria-hidden`: the `aria-label` above already speaks the title,
                  and without this a screen reader reads the name twice. */}
              <span
                aria-hidden
                className="mt-1.5 block text-[9.5px] leading-[1.25] text-ink-2 [display:-webkit-box] [overflow:hidden] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]"
              >
                {p.title}
              </span>
            </Link>
          );
        })}
      </div>

      {canLeft && <Arrow dir="left" onClick={() => nudge(-1)} />}
      {canRight && <Arrow dir="right" onClick={() => nudge(1)} />}
    </div>
  );
}

/*
  ⚠ THE ARROW SITS OVER THE TILES, NOT BESIDE THEM. Beside them it would steal
  width from the row on every viewport — including the ones where it is hidden
  because everything fits — which is the opposite of "show what space allows".
  ⚠ IT IS ALIGNED TO THE SQUARE, NOT TO THE COLUMN: `top-0 h-[78px]` matches the
  tile's own height so the button does not drift down over the captions.
*/
function Arrow({ dir, onClick }: { dir: "left" | "right"; onClick: () => void }) {
  const Icon = dir === "left" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={dir === "left" ? "Scroll to earlier paths" : "Scroll to more paths"}
      className={
        "absolute top-0 grid h-[78px] w-7 place-items-center rounded-[9px] border border-line bg-white/95 text-ink-2 shadow-[0_6px_18px_-8px_rgba(23,30,62,0.5)] backdrop-blur-sm transition-colors hover:text-magenta " +
        (dir === "left" ? "left-0" : "right-0")
      }
    >
      <Icon className="h-4 w-4" aria-hidden />
    </button>
  );
}
