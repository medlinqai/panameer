import type { ReactNode } from "react";

/**
 * ── ⚠ THE BOXED HERO. ONE IMPLEMENTATION, SIX PAGES (P1-J0-E264) ────────────
 *
 * Scott, walking the public site 2026-08-21: *"HOME: the SECTION 1 is boxed
 * (correct). LEARN/SHOP: the Section 1 is fullwidth (incorrect) — I want it to be
 * a boxed layout like the HOME. TALENT/WORK: The Section 1 is fullwidth
 * (incorrect)."*
 *
 * There were THREE implementations, not two — `HomeHero`'s inset card,
 * `MarketingHero`'s full-bleed band, and a hand-rolled full-bleed `<section>` on
 * `/learn`. This is the one wrapper the two that were wrong now share, so the
 * fix is TWO call sites for SIX pages rather than a card pasted into six files:
 *
 *   `MarketingHero`  ->  /hire-talent · /find-work · /buy-services ·
 *                        /enterprise · /why-panameer
 *   `LearnPublic`    ->  /learn
 *
 * ── ⚠ THE GEOMETRY IS HOME'S, MEASURED FROM THE RENDERED PAGE ───────────────
 *
 * Not eyeballed from the stylesheet — measured on `/` before anything moved:
 *
 *     1440   card left 44   width 1352   radius 26px
 *      390   card left 10   width  370   radius 20px
 *
 * which is `.pm-home .hero-stage{padding:6px 44px 0}` and its `max-width:900px`
 * override `{padding:6px 10px 0}`, with `.hero-card`'s 26px/20px radius. The
 * Tailwind here reproduces those exact numbers, and the guard asserts them on
 * every page at four widths so the two implementations cannot drift.
 *
 * ⚠ `min-[901px]`, NOT `min-[900px]`, AND A GUARD CAUGHT THE DIFFERENCE ON THE
 * REFERENCE PAGE. Home's rule is `@media(max-width:900px)`, which INCLUDES 900 —
 * so at exactly 900 home is on its mobile inset. `min-[900px]` would have put
 * every other page on the desktop inset at that one width, and the two
 * treatments would have disagreed by 34px on a single pixel column. The
 * breakpoint is home's, off-by-one included.
 *
 * ⚠ THE CARD IS THEREFORE WIDER AT 899 THAN AT 901 (879 vs 812 at those widths):
 * the inset jumps 10 -> 44 as the viewport grows. That discontinuity is home's
 * own and predates this work; it is reproduced rather than quietly smoothed.
 *
 * ⚠ THE STAGE AND THE CARD CANNOT BE ONE ELEMENT, and `HomeHero`'s own comment
 * says why: *"the card clips its own video to a 26px radius with
 * `overflow:hidden`, and an element that clips cannot also be the one holding it
 * away from the viewport edge."* `/learn`'s hero has a video too. Same two
 * elements here, same reason.
 *
 * ── ⚠ WHY `HomeHero` DOES NOT USE THIS, AND IT IS A DELIBERATE CALL ─────────
 *
 * `HomeHero` already renders the target treatment — it is the page Scott says is
 * CORRECT — and its inset lives in `.pm-home`-scoped CSS that is coupled to
 * `.hero-card .wrap`, the video clip, the grain and the scrim. There is also a
 * measured constraint recorded in `home.css`: at 390 the H1 needs ≥326px of
 * measure and the current 10px + 20px gives it 330. Re-plumbing the one correct
 * page onto a new wrapper risks that for no visible gain.
 *
 * So: this is the single implementation for every page that had to CHANGE, built
 * to home's measured geometry, with the guard asserting all eight pages against
 * the same numbers. Reported rather than done quietly.
 */
export function HeroBox({
  children,
  /** The card's own surface — each hero keeps its own gradient. */
  cardClassName = "",
}: {
  children: ReactNode;
  cardClassName?: string;
}) {
  return (
    /*
      ⚠ THE STAGE. `pt-1.5` is home's 6px; `px-11` is its 44px, dropping to
      `px-2.5` (10px) below 900 — home's own breakpoint, not a Tailwind default,
      which is why it is an arbitrary variant rather than `lg:`.
    */
    <div className="px-2.5 pt-1.5 min-[901px]:px-11">
      <div
        className={
          /*
            ⚠ `overflow-hidden` IS LOAD-BEARING, not tidiness: it is what makes
            the radius honest for a hero carrying a video or a full-bleed
            gradient. Radius 20px below 900, 26px above — home's values.
          */
          "relative overflow-hidden rounded-[20px] min-[901px]:rounded-[26px] " +
          cardClassName
        }
      >
        {children}
      </div>
    </div>
  );
}
