import { test, expect } from "@playwright/test";
import sharp from "sharp";
import { signIn } from "../e2e-shell/_auth";

/**
 * `P2-A1.1-E751` acceptance — no grey above, beside, or at the right end of the
 * tab strip, on the sampled pages, in both schemes.
 *
 * ⚠⚠ **IT SAMPLES RENDERED PIXELS, NOT `elementFromPoint`.** The band and the
 * fade are both `pointer-events-none`, and `elementFromPoint` SKIPS such
 * elements — so a DOM probe walks straight past the thing under test and reports
 * the shell behind it. That is an assertion its own fix cannot satisfy
 * (`decisions_2026-09-23.md` §8 rule 12). The screenshot is the ground truth.
 */

const PAGES = ["/profile", "/usage", "/community"];
const CANVAS = { light: "250,250,250", dark: "11,8,23" };
const SURFACE = { light: "255,255,255", dark: "23,17,40" };

async function pixel(png: Buffer, x: number, y: number) {
  const { data } = await sharp(png).extract({ left: x, top: y, width: 1, height: 1 }).raw().toBuffer({ resolveWithObject: true });
  return `${data[0]},${data[1]},${data[2]}`;
}

for (const scheme of ["light", "dark"] as const) {
  test(`E751 after — three points, ${scheme}`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    await page.setViewportSize({ width: 1280, height: 900 });
    await signIn(page);

    const lines: string[] = [];
    for (const path of PAGES) {
      await page.goto(path);
      const strip = page.getByTestId("page-tabs").first();
      await strip.waitFor({ state: "visible", timeout: 30_000 });
      const box = (await strip.boundingBox())!;
      const shot = await page.screenshot({ clip: { x: 0, y: 0, width: 1280, height: 400 } });

      const above = await pixel(shot, Math.round(box.x + box.width / 2), Math.round(box.y - 6));
      const left = await pixel(shot, Math.max(1, Math.round(box.x - 12)), Math.round(box.y + box.height / 2));
      const rightGutter = await pixel(shot, Math.min(1279, Math.round(box.x + box.width + 12)), Math.round(box.y + box.height / 2));
      // ⚠ the point the fade used to paint grey: 4px inside the strip's right end
      const fadeEnd = await pixel(shot, Math.round(box.x + box.width - 4), Math.round(box.y + box.height / 2));
      // ⚠ the hairline: scan the rows around the strip's bottom edge rather than
      // guessing one — `boundingBox` is fractional (y=134.75, h=44), so a rounded
      // "bottom - 1" lands INSIDE the strip, above the border. Scanning reports
      // where the line actually is instead of asserting a point that may miss it.
      const edge: string[] = [];
      for (let dy = -3; dy <= 3; dy++) {
        edge.push(`${dy >= 0 ? "+" : ""}${dy}:rgb(${await pixel(shot, Math.round(box.x + box.width / 2), Math.round(box.y + box.height) + dy)})`);
      }
      const hairline = edge.find((e) => !e.includes(SURFACE[scheme]) && !e.includes(CANVAS[scheme])) ?? "NONE";
      const belowLine = await pixel(shot, Math.round(box.x + box.width / 2), Math.round(box.y + box.height + 6));

      const overflow = await page.evaluate(() => ({
        scrollW: document.documentElement.scrollWidth,
        clientW: document.documentElement.clientWidth,
      }));

      const mark = (c: string) => (c === SURFACE[scheme] ? " ✓ surface" : c === CANVAS[scheme] ? " ⚠ CANVAS" : " · other");
      lines.push(
        `\n── ${path} (${scheme})  strip x=${Math.round(box.x)} w=${Math.round(box.width)} y=${Math.round(box.y)} h=${Math.round(box.height)}` +
          `\n   ABOVE strip  rgb(${above})${mark(above)}` +
          `\n   LEFT gutter  rgb(${left})${mark(left)}` +
          `\n   RIGHT gutter rgb(${rightGutter})${mark(rightGutter)}` +
          `\n   RIGHT end of strip (old fade block)  rgb(${fadeEnd})${mark(fadeEnd)}` +
          `\n   bottom edge  ${edge.join("  ")}` +
          `\n   hairline     ${hairline}  (a row that is neither surface nor canvas)` +
          `\n   below line   rgb(${belowLine})${mark(belowLine)}  (canvas is CORRECT here)` +
          `\n   doc scrollW/clientW ${overflow.scrollW}/${overflow.clientW}` +
          `${overflow.scrollW > overflow.clientW ? "  ⚠ H-OVERFLOW" : "  ✓ none"}`,
      );

      console.log(lines[lines.length - 1]);
      expect(above, `${path} above the strip is the surface`).toBe(SURFACE[scheme]);
      expect(left, `${path} left gutter is the surface`).toBe(SURFACE[scheme]);
      expect(rightGutter, `${path} right gutter is the surface`).toBe(SURFACE[scheme]);
      expect(fadeEnd, `${path} right end of the strip is the surface`).toBe(SURFACE[scheme]);
      expect(hairline, `${path} the hairline is still drawn under the strip`).not.toBe("NONE");
      expect(overflow.scrollW, `${path} no horizontal overflow from the w-screen band`).toBeLessThanOrEqual(overflow.clientW);
    }
    console.log(`\n===== E751 AFTER (${scheme}) =====${lines.join("")}\n`);
  });
}

test("E751 after — screenshots, light + dark, 1280 and 390", async ({ page }) => {
  await signIn(page);
  for (const [scheme, w, h] of [["light", 1280, 400], ["dark", 1280, 400], ["light", 390, 460], ["dark", 390, 460]] as const) {
    await page.emulateMedia({ colorScheme: scheme });
    await page.setViewportSize({ width: w, height: 844 });
    await page.goto("/profile");
    await page.getByTestId("page-tabs").first().waitFor({ state: "visible", timeout: 30_000 });
    await page.screenshot({ path: `e2e-e750/shots/after-${w}-${scheme}.png`, clip: { x: 0, y: 0, width: w, height: h } });
  }
  expect(true).toBe(true);
});
