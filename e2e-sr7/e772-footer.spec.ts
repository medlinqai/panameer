import { test, expect } from "@playwright/test";

/**
 * ── ⚠⚠ THE FOOTER'S HEADINGS ARE MONTSERRAT (`P2-ALL-E772`) ────────────────
 *
 * ⚠ **MEASURED: these three were the LAST Comfortaa on the masked surfaces** — 6
 * of the 10 Comfortaa elements on a masked profile and 3 of the 16 on `/explore`.
 * `AppShell` and `MarketingShell` both render this footer, so it reaches nearly
 * every page in the app.
 *
 * ⚠⚠⚠ **IT WAS ONE CLASS, NOT A CSS RULE.** When `E772` was logged I assumed
 * these headings inherited the global `h1–h3 → --font-display` rule and that
 * fixing them meant touching the `@layer base` fence. They did not — the class was
 * on the element — so the fence is untouched and nothing outside this footer
 * moved. ⚠ That is asserted below, because "nothing else moved" is the half of
 * this change that could go wrong silently.
 */
test.describe("P2-ALL-E772 — the marketing footer", () => {
  const PAGES = ["/", "/explore", "/training"];

  test("⚠⚠ no Comfortaa left in the footer, on any page that renders it", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1100 });
    for (const url of PAGES) {
      await page.goto(url, { waitUntil: "domcontentloaded" });
      const m = await page.evaluate(() => {
        const f = document.querySelector("footer");
        if (!f) return null;
        const hs = [...f.querySelectorAll("h1,h2,h3,h4")];
        return {
          total: hs.length,
          comfortaa: hs.filter((h) => /comfortaa/i.test(getComputedStyle(h).fontFamily)).length,
          montserrat: hs.filter((h) => /montserrat/i.test(getComputedStyle(h).fontFamily)).length,
        };
      });
      expect(m, `${url} has a footer`).not.toBeNull();
      console.log(`  ${url.padEnd(10)} footer headings ${m!.total} · Comfortaa ${m!.comfortaa} · Montserrat ${m!.montserrat}`);
      expect(m!.comfortaa, `Comfortaa still in the footer on ${url}`).toBe(0);
      /* ⚠⚠ THE POSITIVE HALF. Counting an absence alone would pass against a
         footer that stopped rendering its headings at all. */
      expect(m!.montserrat, `${url} lost its footer headings`).toBe(m!.total);
      expect(m!.total, "the video columns are gone, not restyled").toBe(3);
    }
  });

  /**
   * ⚠⚠⚠ THE FENCE IS UNTOUCHED. The global rule still sends `h1–h3` to the
   * display face everywhere it was not deliberately overridden — this change must
   * not have become an app-wide re-case by accident.
   */
  test("⚠⚠⚠ the global display-face rule still applies outside the footer", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/training", { waitUntil: "domcontentloaded" });
    const outside = await page.evaluate(() => {
      const hs = [...document.querySelectorAll("h1,h2,h3")].filter((h) => !h.closest("footer"));
      return {
        n: hs.length,
        comfortaa: hs.filter((h) => /comfortaa/i.test(getComputedStyle(h).fontFamily)).length,
      };
    });
    console.log(`  /training outside the footer: ${outside.comfortaa}/${outside.n} still Comfortaa`);
    expect(outside.n, "no headings outside the footer to check").toBeGreaterThan(0);
    expect(outside.comfortaa, "the global rule stopped applying — this became an app-wide re-case")
      .toBeGreaterThan(0);
  });
});
