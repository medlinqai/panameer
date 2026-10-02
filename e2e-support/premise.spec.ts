import { test, expect } from "@playwright/test";
import { signIn } from "../e2e-shell/_auth";

/** `P2-A1.1-E762` premise: the owner preview bar in dark mode. READ-ONLY. */
test("E762 premise — the preview bar's computed colour", async ({ page }) => {
  await signIn(page);
  await page.goto("/profile");
  const link = page.getByRole("link", { name: /How Others See My Profile/i }).first();
  await expect(link).toBeVisible();
  const href = await link.getAttribute("href");
  console.log(`\n  preview href: ${href}`);

  for (const scheme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: scheme });
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(href!);
    const bar = page.locator("div.bg-bg-soft").first();
    await bar.waitFor({ state: "visible", timeout: 20_000 });
    const bg = await bar.evaluate((el) => getComputedStyle(el).backgroundColor);
    const fg = await bar.evaluate((el) => getComputedStyle(el).color);
    const page_bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    console.log(`  ${scheme}: bar ${bg} · text ${fg} · page ${page_bg}`);
    const box = (await bar.boundingBox())!;
    await page.screenshot({
      path: `e2e-support/shots/before-preview-1280-${scheme}.png`,
      clip: { x: 0, y: Math.max(0, box.y - 8), width: 1280, height: Math.min(160, box.height + 60) },
    });
  }
  expect(true).toBe(true);
});
