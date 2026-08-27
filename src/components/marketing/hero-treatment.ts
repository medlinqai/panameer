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
 *
 * ── ⚠⚠⚠ NEVER SPLIT A CLASS STRING ACROSS A `+` CONCATENATION ───────────────
 *
 * TAILWIND SCANS SOURCE TEXT FOR WHOLE CLASS TOKENS. It does not evaluate
 * JavaScript. A class broken across two string literals is INVISIBLE to it and
 * THE CSS IS NEVER EMITTED — the class lands on the element and does nothing.
 *
 * ⚠⚠ THAT SHIPPED. `P1-ALL-E031` wrote `HERO_SCRIM` as a two-part concatenation,
 * so `bg-[linear-gradient(150deg,rgba(13,18,48,0.86)…)]` was never generated and
 * SEVEN PUBLIC PAGES RENDERED WITH NO HERO SCRIM AT ALL — `/`, `/optimize`,
 * `/talent`, `/work`, `/shop`, `/integrate`, `/learn`. It survived review because a
 * WARM TAILWIND CACHE still held the class from before the extraction; it only
 * surfaced on a cold build after `rm -rf .next`.
 * ⚠ MEASURED WHILE BROKEN: `Browse the Catalog` fell to 3.06 / 2.56 / 2.81, which
 * is roughly 1.5 below its real figure — the scrim IS the contrast.
 * ⚠ `check:ui §64` catches it now, and caught it here: it asserts the COMPUTED
 * scrim, so `null` failed seven of eight pages.
 *
 * ⚠ EVERY ARBITRARY VALUE IN THIS FILE IS THEREFORE ONE UNBROKEN LITERAL, with
 * `// prettier-ignore` above it so a formatter cannot re-split it. ⚠ DO NOT REMOVE
 * THOSE PRAGMAS AND DO NOT "TIDY" THESE LINES TO FIT 80 COLUMNS.
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
/**
 * ⚠⚠ THE GRADIENT ITSELF, AS A `bg-[…]` UTILITY, AND IT IS THE ONLY COPY IN `src`.
 *
 * Extracted by `P1-J0-E336` because HOME's six new section bands paint the same
 * surface as the hero but must NOT take `isolate` (they have no video to contain)
 * or `text-white` (the light bands are dark-on-lilac). Composing both from one
 * string is what keeps the count at ONE.
 * ⚠ IF YOU NEED THIS GRADIENT SOMEWHERE NEW, IMPORT THIS. Do not paste it. There is
 * exactly one card/scrim literal left in `src` outside this file
 * (`AssessmentHero.tsx:51`, orphaned and rendered nowhere) and `check:ui §64`
 * asserts the computed value on eight public pages.
 */
// prettier-ignore
export const HERO_GRADIENT =
  "bg-[radial-gradient(1100px_500px_at_82%_-10%,rgba(215,44,214,0.42),transparent_60%),linear-gradient(150deg,#0d1230_0%,#191a44_55%,#3a1c53_100%)]";

/** ⚠ COMPOSED FROM `HERO_GRADIENT` — the card adds containment and its text colour. */
export const HERO_CARD = `isolate ${HERO_GRADIENT} text-white`;

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
// prettier-ignore
export const HERO_SCRIM =
  "absolute inset-0 bg-[linear-gradient(150deg,rgba(13,18,48,0.86)_0%,rgba(25,26,68,0.72)_55%,rgba(58,28,83,0.62)_100%)]";

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
 * (`Browse the Catalog`). ⚠ SAME BOX AS `HERO_BUTTON`, different skin — so a page
 * that grows a second control does not invent a third shape.
 *
 * ── ⚠⚠ IT CARRIES A TRANSLUCENT FILL NOW, AND THE FILL IS THE ACCESSIBILITY FIX ─
 *
 * `P1-J3-E033`, closed 2026-08-27. ⚠ SUPERSEDED — this comment used to say the
 * brief *"keeps its outlined treatment while taking the standard sizing"*, and that
 * is no longer the whole truth: it also has a floor.
 *
 * ⚠ WHY IT FAILED: with `border-white/35` and NO BACKGROUND, the white label sat
 * DIRECTLY ON THE VIDEO FRAME plus the scrim — so its contrast was a function of
 * what the camera saw, which is not a thing we control. It measured 4.55 / 4.33 /
 * 4.42 at 1440 / 900 / 390 against an AA floor of 4.5: failing at two of three.
 *
 * ⚠⚠ `rgba(13,18,48,0.40)` IS NOT AN ARBITRARY TINT. `#0d1230` is already the FIRST
 * STOP of both `HERO_CARD` and `HERO_SCRIM`, so the fill reads as part of the system
 * rather than as a patch on one button.
 *
 * ⚠ THE ALPHA WAS SWEPT, NOT GUESSED — measured over six sampled frames of
 * `learn.mp4` at three widths, worst case each:
 *
 *     fill                    1440    900    390
 *     none (the defect)       4.53   4.33   4.42   <- failed AA at 900 and 390
 *     rgba(13,18,48,0.20)     4.72   4.61   4.70
 *     rgba(13,18,48,0.30)     4.90   4.75   4.83
 *     rgba(13,18,48,0.40)     4.98   4.84   4.91   <- SHIPPED: smallest clearing 4.8
 *     rgba(13,18,48,0.45)     5.07   4.98   5.00   <- the brief's preference
 *     rgba(13,18,48,0.80)     5.55   5.53   5.55
 *
 * ⚠ 0.40 IS THE SMALLEST VALUE THAT CLEARS 4.5 WITH THE BRIEF'S 0.3 OF MARGIN AT
 * ALL THREE WIDTHS, which is what the instruction asked for. 0.45 was the brief's
 * preferred value and is 0.09-0.14 better; the instruction said take the smallest.
 *
 * ⚠⚠ AND THE MEASUREMENT ALMOST WENT WRONG, SO READ THIS BEFORE RE-MEASURING:
 * every figure above was taken with (a) the frames sampled across the WHOLE 11.85s
 * clip at 0/20/40/60/80% rather than the first 3.5s, (b) each seek waiting on the
 * `seeked` EVENT rather than a fixed timeout, and (c) AN ASSERTION THAT THE SCRIM IS
 * ACTUALLY PAINTING before any number is trusted.
 * ⚠ THAT LAST ONE IS NOT PARANOIA. An intermediate sweep, run while `HERO_SCRIM`'s
 * class was silently not generated (see the split-string warning at the top of this
 * file), reported 3.06 / 2.56 / 2.81 for no-fill and made 0.80 look necessary. THE
 * SCRIM IS ROUGHLY 1.5 OF THE CONTRAST ON THIS BUTTON. Measure a broken page and you
 * will over-darken a button to compensate for a missing scrim.
 * ⚠⚠ THREE FIXES THAT WERE **NOT** USED, AND MUST NOT BE:
 *   · DEEPENING `HERO_SCRIM` — tried on `/talent` and made things WORSE
 *     (3.52 / 3.13 / 3.49). Reverted in full. The scrim alphas are settled.
 *   · RECOLOURING THE LABEL — white-on-outline IS the treatment; a grey label is a
 *     different button.
 *   · TOUCHING `HERO_BUTTON`, `HERO_CARD` or `HERO_SCRIM` — `check:ui §64` asserts
 *     the computed card and scrim gradients on eight public pages.
 *
 * ⚠ `hover:bg-white/10` IS GONE — it would have lightened the very floor this fix
 * adds. `hover:bg-[rgba(13,18,48,0.60)]` deepens instead, so hover can only improve
 * contrast, never reduce it.
 */
// prettier-ignore
export const HERO_BUTTON_OUTLINE =
  "mt-8 inline-block rounded-[12px] border border-white/35 bg-[rgba(13,18,48,0.40)] px-7 py-4 font-display text-[16px] font-bold text-white transition-colors hover:bg-[rgba(13,18,48,0.60)]";

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
// prettier-ignore
export const HERO_DESC_CLASS =
  "text-[17px] leading-[1.6] text-[#e9e6f5] min-h-[108.8px] min-[901px]:text-[19px] min-[901px]:min-h-[121.6px]";
