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

// Logo palette: the logo's own colors — up to 6, ordered by area. Shares are measured against the logo's
// colored pixels only (not the white/black/transparent background), so thin bars on a wide wordmark count.
// Sampled at 320px on the long side; colors within ~28 RGB units merge; under 3% of the colored area is a speck.
export async function extractLogoPalette(buffer: Buffer, max = 6): Promise<string[]> {
  let data: Buffer;
  let ch: number;
  try {
    const out = await sharp(buffer, { density: 144 })
      .resize(320, 320, { fit: "inside", kernel: "nearest" })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
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
  const colored = groups.filter((c) => !c.edge).sort((a, b) => b.n - a.n);
  const coloredTotal = colored.reduce((a, c) => a + c.n, 0);
  // Anti-aliased edges are blends of a kept color with the background (or with another kept color):
  // a color within ~22 units of such a line is a blend, not a brand color.
  type V = [number, number, number];
  const avg = (c: C): V => [c.r / c.n, c.g / c.n, c.b / c.n];
  const toSeg = (p: V, a: V, b: V) => {
    const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const len = ab[0] ** 2 + ab[1] ** 2 + ab[2] ** 2 || 1;
    const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * ab[0] + (p[1] - a[1]) * ab[1] + (p[2] - a[2]) * ab[2]) / len));
    return Math.hypot(p[0] - (a[0] + t * ab[0]), p[1] - (a[1] + t * ab[1]), p[2] - (a[2] + t * ab[2]));
  };
  const ends: V[] = [[255, 255, 255], [0, 0, 0]];
  const kept: V[] = [];
  const real: C[] = [];
  for (const c of colored) {
    if (c.n / (coloredTotal || 1) < 0.03) continue;
    const p = avg(c);
    const blend = kept.some((k) => [...ends, ...kept].some((e) => e !== k && toSeg(p, k, e) < 22));
    if (blend) continue;
    kept.push(p);
    real.push(c);
  }
  const pick = (real.length ? real : groups.sort((a, b) => b.n - a.n)).slice(0, max);
  const hex = (v: number) => Math.round(v).toString(16).padStart(2, "0");
  return pick.map((c) => `#${hex(c.r / c.n)}${hex(c.g / c.n)}${hex(c.b / c.n)}`);
}
