import { test, expect } from "@playwright/test";

/**
 * ── ⚠⚠ NO COMFORTAA ON THE MASKED SURFACES (`P2-A1.1-E771`) ────────────────
 *
 * ⚠ Scott, 2026-10-02: the masked preview's headline renders in Comfortaa;
 * Montserrat, like `/status`.
 *
 * ⚠⚠⚠ **MEASURED BY COMPUTED STYLE, NEVER BY GREP.** `E766` nearly reported a
 * defect that did not exist because a class-name selector matched nothing; a font
 * is only knowable from the rendered page.
 *
 * ⚠⚠ **AND THE FOOTER IS DELIBERATELY EXCLUDED.** `MarketingFooter`'s video
 * headings are Comfortaa on nearly every page in the app — that is `E772`, logged
 * and NOT built in this run. Asserting zero Comfortaa anywhere would be asserting
 * a change Scott ruled out of scope, and a gate that cannot go green is a gate
 * somebody deletes (ruling 10).
 */
test.describe("P2-A1.1-E771 — the masked surfaces are Montserrat", () => {
  test("⚠⚠⚠ zero Comfortaa outside the footer, on both surfaces", async ({ page }) => {
    await page.goto("/explore", { waitUntil: "domcontentloaded" });
    const href = await page.locator('a[href^="/providers/"]').first().getAttribute("href");
    expect(href, "no provider card on /explore — this gate would prove nothing").toBeTruthy();

    for (const [w, scheme] of [[1440, "light"], [390, "dark"]] as const) {
      await page.emulateMedia({ colorScheme: scheme });
      await page.setViewportSize({ width: w, height: 1000 });
      for (const url of [href as string, "/explore"]) {
        await page.goto(url, { waitUntil: "domcontentloaded" });
        const m = await page.evaluate(() => {
          const all = Array.from(
            document.querySelectorAll<HTMLElement>("h1,h2,h3,h4,p,span,li,a,b,strong"),
          ).filter((el) => /comfortaa/i.test(getComputedStyle(el).fontFamily));
          const outside = all.filter((el) => !el.closest("footer"));
          return {
            page: outside.map((el) => `${el.tagName}:${(el.textContent || "").trim().slice(0, 30)}`),
            footer: all.length - outside.length,
            /* ⚠⚠ THE POSITIVE HALF: the h1 must actually BE Montserrat. Counting
               absences alone would pass against a page that failed to render. */
            h1: (() => {
              const h = document.querySelector("h1");
              return h ? getComputedStyle(h).fontFamily : null;
            })(),
          };
        });
        expect(m.page, `Comfortaa outside the footer on ${url} at ${w} ${scheme}`).toEqual([]);
        expect(m.h1, `the h1 on ${url} is not Montserrat`).toMatch(/montserrat/i);
        console.log(`  ${w} ${scheme} ${url} — page 0, footer ${m.footer} (E772), h1 Montserrat`);
      }
    }
  });

  /**
   * ⚠⚠ THE SCOPE IS PART OF THE CLAIM (ruling 86d). `.masked-surface` must not
   * have been added to a page it does not belong on — the whole reason it is a
   * new class rather than a line inside `.marketing-surface` is that the latter
   * would re-case every public page.
   */
  test("⚠⚠ the class is on the masked surfaces and nowhere else", async ({ page }) => {
    for (const [url, expected] of [
      ["/explore", 1],
      ["/", 0],
      ["/work", 0],
    ] as const) {
      await page.goto(url, { waitUntil: "domcontentloaded" });
      const n = await page.locator(".masked-surface").count();
      expect(n, `${url} masked-surface count`).toBe(expected);
    }
  });
});
