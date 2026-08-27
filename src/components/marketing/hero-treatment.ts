/**
 * ── ⚠⚠ THE ONE HERO TREATMENT. EVERY PUBLIC HERO IMPORTS FROM HERE. ─────────
 *
 * `P1-ALL-E031`. Scott, 2026-08-26: *"i want the heros across all public pages to
 * look similar. Same color background, video behind each one, same color buttons
 * (even if they have not been linked yet...). Pink text saying the same thing.
 * card/counters."*
 *
 * ⚠⚠ THIS FILE IS THE DELIVERABLE, NOT THE PAGES. There was no shared hero, which
 * is exactly why seven pages drifted apart over two days — each fix landed in one
 * file and the others silently diverged. AFTER THIS, CHANGING THE HERO TREATMENT IS
 * ONE EDIT IN ONE FILE.
 * ⚠ IF YOU ARE ABOUT TO PASTE A GRADIENT, A SCRIM OR A BUTTON CLASS INTO A HERO
 * COMPONENT, STOP. THAT IS THE DEFECT THIS FILE EXISTS TO END. Import it.
 * ⚠ `check:ui` §64 ASSERTS every public hero's rendered card and scrim match these
 * strings, so a future hero that hardcodes its own treatment FAILS THE GATE.
 *
 * ── ⚠ THE STANDARD IS THE MAJORITY, NOT AN INVENTION ────────────────────────
 *
 * Four of seven already shipped byte-identical cards — `/talent`, `/work`, `/shop`,
 * `/integrate` — plus `MarketingHero` on `/why-panameer`. Nothing new was designed.
 * What changed is that the outliers came to it:
 *   `/work`    kept the card, gave up a LIGHTER scrim (0.82/0.62/0.30) for this one
 *   `/learn`   gave up its own radial-free card and its 115deg magenta-ending scrim
 *   `/`, `/optimize`  had no card at all — `HomeHero` now uses `HeroBox`
 */

/**
 * THE CARD SURFACE.
 *
 * ⚠⚠ THE PURPLE STAYS AT `0.42` AND THAT IS SCOTT'S DECISION, 2026-08-26:
 * *"i actually like the purple. i want consistency."*
 * ⚠ DO NOT LOWER IT TO `0.18`. DO NOT TUNE IT. `P1-J1-E035` (`/talent` reads too
 * purple) IS CLOSED BY THIS — the answer was consistency, not a different purple.
 * An earlier brief measured `/learn`'s lighter pair onto `/talent` and it dropped
 * the bridge line to 3.13-3.52; that route is closed twice over.
 *
 * ⚠ `isolate` IS LOAD-BEARING — it keeps the video and scrim stacking inside the
 * card instead of against the page. ⚠ `text-white` is the card's inherited colour
 * and every hero relies on it.
 */
export const HERO_CARD =
  "isolate bg-[radial-gradient(1100px_500px_at_82%_-10%,rgba(215,44,214,0.42),transparent_60%)," +
  "linear-gradient(150deg,#0d1230_0%,#191a44_55%,#3a1c53_100%)] text-white";

/**
 * THE SCRIM over the clip. Darkest of the variants that existed, deliberately —
 * it is what makes white and `#efa3ee` legible over arbitrary footage.
 *
 * ⚠ ADOPTING THIS MADE `/work` DARKER AND `/learn` MUCH DARKER. `/learn`'s two open
 * AA failures — `P1-J3-E031` (bridge line) and `P1-J3-E033` (`Browse the Catalog`)
 * — were measured against this scrim in this brief; the numbers are in the report.
 * ⚠ DO NOT LIGHTEN IT to recover contrast somewhere else. Three attempts at
 * recolouring `/learn`'s pink already failed and that decision is Scott's.
 */
export const HERO_SCRIM =
  "absolute inset-0 bg-[linear-gradient(150deg,rgba(13,18,48,0.86)_0%," +
  "rgba(25,26,68,0.72)_55%,rgba(58,28,83,0.62)_100%)]";

/**
 * THE SOLID CTA BUTTON — `/work`'s, because Scott named it: *"I really like the CTA
 * on the WORK page."*
 *
 * ⚠ `/talent` AND `/integrate` GAVE UP `17px font-semibold px-[30px]` WITH NO
 * `font-display` TO TAKE THIS. That is the visible half of the standardisation.
 * ⚠ THE LABEL'S 4.02:1 ON THIS FILL IS `P1-J4-E020` — site-wide, pre-existing,
 * brand-token, and NOT this brief's to fix. No colour token was touched.
 */
export const HERO_BUTTON =
  "mt-8 inline-block rounded-[12px] bg-magenta px-7 py-4 font-display " +
  "text-[16px] font-bold text-white transition-colors hover:bg-magenta-dark";

/**
 * THE OUTLINED SECOND BUTTON. Only `/learn` has two controls today
 * (`Browse the Catalog`), and the brief keeps its outlined treatment while taking
 * the standard sizing. ⚠ SAME BOX AS `HERO_BUTTON`, different skin — so a page that
 * grows a second control does not invent a third shape.
 */
export const HERO_BUTTON_OUTLINE =
  "mt-8 inline-block rounded-[12px] border border-white/35 px-7 py-4 " +
  "font-display text-[16px] font-bold text-white transition-colors hover:bg-white/10";

/**
 * ⚠⚠ THE BRIDGE LINE. IDENTICAL ON EVERY PUBLIC PAGE, WORD FOR WORD.
 * Scott: *"They all should say 'Check out the steps...'"*
 * ⚠ DO NOT REWORD IT ON ANY PAGE. Six pages already had it verbatim; `/optimize`
 * was the only one missing it.
 */
export const HERO_BRIDGE_TEXT =
  "Check out the steps below to see how it works.";

/** `#efa3ee`, 19px, semibold, `mt-4` — measured off `/optimize`'s original. */
export const HERO_BRIDGE_CLASS =
  "mt-4 text-[19px] font-semibold leading-[1.5] text-[#efa3ee]";

/**
 * ── ⚠⚠ THE DESCRIPTION IS A FIXED-HEIGHT BLOCK, AND THIS IS THE WHOLE POINT ──
 *
 * Scott, 2026-08-26: *"i see the number of description lines determine the size
 * (top to bottom)...and the size determines how much of the steps you see....which
 * makes it clear there is a deeper explanation. these are all breadcrumbs that lead
 * the curious person to investigate."*
 *
 * ⚠ SO THE HERO'S HEIGHT IS A PROMISE, NOT A LAYOUT ARTEFACT: it controls how much
 * of the spine peeks above the fold, which is the cue that there is more to read.
 * SEVEN DIFFERENT HEIGHTS = SEVEN DIFFERENT PROMISES.
 *
 * ⚠⚠ THE MIN-HEIGHTS ARE DERIVED FROM THE MEASURED LINE-HEIGHT, NOT GUESSED.
 * Measured on the rendered page at three widths before anything moved:
 *
 *     >=901px   font-size 19px   line-height 30.4px   ->  4 lines = 121.6px
 *      <901px   font-size 17px   line-height 27.2px   ->  4 lines = 108.8px
 *
 * `leading-[1.6]` x 19px = 30.4 and x 17px = 27.2 exactly, so these are the type
 * scale's own numbers rather than a rounding of them.
 *
 * ⚠ FOUR LINES, NOT THREE. The longest approved string wraps to three at 1440; the
 * fourth is deliberate slack so a later copy edit cannot silently re-break the
 * alignment across seven pages.
 * ⚠⚠ SHORTER COPY LEAVES WHITESPACE. THAT IS THE POINT — do not centre it, do not
 * collapse it, and do not pad the copy to fill it.
 */
export const HERO_DESC_CLASS =
  "text-[17px] leading-[1.6] text-[#e9e6f5] min-h-[108.8px] " +
  "min-[901px]:text-[19px] min-[901px]:min-h-[121.6px]";
