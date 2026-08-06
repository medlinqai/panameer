import sharp from "sharp";
import { hslToHex } from "./themeRecipes";

/**
 * Dominant brand colours from a logo (E204, ported from Medlinq). Server-side:
 * `sharp` is a native module and never reaches the browser.
 *
 * Downsample → read raw RGBA → discard the pixels that are not brand colour →
 * bucket what's left by hue → return the strongest two or three as candidates.
 *
 * THE DISCARDS ARE THE ALGORITHM. A logo is mostly transparent padding, white
 * paper, black type and grey rules, and all four would dominate a naive
 * frequency count — you would extract "white" from every logo ever made. So:
 * transparent pixels go, near-white and near-black go, and anything under 18%
 * saturation goes, because a grey is not a brand colour however much of it
 * there is. Buckets are weighted BY saturation, so twenty vivid pixels outrank
 * two hundred washed-out ones.
 *
 * IT SUGGESTS, IT DOES NOT DECIDE. The output is candidates the tenant confirms.
 * Guessing wrong is cheap when the guess is a swatch to click and expensive when
 * it silently repaints their console.
 */

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255;
  g /= 255;
  b /= 255;
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

export async function extractLogoHues(buffer: Buffer, max = 3): Promise<string[]> {
  let data: Buffer;
  let ch: number;
  try {
    const out = await sharp(buffer)
      .resize(48, 48, { fit: "inside" })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    data = out.data;
    ch = out.info.channels;
  } catch {
    // A file sharp cannot decode is a candidate-less logo, not an error the
    // branding page should crash on — the tenant types a hex instead.
    return [];
  }

  type Bucket = { weight: number; sumH: number; sumS: number; sumL: number; n: number };
  const buckets = new Map<number, Bucket>();
  for (let i = 0; i < data.length; i += ch) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = ch === 4 ? data[i + 3] : 255;
    if (a < 128) continue;
    const { h, s, l } = rgbToHsl(r, g, b);
    if (l > 92 || l < 8) continue;
    if (s < 18) continue;
    const key = Math.round(h / 20) * 20;
    const wt = s / 100;
    const cur = buckets.get(key) ?? { weight: 0, sumH: 0, sumS: 0, sumL: 0, n: 0 };
    cur.weight += wt;
    cur.sumH += h;
    cur.sumS += s;
    cur.sumL += l;
    cur.n += 1;
    buckets.set(key, cur);
  }

  const ranked = [...buckets.values()].sort((a, b) => b.weight - a.weight).slice(0, max);
  /*
    The returned candidate is CLAMPED, not the raw average: a logo's own colour
    may be too pale or too dark to work as an accent, and this is a suggestion
    for a UI token rather than a colour-match. The hue — the part that carries
    the brand — is preserved exactly.
  */
  return ranked.map((bk) => {
    const h = bk.sumH / bk.n;
    const s = Math.max(40, Math.min(85, bk.sumS / bk.n));
    const l = Math.max(38, Math.min(58, bk.sumL / bk.n));
    return hslToHex(h, s, l);
  });
}
