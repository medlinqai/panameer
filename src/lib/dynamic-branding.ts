import { contrast, hexToHsl, hslToHex, isValidHex, PANAMEER_DEFAULT_HUE } from "@/lib/themeRecipes";

// Dynamic Branding (Scott 2026-10-05): the company color themes the console for its members.
// Three looks; every text pair must reach 4.5:1 or the theme can't be saved.
export const LOOKS = [
  { id: "ink", label: "Ink rail", blurb: "Panameer's dark band, your color on actions." },
  { id: "color", label: "Color rail", blurb: "A deep shade of your color as the band." },
  { id: "light", label: "Light rail", blurb: "A light tint of your color, dark text." },
] as const;
export type LookId = (typeof LOOKS)[number]["id"];
export const LOOK_IDS: string[] = LOOKS.map((l) => l.id);
export const MIN_CONTRAST = 4.5;

const INK = "#272334";
const TEXT_DARK = "#1f2937";
const WHITE = "#ffffff";

export type BrandTokens = {
  rail: string;
  railText: string;
  railActive: string;
  brand: string;
  brandText: string;
  link: string;
  light: boolean;
};

/** Darken (lower lightness) until `text` on it reaches the minimum, or give up at black. */
function darkenFor(hex: string, against: string, min = MIN_CONTRAST): string {
  const { h, s, l } = hexToHsl(hex);
  for (let L = l; L >= 0; L -= 1) {
    const c = hslToHex(h, s, L);
    if (contrast(c, against) >= min) return c;
  }
  return "#000000";
}

export function brandTokens(brandHex: string, look: LookId): BrandTokens {
  const raw = brandHex.toLowerCase();
  const { h, s } = hexToHsl(raw);
  // Never blocks: ink text if it reads on the color, else darken the fill under white text.
  const fits = (t: string) => contrast(raw, t) >= MIN_CONTRAST;
  const brandText = fits(WHITE) ? WHITE : fits(TEXT_DARK) ? TEXT_DARK : WHITE;
  const brand = fits(brandText) ? raw : darkenFor(raw, WHITE);
  const light = look === "light";
  const rail = look === "ink" ? INK : look === "color" ? hslToHex(h, Math.min(s, 55), 16) : hslToHex(h, Math.min(s, 30), 95);
  return {
    rail,
    railText: light ? TEXT_DARK : WHITE,
    railActive: darkenFor(brand, WHITE),
    brand,
    brandText,
    link: darkenFor(brand, WHITE),
    light,
  };
}

export type ContrastCheck = { pair: string; ratio: number; ok: boolean };

/** Every text/background pair the theme paints. */
export function contrastChecks(t: BrandTokens): ContrastCheck[] {
  const pairs: [string, string, string][] = [
    ["Band text on the band", t.railText, t.rail],
    ["Active menu item", WHITE, t.railActive],
    ["Button text on your color", t.brandText, t.brand],
    ["Links on white", t.link, WHITE],
  ];
  return pairs.map(([pair, a, b]) => {
    const ratio = Math.round(contrast(a, b) * 100) / 100;
    return { pair, ratio, ok: ratio >= MIN_CONTRAST };
  });
}

/** Null when savable; otherwise the reason a member sees. */
export function themeProblem(brandHex: string | null, look: string | null): string | null {
  if (!isValidHex(brandHex)) return "Pick a color as #rrggbb.";
  if (!look || !LOOK_IDS.includes(look)) return "Pick one of the three looks.";
  return null;
}

/** Themes saved before the three looks map onto the nearest one. */
const LEGACY: Record<string, LookId> = { deep: "color", vivid: "color", soft: "light", mono: "ink" };
export function normalizeLook(look: string | null | undefined): LookId | null {
  if (!look) return null;
  return LOOK_IDS.includes(look) ? (look as LookId) : (LEGACY[look] ?? null);
}

/** CSS variables for AppShell; null = Panameer default (no theme saved, or unreadable). */
export function themeVars(brandHex: string | null | undefined, rawLook: string | null | undefined, enabled: boolean | null = null) {
  if (enabled === false) return null;
  const look = normalizeLook(rawLook);
  if (!isValidHex(brandHex) || !look || !LOOK_IDS.includes(look) || themeProblem(brandHex, look)) return null;
  const t = brandTokens(brandHex, look as LookId);
  return {
    light: t.light,
    vars: {
      "--color-rail": t.rail,
      "--color-rail-active": t.railActive,
      "--color-magenta": t.brand,
      "--color-magenta-dark": t.link,
      "--color-magenta-ink": t.link,
      "--color-magenta-ink-hover": darkenFor(t.link, WHITE, 7),
    } as Record<string, string>,
  };
}

export const DEFAULT_BRAND = PANAMEER_DEFAULT_HUE;
