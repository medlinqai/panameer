/**
 * THE TWO SPINE DIAGRAMS' SHARED PALETTE AND TYPE SCALE (`P1-J0-E335`).
 *
 * ⚠⚠ TRANSCRIBED FROM THE MOCKUPS' `:root`, NOT REDESIGNED. Both mockups declare
 * the identical block and the brief is explicit that the geometry and the palette
 * are SCOTT'S — they came out of `Panameer_Integration_Model_SCW.pptx`, which he
 * edited by hand. ⚠ THE TWO DIAGRAMS SHARE ONE GRID DELIBERATELY so they read as a
 * pair; sharing this file is what keeps that true.
 *
 * ── ⚠⚠ WHY THESE ARE HEX LITERALS AND NOT `var(--color-ink)` ────────────────
 *
 * `INK`, `MAG` and `MAGINK` are byte-identical to `--color-ink`, `--color-magenta`
 * and `--color-magenta-ink`. They are still written as literals, because
 * `--color-ink` FLIPS TO `#f2f0f7` UNDER `:root[data-theme="dark"]` and every lane
 * tint below is a HARDCODED LIGHT COLOUR that does not flip with it. A themed ink
 * on a permanently-light board is `P1-J0-E333`'s bug exactly — measured there two
 * commits ago, near-white text on a `#f6f4fb` band. ⚠ DO NOT "TOKENISE" THESE.
 *
 * ⚠ NO NEW GLOBAL CSS — the brief forbids it, so the mockups' `.lane`/`.cap`/`.n`
 * classes become the style objects below and are applied per element.
 */

/** `--navy` — identical to `--color-ink`. */
/*
 * ⚠⚠ RENAMED FROM `NAVY` (`P1-J1.4-E300`, 2026-08-31). THE NAVY IS RETIRED.
 * Scott: *"272334 replaces [the navy] EVERYWHERE. why would we want that other
 * color?"* — there is now ONE dark colour in the product.
 * ⚠ A constant called `NAVY` holding slate is exactly how the navy gets
 * "restored" by someone being helpful, so the NAME had to move with the value.
 * ⚠ It is still byte-identical to `--color-ink`; that relationship is the point
 * of this file and is unchanged.
 */
export const INK = "#272334";
/** `--mag` — identical to `--color-magenta`. The rail colour. */
export const MAG = "#D72CD6";
/** `--magink` — identical to `--color-magenta-ink`. Rail LABELS only. */
export const MAGINK = "#A61AA5";
/** `--ink2`. ⚠ NOT the app's `--color-ink-2` (#4A4658) — the mockup's own value. */
export const INK2 = "#5B6183";
export const LINE = "#E3E6EF";
export const GREY = "#8A90AE";
export const PILL = "#EDEEF4";

/** Lane tints, as written. ERP / Panameer AIP / Provider-Supplier. */
export const ERP = "#EDF1FA";
export const ERP_EDGE = "#C3CFEA";
export const ERP_INNER = "#DDE5F6";
export const AIP = "#FAE9FA";
export const AIP_EDGE = "#E7B9E6";
export const AIP_INNER = "#F4D7F3";
export const PRO = "#E8F5F8";
export const PRO_EDGE = "#B4D8E1";

/*
  THE TYPE SCALE, from the mockups' stylesheet.

  ⚠⚠ `cap`, `pl` AND `rl` ARE 7.5px AND THAT IS SCOTT'S NUMBER, NOT A SHRINK. The
  brief forbids solving the width problem by taking type below 10px; these were
  already below it in the source and are ported unchanged. `DiagramShell`'s
  `min-w-[1110px]` is what stops them being scaled DOWN FURTHER at 900 and 390.
  ⚠ `lane` USES `--font-display` (Comfortaa) — the one place these diagrams
  deliberately inherit an app font, because the mockup asks for Comfortaa and the
  token already is it.
*/
export const T = {
  lane: {
    fontFamily: "var(--font-display), Comfortaa, cursive",
    fontWeight: 700,
    fontSize: 15,
    fill: INK,
  },
  cap: { fontSize: 7.5, fontWeight: 700, letterSpacing: "0.09em", fill: INK2 },
  n: { fontSize: 11, fontWeight: 600, fill: INK },
  ns: { fontSize: 8.5, fontWeight: 500, fill: INK2 },
  pl: { fontSize: 7.5, fontWeight: 700, letterSpacing: "0.07em", fill: INK2 },
  rl: { fontSize: 7.5, fontWeight: 700, letterSpacing: "0.05em", fill: MAGINK },
  st: { fontSize: 8.5, fontWeight: 700, letterSpacing: "0.06em", fill: "#fff" },
} as const;

/**
 * The legend under each board. ⚠ THE THIRD ROW'S LABEL DIFFERS BETWEEN THE TWO
 * MOCKUPS ("Panameer Provider" vs "ERP Application Suppliers"), so it is a prop.
 */
export const LEGEND_KEYS = (third: string) => [
  { swatch: ERP, label: "ERP Application — your system of record" },
  { swatch: AIP, label: "Panameer AIP" },
  { swatch: PRO, label: third },
  { swatch: MAG, label: "Panameer ↔ ERP rail", solid: true },
];
