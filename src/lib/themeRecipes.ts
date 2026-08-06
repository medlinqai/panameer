/**
 * Tenant theming as RECIPES, not colour pickers (E204, ported from Medlinq).
 *
 * A theme here is a designed STRUCTURE. Each recipe fixes saturation and
 * lightness for every surface and leaves exactly one variable: the brand HUE,
 * taken from the tenant's logo. Same recipe + different hue = structurally
 * identical, brand-distinct.
 *
 * WHY THAT MATTERS MORE THAN IT SOUNDS. The usual version of this feature is a
 * colour picker, and a colour picker guarantees that some tenant eventually
 * ships pale yellow text on white and blames the product. Here the quality bar
 * lives in code: S and L are clamped per surface, the accent's text colour is
 * derived from luminance, and there is no input that produces an unreadable
 * combination. The tenant picks a hue and a structure; they cannot pick a
 * contrast failure.
 *
 * CLIENT-SAFE — no prisma, no node built-ins. The server resolver and the
 * gallery preview both import it, which is the point: what you see in the
 * picker is computed by the same function that renders the app.
 */

export type ThemeTokens = {
  /** Sidebar / nav. */
  surfaceDark: string;
  /** Page canvas. */
  surfaceLight: string;
  /** Accent: buttons, active nav, links. */
  brandPrimary: string;
  /** Auto white/near-black by luminance — never chosen by hand. */
  brandPrimaryText: string;
};

type Band = { s: number; l: number };
export type Recipe = {
  id: string;
  label: string;
  blurb: string;
  sidebar: Band;
  canvas: Band;
  accent: Band;
};

export const RECIPES: Recipe[] = [
  {
    id: "deep",
    label: "Deep",
    blurb: "Dark saturated sidebar, warm canvas, bold accent.",
    sidebar: { s: 45, l: 16 },
    canvas: { s: 12, l: 97 },
    accent: { s: 65, l: 42 },
  },
  {
    id: "soft",
    label: "Soft",
    blurb: "Lighter tinted sidebar, bright canvas, muted accent.",
    sidebar: { s: 30, l: 28 },
    canvas: { s: 20, l: 98 },
    accent: { s: 58, l: 48 },
  },
  {
    id: "mono",
    label: "Mono",
    blurb: "Near-neutral surfaces, a single accent pop.",
    sidebar: { s: 10, l: 18 },
    canvas: { s: 4, l: 98 },
    accent: { s: 70, l: 45 },
  },
  {
    id: "vivid",
    label: "Vivid",
    blurb: "Deep saturated sidebar, vivid high-contrast accent.",
    sidebar: { s: 55, l: 14 },
    canvas: { s: 8, l: 99 },
    accent: { s: 80, l: 50 },
  },
];

export const DEFAULT_RECIPE = "deep";
/** Panameer magenta — the default brand hue when a company hasn't set one. */
export const PANAMEER_DEFAULT_HUE = "#d127d0";
export const RECIPE_IDS = RECIPES.map((r) => r.id);

export function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const m = /^#?([0-9a-fA-F]{6})$/.exec(hex);
  if (!m) return { h: 0, s: 0, l: 0 };
  const n = parseInt(m[1], 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h /= 6;
  }
  return { h: h * 360, s: s * 100, l: l * 100 };
}

export function hslToHex(h: number, s: number, l: number): string {
  h = ((h % 360) + 360) % 360;
  s = Math.max(0, Math.min(100, s)) / 100;
  l = Math.max(0, Math.min(100, l)) / 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) {
    r = c;
    g = x;
  } else if (h < 120) {
    r = x;
    g = c;
  } else if (h < 180) {
    g = c;
    b = x;
  } else if (h < 240) {
    g = x;
    b = c;
  } else if (h < 300) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }
  const to = (v: number) =>
    Math.round((v + m) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}

function srgbToLin(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
  const n = parseInt(hex.replace("#", ""), 16);
  return (
    0.2126 * srgbToLin((n >> 16) & 255) +
    0.7152 * srgbToLin((n >> 8) & 255) +
    0.0722 * srgbToLin(n & 255)
  );
}

export function contrast(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

const TEXT_DARK = "#1f2937";

/** White or near-black on this background, whichever contrasts more. */
export function autoTextColor(bg: string): string {
  return contrast(bg, TEXT_DARK) >= contrast(bg, "#ffffff") ? TEXT_DARK : "#ffffff";
}

export function themeFromHue(brandHex: string, recipeId: string): ThemeTokens {
  const r = RECIPES.find((x) => x.id === recipeId) ?? RECIPES[0];
  const { h } = hexToHsl(brandHex);
  const surfaceDark = hslToHex(h, r.sidebar.s, r.sidebar.l);
  const surfaceLight = hslToHex(h, r.canvas.s, r.canvas.l);
  const brandPrimary = hslToHex(h, r.accent.s, r.accent.l);
  return {
    surfaceDark,
    surfaceLight,
    brandPrimary,
    brandPrimaryText: autoTextColor(brandPrimary),
  };
}

export function isValidHex(hex: string | null | undefined): hex is string {
  return !!hex && /^#[0-9a-fA-F]{6}$/.test(hex);
}

/**
 * The tokens for a company, with the Panameer default when it hasn't themed.
 *
 * One place resolves this, so "un-themed looks exactly like it did before" is a
 * property of the system rather than something every caller remembers.
 */
export function resolveTheme(
  brandHue: string | null | undefined,
  recipeId: string | null | undefined
): ThemeTokens {
  const hue = isValidHex(brandHue) ? brandHue : PANAMEER_DEFAULT_HUE;
  const recipe = RECIPE_IDS.includes(recipeId ?? "") ? (recipeId as string) : DEFAULT_RECIPE;
  return themeFromHue(hue, recipe);
}
