import { test, expect } from "@playwright/test";

// /status phase card: shots at 1440 / 390, light + dark; the card's figures are real.
for (const scheme of ["light", "dark"] as const)
  for (const w of [1440, 390])
    test(`status phase card ${w} ${scheme}`, async ({ browser }) => {
      const ctx = await browser.newContext({ viewport: { width: w, height: 900 }, colorScheme: scheme });
      const page = await ctx.newPage();
      await page.goto("/status", { waitUntil: "domcontentloaded" });
      const card = page.getByTestId("phase-card");
      await expect(card).toBeVisible({ timeout: 30_000 });
      console.log(`${w} ${scheme}: ${(await card.innerText()).replace(/\s+/g, " ")}`);
      await card.screenshot({ path: `e2e-r1/.artifacts/status-card-${w}-${scheme}.png` });
      await page.screenshot({ path: `e2e-r1/.artifacts/status-hero-${w}-${scheme}.png` });
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(w);
      await ctx.close();
    });
