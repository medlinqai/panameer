import { test, expect } from "@playwright/test";
import sharp from "sharp";
import { signIn } from "../e2e-shell/_auth";
/** `E751` — print the rendered pixel rows across the strip's bottom edge, so the
 * hairline question is answered by comparison (before vs after) not by theory. */
test("E751 rows at the bottom edge", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await signIn(page);
  await page.goto("/profile");
  const strip = page.getByTestId("page-tabs").first();
  await strip.waitFor({ state: "visible" });
  const box = (await strip.boundingBox())!;
  const shot = await page.screenshot({ clip: { x: 0, y: 0, width: 1280, height: 400 } });
  const x = Math.round(box.x + box.width / 2);
  const out: string[] = [];
  for (let y = Math.floor(box.y + box.height) - 4; y <= Math.floor(box.y + box.height) + 3; y++) {
    const { data } = await sharp(shot).extract({ left: x, top: y, width: 1, height: 1 }).raw().toBuffer({ resolveWithObject: true });
    out.push(`y=${y}: rgb(${data[0]},${data[1]},${data[2]})`);
  }
  console.log(`\n===== E751 ROWS (strip bottom = ${box.y + box.height}) =====\n` + out.join("\n") + "\n");
  expect(true).toBe(true);
});
