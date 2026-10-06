import sharp from "sharp";
import { hslToHex } from "./themeRecipes";

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
  return ranked.map((bk) => {
    const h = bk.sumH / bk.n;
    const s = Math.max(40, Math.min(85, bk.sumS / bk.n));
    const l = Math.max(38, Math.min(58, bk.sumL / bk.n));
    return hslToHex(h, s, l);
  });
}

// Logo palette (2026-10-05): the logo's own colors — up to 6, ordered by area. White/near-white and near-black
// are ignored unless nothing else is there. Colors closer than ~28 RGB units merge into one.
export async function extractLogoPalette(buffer: Buffer, max = 6): Promise<string[]> {
  let data: Buffer;
  let ch: number;
  try {
    const out = await sharp(buffer, { density: 144 }).resize(96, 96, { fit: "inside", kernel: "nearest" }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    data = out.data;
    ch = out.info.channels;
  } catch {
    return [];
  }
  type C = { r: number; g: number; b: number; n: number; edge: boolean };
  const groups: C[] = [];
  for (let i = 0; i < data.length; i += ch) {
    if (ch === 4 && data[i + 3] < 128) continue;
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const { l } = rgbToHsl(r, g, b);
    const edge = l > 94 || l < 6;
    const hit = groups.find((c) => c.edge === edge && Math.hypot(c.r / c.n - r, c.g / c.n - g, c.b / c.n - b) < 28);
    if (hit) {
      hit.r += r; hit.g += g; hit.b += b; hit.n++;
    } else groups.push({ r, g, b, n: 1, edge });
  }
  const total = groups.reduce((a, c) => a + c.n, 0) || 1;
  // Anti-aliased edges make thin blends; anything under 1.5% of the logo isn't a brand color.
  const real = groups.filter((c) => !c.edge && c.n / total >= 0.015);
  const pick = (real.length ? real : groups).sort((a, b) => b.n - a.n).slice(0, max);
  const hex = (v: number) => Math.round(v).toString(16).padStart(2, "0");
  return pick.map((c) => `#${hex(c.r / c.n)}${hex(c.g / c.n)}${hex(c.b / c.n)}`);
}
