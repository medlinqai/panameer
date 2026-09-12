/**
 * THE LISTING'S LOOK, IN ONE PLACE (`P1-A1.5-E430` WS-0 / WS-5).
 *
 * ⚠⚠ WHY THIS FILE EXISTS. `Listing` stays a SERVER component and delegates to a
 * CLIENT one when it is given interactive props (Scott chose option (c):
 * *"Listing stays a server component and delegates to a client child only when
 * searchable/sortable/paginated props are passed"*). That is two renderers for
 * one table, and two renderers drift — which is the exact failure
 * `ConsolePage.tsx`'s own docblock says the template was written to prevent:
 * *"each page assembling its own grid — is how the Medlinq console pages drifted
 * apart."* So every class string they share lives here and neither owns it.
 *
 * ── ⚠ THE HEADER TREATMENT (WS-5) ───────────────────────────────────────────
 *
 * **SCOTT, 2026-09-12:** *"the column headers — also different font and sizes."*
 * Medlinq's header is a light, small, muted, sentence-case label on a pale band,
 * quiet enough that the data reads first. Panameer's was `text-[12.5px]
 * font-semibold text-ink-2` — heavier and larger, competing with its own rows.
 * ⚠ MEASURED IN THE APP, NOT TAKEN FROM THE BRIEF (CLAUDE.md rule 4): the before
 * state measured 12.5px / weight 600 / rgb(74,70,88) / sentence case, with every
 * one of the eight header cells wrapping to 63px because `white-space: normal`
 * let them. The numbers below and the after-measurements are in the report.
 *
 * ⚠ `whitespace-nowrap` IS THE LOAD-BEARING PART. Scott: *"keep every header on
 * ONE line."* It is also what makes the horizontal scroller behave: a table that
 * can wrap always shrinks to fit, so it never overflows and the scroll never
 * engages in a way anyone can see.
 */

/** The card. `overflow-hidden` keeps the rounded corners over the table. */
export const CARD = "mt-6 overflow-hidden rounded-brand border border-line bg-white";

/** The card header band — title left, search and actions right. */
export const CARD_HEADER = "flex flex-wrap items-center gap-3 px-6 py-4";

export const CARD_TITLE = "font-display text-[18px] font-bold";

/**
 * The table.
 *
 * ⚠ `min-w-[980px]` REPLACES `min-w-[720px]`, and the number is measured rather
 * than chosen: with `nowrap` cells the eight columns need 1211px at their
 * natural width, and the card is 1058px wide at a 1440px viewport. 980px is the
 * floor at which no column collapses into unreadability; past it the scroller
 * takes over, which is what `overflow-x-auto` is for.
 */
export const TABLE = "w-full min-w-[980px] text-left text-[14px]";

/**
 * ⚠ QUIET, AND ON ONE LINE. Small, light, muted, sentence case, pale band —
 * Medlinq's treatment, in Panameer tokens.
 */
export const THEAD = "border-y border-line bg-bg-soft";
export const TH =
  "whitespace-nowrap px-4 py-2.5 text-[11.5px] font-medium text-ink-2/80";

/** A sortable header is a button, so it is reachable by keyboard, not just mouse. */
export const TH_BUTTON =
  "inline-flex items-center gap-1 whitespace-nowrap text-[11.5px] font-medium text-ink-2/80 transition-colors hover:text-ink";

export const ROW = "border-b border-line last:border-0";

/**
 * ⚠ 16px SIDE PADDING, DOWN FROM 24px, AND VERTICALLY TIGHTER. The before state
 * measured rows at 88–144px (average 102px) because 24px padding plus wrapping
 * cells stacked two and three lines. Scott asked for Medlinq's *"comfortable row
 * height"* and *"one line per row"* — those are the same instruction, since the
 * height came from the wrapping.
 */
export const TD = "whitespace-nowrap px-4 py-2.5 align-middle";
/*
  ⚠⚠ `whitespace-nowrap` ON THE CELLS IS THE REST OF THE ROW-HEIGHT FIX, and it
  was found by MEASURING rather than reasoning. After the padding came down the
  rows were 63px — except one at 84px, because the Name column had been squeezed
  to 74px by its neighbours and "Renae Requester (19)" wrapped onto three lines.
  ⚠ A DATA GRID SCROLLS; IT DOES NOT WRAP. One line per row is Scott's ask
  ("one line per row", "comfortable row height"), and those are the same
  instruction — the height WAS the wrapping. Long values now run into the
  horizontal scroller, which is what it is for.
  ⚠ THE EMPTY STATE KEEPS WRAPPING (`TD_EMPTY` below): it is a sentence, not a
  cell, and it spans every column.
*/

/** The empty state's cell. */
export const TD_EMPTY = "px-6 py-12 text-center";
