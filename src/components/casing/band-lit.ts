/**
 * ── ⚠⚠⚠ THE BAND'S "THIS ONE IS LIT" LOOK, IN ONE PLACE (`P2-A2-E720` item 1) ──────────
 *
 * ⚠ **SCOTT: *"Band avatar, lit state = square tile. Same magenta rounded-square as a lit
 * band item, photo inside as a normal circle, no ring. Reuse the band item's lit class."***
 *
 * ⚠⚠ **`E717` MADE THE AVATAR THE RIGHT COLOUR AND LEFT IT THE WRONG SHAPE.** That brief
 * measured a lit pill at **73×46** and gave the avatar `p-[7px]` so its disc reached **46×46**
 * — the pill's height — which fixed the weight of the fill. ⚠⚠⚠ **BUT IT KEPT
 * `rounded-full`, SO THE LIT AVATAR WAS A MAGENTA CIRCLE SITTING IN A ROW OF MAGENTA
 * ROUNDED-SQUARES.** The fill matched and the silhouette did not, which is why it still read
 * as a different treatment rather than as the same one.
 *
 * ⚠⚠ **WHY A MODULE AND NOT A COPIED STRING.** `bg-rail-active` was typed out in **four**
 * places — three inside `AppBand` (the menu item, the messages button, `BandIcon`) and one in
 * `AccountMenu`. Scott's instruction is literally *"reuse the band item's lit class"*, and a
 * fifth hand-typed copy is the opposite of that. ⚠ `E717` already paid this bill once on the
 * other axis: its own note records that the *"which item is lit"* predicate had been written
 * out three times, and that **the gate carried its own fourth copy**, so a divergence would
 * have been invisible to the very check built to catch it.
 *
 * ⚠⚠⚠ **THESE ARE WHOLE CLASS TOKENS IN A PLAIN STRING LITERAL, DELIBERATELY.** Tailwind v4
 * scans source text and never evaluates JavaScript, so a class assembled by concatenation or
 * interpolation emits **no CSS at all, silently** — the `HERO_SCRIM`/`E338` trap, which
 * shipped dead styles on seven public pages for two days behind a warm cache. **Import these;
 * never re-type them, never build one from pieces.**
 */

/**
 * The lit fill. ⚠ `E217`'s one rule: active is a **SOLID** fill and the translucent wash is
 * hover and nothing else.
 */
export const BAND_LIT = "bg-rail-active text-white";

/** The unlit state on the dark band — a wash on hover only. */
export const BAND_IDLE = "text-white/75 hover:bg-white/10 hover:text-white";

/**
 * The tile silhouette every lit band target shares.
 *
 * ⚠⚠ **IT IS THE SHAPE, NOT THE SIZE.** A menu item reaches 46px tall through `px-3 py-1.5`
 * around two lines of text; the avatar reaches the same 46px through `p-[7px]` around a 32px
 * circle. ⚠⚠⚠ **SO THE PADDING IS NOT SHARED AND MUST NOT BE** — sharing it would force one
 * of the two to the wrong size to keep a constant tidy.
 */
export const BAND_TILE = "rounded-[8px]";
