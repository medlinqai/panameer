import type { ReactNode } from "react";

/** Shared marketing typography bits, matching the mockup. */
export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="mb-2.5 text-[13px] font-extrabold uppercase tracking-[0.06em] text-magenta">
      {children}
    </p>
  );
}

export function H2({ children }: { children: ReactNode }) {
  return (
    <h2 className="mb-3 text-[28px] font-extrabold tracking-[-0.8px] sm:text-[36px]">
      {children}
    </h2>
  );
}

/**
 * The section sub-head.
 *
 * E052 (walk 2) — NO WIDTH CAP, AND BALANCED.
 *
 * Two separate bugs were making these wrap early and only one of them was the
 * one being fixed. The cap was 640px, then 780px, and each widening moved the
 * break rather than removing it: a two-line subhead in an 1180px section is a
 * measure decision the section already made, and re-making it here just
 * guarantees the text is narrower than the heading above it.
 *
 * The second bug is subtler. These inherit `text-wrap: pretty` from the
 * marketing default, which only refuses to strand a word on the LAST line — it
 * does nothing about line one ending on "of". `balance` is the one that evens
 * the lines, which is what moves a break off a preposition.
 *
 * `text-balance` on the element rather than in globals.css because the default
 * for body copy is still `pretty`: balancing every paragraph on the site would
 * fight the reading rhythm of anything longer than two lines. This is a subhead
 * — short, and read as a unit.
 */
export function Lead({ children }: { children: ReactNode }) {
  return (
    <p className="mb-[34px] text-balance text-[18px] text-ink-2">{children}</p>
  );
}
