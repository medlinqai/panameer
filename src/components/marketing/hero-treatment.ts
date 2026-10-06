/** THE ONE HERO TREATMENT. EVERY PUBLIC HERO IMPORTS FROM HERE. */

// prettier-ignore
export const HERO_GRADIENT =
  "bg-[radial-gradient(1100px_500px_at_82%_-10%,rgba(215,44,214,0.42),transparent_60%),linear-gradient(150deg,#0d1230_0%,#191a44_55%,#3a1c53_100%)]";

export const HERO_CARD = `isolate ${HERO_GRADIENT} text-white`;

/** THE SCRIM over the clip. Darkest of the variants that existed, deliberately — */
// prettier-ignore
export const HERO_SCRIM =
  "absolute inset-0 bg-[linear-gradient(150deg,rgba(13,18,48,0.86)_0%,rgba(25,26,68,0.72)_55%,rgba(58,28,83,0.62)_100%)]";

/** THE SOLID CTA BUTTON — `/work`'s, because Scott named it: *"I really like the CTA */
export const HERO_BUTTON =
  "mt-8 inline-block bg-magenta px-7 py-4 font-display " +
  "text-[16px] font-bold text-white transition-colors hover:bg-magenta-dark";

/** THE OUTLINED SECOND BUTTON. Only `/learn` has two controls today */
// prettier-ignore
export const HERO_BUTTON_OUTLINE =
  "mt-8 inline-block border border-white/35 bg-[rgba(13,18,48,0.40)] px-7 py-4 font-display text-[16px] font-bold text-white transition-colors hover:bg-[rgba(13,18,48,0.60)]";

/** THE BRIDGE LINE. IDENTICAL ON EVERY PUBLIC PAGE, WORD FOR WORD. */
export const HERO_BRIDGE_TEXT =
  "Check out the steps below to see how it works.";

/** `#efa3ee`, 19px, semibold, `mt-4` — measured off `/optimize`'s original. */
export const HERO_BRIDGE_CLASS =
  "mt-4 text-[19px] font-semibold leading-[1.5] text-[#efa3ee]";

/** THE DESCRIPTION IS A FIXED-HEIGHT BLOCK, AND THIS IS THE WHOLE POINT */
// prettier-ignore
export const HERO_DESC_CLASS =
  "text-[17px] leading-[1.6] text-[#e9e6f5] min-h-[108.8px] min-[901px]:text-[19px] min-[901px]:min-h-[121.6px]";
