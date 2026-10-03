import sharp from "sharp";
import type { Page } from "@playwright/test";

/**
 * ── ⚠⚠⚠ CONTRAST IS MEASURED FROM RENDERED PIXELS, NOT FROM TOKENS ─────────
 *
 * ⚠ **THE FIRST ATTEMPT AT THIS COMPUTED GARBAGE AND LOOKED PLAUSIBLE.** The
 * header's background resolves to `oklab(0.999994 0.0000455678 …)`, and a regex
 * that pulls "the first three numbers" out of a colour string reads those as
 * RGB 0–255 — producing a near-black luminance and a confident, wrong ratio that
 * reported light mode as the broken one.
 *
 * ⚠⚠ **AND A COMPUTED COLOUR IS THE WRONG SOURCE ANYWAY HERE:** the bar is
 * `bg-white/90`, so what a person actually sees is white composited over whatever
 * the page behind it is. Only the painted pixel knows that.
 */
const lum = ([r, g, b]: number[]) => {
  const f = (v: number) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};

export function ratio(a: number[], b: number[]): number {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return +((x + 0.05) / (y + 0.05)).toFixed(2);
}

/**
 * ⚠ Samples the bar beside the content and the DARKEST pixel inside the first
 * nav link's box — the darkest pixel is the glyph ink, which is what a reader
 * actually has to resolve against the bar.
 */
export async function headerContrast(page: Page, width = 1440) {
  const info = await page.evaluate(() => {
    const h = document.querySelector("header");
    if (!h) return null;
    const a = h.querySelector("nav a");
    if (!a) return null;
    const hb = h.getBoundingClientRect();
    const ab = a.getBoundingClientRect();
    return {
      bar: { x: Math.round(hb.left + 8), y: Math.round(hb.top + hb.height / 2) },
      txt: { x: Math.round(ab.left), y: Math.round(ab.top), w: Math.ceil(ab.width), h: Math.ceil(ab.height) },
    };
  });
  if (!info) return null;
  const png = await page.screenshot({ clip: { x: 0, y: 0, width, height: 120 } });
  const { data, info: meta } = await sharp(png).raw().toBuffer({ resolveWithObject: true });
  const px = (x: number, y: number) => {
    const i = (y * meta.width + x) * meta.channels;
    return [data[i], data[i + 1], data[i + 2]];
  };
  const bar = px(info.bar.x, Math.min(info.bar.y, 119));
  let ink = [255, 255, 255];
  let best = Infinity;
  for (let y = info.txt.y; y < Math.min(info.txt.y + info.txt.h, 120); y++) {
    for (let x = info.txt.x; x < Math.min(info.txt.x + info.txt.w, width); x++) {
      const p = px(x, y);
      const l = lum(p);
      if (l < best) {
        best = l;
        ink = p;
      }
    }
  }
  return { bar, ink, ratio: ratio(ink, bar) };
}
