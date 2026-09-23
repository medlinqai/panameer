"use client";

import { useId, useState } from "react";
import type { ReactNode } from "react";

/**
 * ── ⚠⚠⚠ THE FLIP CARD — THE ORACLE INFOLET GESTURE (`P2-A2-E603` WS-A) ───
 *
 * ⚠ SCOTT, 2026-09-23: *"This is the Oracle infolet gesture, which every member
 * already knows from Fusion, so it's a pattern for the whole product, not a
 * Statistics feature."*
 *
 * ⚠⚠ THE GESTURE AND THE POSITION ARE BORROWED; THE STYLING IS OURS. Bottom-right
 * corner, because that is where the muscle memory reaches. ⚠⚠⚠ NO ORACLE CHROME —
 * our tokens, our type, our radius. Borrowing where a control LIVES is not the
 * same as borrowing how it LOOKS.
 *
 * ⚠ IT LIVES IN `components/motion/` BESIDE `Rebuild.tsx` (`E600` WS-D) because
 * they are the same kind of thing: a shared behaviour the product reuses, not a
 * page's feature. **The next brief that wants a flip looks here.**
 * ⚠⚠ SCOPE (Scott): this component plus the Statistics cards. **No other page is
 * retrofitted in this brief.**
 *
 * ── ⚠⚠⚠ IT NEVER FLIPS ITSELF ────────────────────────────────────────────
 *
 * ⚠ SCOTT: *"Member-initiated. It never flips on a timer — the honeycomb already
 * rebuilds every fifteen seconds; a card flipping itself means things moving
 * with nobody touching anything."*
 * ⚠⚠ SO THERE IS NO `setInterval` IN THIS FILE AND THERE MUST NEVER BE ONE. The
 * only thing that changes `flipped` is a click or a key. ⚠ `initialBack` chooses
 * which face STARTS up — a starting state, not a motion.
 *
 * ── ⚠⚠ THE BOX DOES NOT CHANGE HEIGHT ────────────────────────────────────
 *
 * ⚠ Both faces occupy the same grid cell (`grid` + both children in `1/1`), so
 * the card is as tall as its TALLER face and neither flip resizes it. ⚠⚠ A card
 * that grows on flip shoves every card below it down the page, which reads as
 * the layout breaking rather than as a card turning over.
 *
 * ── ⚠⚠⚠ ACCESSIBILITY IS NOT THE ANIMATION'S AFTERTHOUGHT ────────────────
 *
 * ⚠ The hidden face is `visibility: hidden` — removed from the accessibility
 * tree — NOT moved off screen. ⚠⚠ AN OFF-SCREEN FACE IS STILL READ ALOUD, so a
 * screen reader would hear both faces of every card, which is worse than no
 * flip.
 * ⚠⚠⚠ IT IS NOT `display: none`, AND THAT IS THE SAME SENTENCE AS THE HEIGHT
 * RULE ABOVE — `display: none` removes the face from the GRID as well as from
 * the a11y tree, and the box then collapses to whichever face is up. ⚠ MEASURED
 * AT 303px → 192px ON FLIP before it was corrected. `visibility: hidden` is the
 * one value that satisfies BOTH requirements at once.
 * ⚠ SUPERSEDED, quoted not deleted (`E164`):
 * //   The hidden face is `hidden` — removed from the accessibility tree — NOT
 * //   moved off screen.
 * ⚠ The control is a real `<button>`: focusable, keyboard-operable, with an
 * `aria-expanded`-style label that says which face it will show.
 * ⚠⚠ REDUCED MOTION: the faces SWAP with no spin. The information is the point;
 * the rotation is decoration, and decoration is what a reduced-motion request
 * is about.
 */
export function FlipCard({
  front,
  back,
  backLabel,
  initialBack = false,
  title,
}: {
  front: ReactNode;
  /** ⚠ `null` means this card has no back worth turning to — see below. */
  back: ReactNode | null;
  /** ⚠ What the control promises, e.g. `"Trend"` or `"What to do next"`. */
  backLabel?: string;
  /** ⚠ Data picks the starting face (Scott): every figure zero and no history
   *  → the action back starts up. Otherwise the front. */
  initialBack?: boolean;
  title: string;
}) {
  const [flipped, setFlipped] = useState(initialBack);
  const id = useId();

  /*
    ⚠⚠⚠ NO BACK, NO CONTROL. Scott: *"A card only gets the control when its back
    has something real on it. A flip onto a thin back is a door onto a wall
    (`E579`)."* ⚠ The card renders exactly as it did before — no corner affordance
    promising something that is not there.
  */
  if (!back) return <>{front}</>;

  const showing = flipped ? "back" : "front";
  return (
    <div className="pm-flip" data-showing={showing}>
      {/* ⚠ Both faces share one grid cell — the box cannot change height. */}
      <div className="pm-flip-faces">
        {/*
          ⚠⚠⚠ `pm-flip-hidden` IS `visibility: hidden`, NOT `display: none`, AND
          THE DIFFERENCE IS THE WHOLE HEIGHT GUARANTEE.
          ⚠ MEASURED: with `hidden` (`display:none`) the hidden face LEAVES THE
          GRID, so the cell collapsed to the visible face and the card went
          **303px → 192px on flip** — exactly the shove-the-page-down failure
          this was supposed to prevent.
          ⚠⚠ `visibility: hidden` KEEPS THE BOX AND STILL REMOVES THE FACE FROM
          THE ACCESSIBILITY TREE, which is Scott's other requirement — hidden
          from a screen reader, **not moved off screen**. `aria-hidden` is
          belt-and-braces for the same thing.
        */}
        <div
          className={flipped ? "pm-flip-hidden" : "pm-flip-face"}
          id={`${id}-front`}
          aria-hidden={flipped}
        >
          {front}
        </div>
        <div
          className={flipped ? "pm-flip-face" : "pm-flip-hidden"}
          id={`${id}-back`}
          aria-hidden={!flipped}
        >
          {back}
        </div>
      </div>
      {/* ⚠ Bottom-right — the infolet position. ⚠⚠ A REAL TAP TARGET on a phone:
          44px, not a 16px glyph. */}
      <button
        type="button"
        onClick={() => setFlipped((f) => !f)}
        aria-controls={flipped ? `${id}-back` : `${id}-front`}
        className="pm-flip-toggle"
        title={flipped ? `Back to ${title}` : backLabel ? `${title}: ${backLabel}` : title}
      >
        {/* ⚠ The accessible name says what the control DOES and to which card —
            "Flip" alone is meaningless when six cards each have one. */}
        <span className="sr-only">
          {flipped ? `Show ${title} figures` : `Show ${backLabel ?? "more"} for ${title}`}
        </span>
        <span aria-hidden className="pm-flip-glyph">
          {/* ⚠ A corner fold, drawn in our tokens. Not an Oracle icon. */}
          <svg viewBox="0 0 16 16" width="13" height="13" fill="none">
            <path
              d="M2 8.5 A6.5 6.5 0 0 1 13.5 4.6"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
            <path d="M13.8 1.8v3.2h-3.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </button>
    </div>
  );
}
