import sharp from "sharp";
import { contrast, isValidHex } from "@/lib/themeRecipes";
import { darkenFor } from "@/lib/dynamic-branding";

// WA-E005: Your Theme — read the header, accent and background colours (and the logo corner) from a screenshot of the
// company's Oracle home page, or take them as entered; once approved they replace the shell's tokens.
const hex = (r: number, g: number, b: number) => `#${[r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("")}`;
const q = (v: number) => Math.min(255, Math.round(v / 16) * 16);
function sat(r: number, g: number, b: number) { const mx = Math.max(r, g, b), mn = Math.min(r, g, b); return mx === 0 ? 0 : (mx - mn) / mx; }
const near = (a: number[], b: number[]) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]) < 60;

/** The most common (quantised) colour in a block of rows, optionally filtered. */
function mode(data: Buffer, w: number, y0: number, y1: number, keep: (p: number[]) => boolean = () => true): { rgb: number[]; share: number } | null {
  const counts = new Map<string, { n: number; sum: number[] }>();
  let total = 0;
  for (let y = y0; y < y1; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 3, p = [data[i], data[i + 1], data[i + 2]];
    total++;
    if (!keep(p)) continue;
    const k = `${q(p[0])},${q(p[1])},${q(p[2])}`;
    const c = counts.get(k) ?? { n: 0, sum: [0, 0, 0] };
    c.n++; c.sum[0] += p[0]; c.sum[1] += p[1]; c.sum[2] += p[2];
    counts.set(k, c);
  }
  const best = [...counts.values()].sort((a, b) => b.n - a.n)[0];
  return best ? { rgb: best.sum.map((v) => v / best.n), share: best.n / Math.max(1, total) } : null;
}

export type ExtractedTheme = { header: string; accent: string; background: string; logoPng: Buffer | null };
export async function extractTheme(input: Buffer): Promise<ExtractedTheme> {
  const W = 320;
  const { data, info } = await sharp(input).flatten({ background: "#ffffff" }).resize({ width: W }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const h = info.height;
  const headerRows = Math.max(4, Math.round(h * 0.08));
  const header = mode(data, W, 0, headerRows)?.rgb ?? [39, 35, 52];
  const background = mode(data, W, Math.round(h * 0.3), Math.round(h * 0.9))?.rgb ?? [250, 250, 250];
  // Accent: the most common strongly coloured pixel that isn't the header or the background.
  const accent = mode(data, W, 0, h, (p) => sat(p[0], p[1], p[2]) > 0.35 && p[0] + p[1] + p[2] > 90 && !near(p, header) && !near(p, background))?.rgb ?? header;
  // The logo corner: top-left of the header band, kept only when it isn't one flat colour.
  let logoPng: Buffer | null = null;
  const meta = await sharp(input).metadata();
  if (meta.width && meta.height) {
    const ch = Math.max(8, Math.round(meta.height * 0.08)), cw = Math.round(meta.width * 0.3);
    const crop = await sharp(input).extract({ left: 0, top: 0, width: cw, height: ch }).png().toBuffer();
    const st = await sharp(crop).stats();
    if (st.channels.slice(0, 3).some((c) => c.stdev > 18)) logoPng = crop;
  }
  return { header: hex(header[0], header[1], header[2]), accent: hex(accent[0], accent[1], accent[2]), background: hex(background[0], background[1], background[2]), logoPng };
}

type ThemeCols = { theme_header_hex: string | null; theme_accent_hex: string | null; theme_background_hex: string | null; theme_approved_at: Date | null };
/** The shell tokens for an approved theme (null = keep Panameer's / Dynamic Branding). */
export function yourThemeVars(c: ThemeCols | null | undefined): { vars: Record<string, string>; light: boolean } | null {
  if (!c?.theme_approved_at || !isValidHex(c.theme_header_hex) || !isValidHex(c.theme_accent_hex)) return null;
  const header = c.theme_header_hex.toLowerCase(), accent = c.theme_accent_hex.toLowerCase();
  const link = darkenFor(accent, "#ffffff");
  return {
    light: contrast(header, "#000000") > contrast(header, "#ffffff"),
    vars: {
      "--color-rail": header,
      "--color-rail-active": accent,
      "--color-magenta": accent,
      "--color-magenta-dark": link,
      "--color-magenta-ink": link,
      "--color-magenta-ink-hover": darkenFor(link, "#ffffff", 7),
      ...(isValidHex(c.theme_background_hex) ? { "--color-canvas": c.theme_background_hex.toLowerCase() } : {}),
    },
  };
}
