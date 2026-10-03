import { test, expect } from "@playwright/test";
import { headerContrast } from "./_contrast";

/**
 * ── ⚠⚠ THE PUBLIC HEADER READS IN BOTH SCHEMES (`P2-ALL-E773`) ─────────────
 *
 * ⚠ Before: dark mode measured **1.76:1** on `/status` and **1.75:1** on the home
 * page — a near-white bar with light-grey links. ⚠⚠ `/explore` measured **9.04:1**
 * in the same scheme, because it already wrapped this header in
 * `.marketing-surface`; the fix is that class, on the header itself.
 */
test.describe("P2-ALL-E773 — the marketing header", () => {
  const PAGES = ["/status", "/", "/explore", "/login"];

  for (const scheme of ["light", "dark"] as const) {
    test(`⚠⚠ nav links clear AA on every public page, ${scheme}`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await page.setViewportSize({ width: 1440, height: 1000 });
      for (const url of PAGES) {
        await page.goto(url, { waitUntil: "domcontentloaded" });
        const m = await headerContrast(page);
        expect(m, `${url} has a header with nav links`).not.toBeNull();
        console.log(
          `  ${scheme} ${url.padEnd(9)} bar=rgb(${m!.bar}) ink=rgb(${m!.ink}) contrast=${m!.ratio}`
        );
        expect(m!.ratio, `${url} in ${scheme} is below AA 4.5`).toBeGreaterThanOrEqual(4.5);
      }
    });
  }

  /**
   * ⚠⚠⚠ LIGHT MODE MUST NOT HAVE MOVED. The whole change is a no-op there — the
   * tokens it pins are already the light ones — and asserting the NUMBER rather
   * than "still passes" is what would catch a fix that quietly restyled the half
   * that was never broken.
   */
  test("⚠⚠⚠ light mode is unchanged, to the measured value", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.setViewportSize({ width: 1440, height: 1000 });
    for (const url of PAGES) {
      await page.goto(url, { waitUntil: "domcontentloaded" });
      const m = await headerContrast(page);
      expect(m!.ink, `${url} light ink`).toEqual([74, 70, 88]);
      expect(m!.ratio, `${url} light contrast`).toBe(9.04);
    }
  });

  /** ⚠ And the mechanism, so a future edit cannot quietly drop it. */
  test("⚠ the header carries the light pin itself", async ({ page }) => {
    await page.goto("/status", { waitUntil: "domcontentloaded" });
    await expect(page.locator("header.marketing-surface")).toHaveCount(1);
  });
});
