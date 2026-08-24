import type { ReactNode } from "react";

/**
 * THE TWO-COLUMN HERO — the shared shape (`P1-J0-E291`).
 *
 * Scott, 2026-08-24, with `/optimize` and `/learn` screenshotted side by side:
 * *"Structuring. I want you to structure LEARN like you did OPTIMIZE."*
 *
 * ── ⚠ WHAT IS SHARED IS THE STRUCTURE, AND NOTHING ELSE ─────────────────────
 *
 * `HomeHero` (`/`, `/optimize`) and `LearnPublic`'s hero (`/learn`) cannot share
 * a skin, and that is not laziness — it is two hard constraints that were checked
 * rather than assumed:
 *
 *   · EVERY hero rule is `.pm-home`-scoped — `home.css:182` (`.hero-row`), `:200`
 *     (`.hero-cta`), `:235` (`.hero-right p`), `:257` (`p.hero-bridge`) — and
 *     `/learn` is NOT inside `.pm-home`. Wrapping it would drag the whole
 *     marketing-home stylesheet, `*{margin:0;padding:0}` reset included, onto a
 *     Tailwind page.
 *   · `HomeHero` has NO VIDEO BACKDROP and `/learn`'s hero requires one
 *     (`HeroVideoBackdrop`, `/learn.mp4`) — the same clip the SIGNED-IN
 *     `LearnHome` hero uses, so creating an account does not change the footage.
 *
 * So this component owns the CONTRACT — one row, two slots, left before right in
 * DOM order — and each caller brings its own chrome through the `*ClassName`
 * props. ⚠ THAT IS WHAT MADE `/optimize` PROVABLY BYTE-IDENTICAL: it passes the
 * exact class names it already had, so not one CSS rule changed hands. Measured
 * before and after at 1440 / 900 / 390, geometry and `innerText` hash.
 *
 * ⚠ NO CSS FILE, DELIBERATELY. `StepDisclosures` needed one and paid for it with
 * six mirrored values and a specificity collision (`.sd-n` vs `.pm-home .sd-n`,
 * fixed in `5d50135`). The default grid here is Tailwind, which cannot be beaten
 * by a `.pm-home ` descendant selector because it is not competing with one.
 *
 * ── ⚠ THE TWO CALLERS DIVERGE ON THE CTA COUNT, ON PURPOSE ──────────────────
 *
 * `/optimize` has ONE button. `/learn` has TWO — `Create your free account` AND
 * `Browse the catalog` — settled by Scott 2026-08-24: *"The two buttons that you
 * have there are great. keep those...add the rest."* `/learn` has a real
 * signed-out browse path and `/optimize` does not. ⚠ THIS IS A DECISION, NOT
 * DRIFT — do not "align" the two heroes by deleting a button.
 *
 * ⚠ THIS COMPONENT MUST NOT GROW A `"use client"` DIRECTIVE. Not for the reason
 * that was believed and disproved in `5d50135` — it does NOT cost `/optimize` its
 * `○`, which was measured — but because it would ship this subtree and both
 * heroes' contents to the browser to hydrate markup that never changes.
 */
export type HeroTwoUpProps = {
  /** The headline column. Conventionally `<h1>` + the CTA(s). */
  left: ReactNode;
  /** The supporting column. Conventionally sub-copy + a bridge line + stats. */
  right: ReactNode;
  /**
   * ⚠ THE ROW WRAPPER'S CLASSES. `/optimize` passes `"wrap hero-row"`, which is
   * exactly what it had before the extraction — that is the byte-identity.
   * Omitted, the Tailwind default below applies.
   */
  rowClassName?: string;
  leftClassName?: string;
  rightClassName?: string;
};

/*
  ⚠ `min-[901px]`, NOT `min-[900px]`. `home.css`'s hero collapses at
  `max-width:900px`, which INCLUDES 900 — a `min-[900px]` breakpoint here would
  put two columns at exactly the width the other hero has one. This has bitten
  before; it is the same off-by-one the public hero guard hit.
*/
const DEFAULT_ROW =
  "grid grid-cols-1 items-center gap-10 min-[901px]:grid-cols-2";

export function HeroTwoUp({
  left,
  right,
  rowClassName = DEFAULT_ROW,
  leftClassName,
  rightClassName,
}: HeroTwoUpProps) {
  return (
    <div className={rowClassName}>
      {/*
        ⚠ LEFT IS FIRST IN THE DOM AND STAYS FIRST. Below the breakpoint the grid
        is one column, so DOM order IS reading order: headline, then CTA, then the
        supporting copy. Reversing with `order` to put the sub-copy first would
        read the page to a screen reader in an order nobody designed.
      */}
      <div className={leftClassName}>{left}</div>
      <div className={rightClassName}>{right}</div>
    </div>
  );
}
