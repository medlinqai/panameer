import { test, expect } from "@playwright/test";

/** `/status` walk polish (Scott, 2026-10-02). 100% browser zoom is Playwright's
 *  default — `deviceScaleFactor` 1 and no page zoom is set anywhere. */
test("status walk — typeface, hero, counts, phase, journeys", async ({ page }) => {
  for (const [w, scheme] of [[1440, "light"], [1440, "dark"], [390, "light"], [390, "dark"]] as const) {
    await page.emulateMedia({ colorScheme: scheme });
    await page.setViewportSize({ width: w, height: 1100 });
    await page.goto("/status");

    /* ── no Comfortaa anywhere ── */
    const fonts = await page.evaluate(() =>
      Array.from(document.querySelectorAll<HTMLElement>("h1,h2,h3,p,span,li"))
        .map((el) => getComputedStyle(el).fontFamily)
        .filter((f) => /comfortaa/i.test(f))
    );
    expect(fonts, `no Comfortaa on /status at ${w} ${scheme}`).toEqual([]);

    const h1 = page.getByRole("heading", { level: 1 });
    const h1Font = await h1.evaluate((el) => getComputedStyle(el).fontFamily);
    const h1Weight = await h1.evaluate((el) => getComputedStyle(el).fontWeight);
    expect(h1Font, "h1 is Montserrat").toMatch(/montserrat/i);
    expect(h1Weight, "h1 is 800").toBe("800");

    /* ── the counts ── */
    const counts = await page.getByText(/\d+ done · \d+ moving/).first().innerText();
    const moving = Number(/(\d+) moving/.exec(counts)?.[1] ?? -1);

    /* ── the current phase ── */
    const phaseLine = await page.locator("text=/^0\\d\\/06$/").first().innerText();
    const phaseName = await page
      .locator("section")
      .filter({ hasText: /^0\d\/06/ })
      .first()
      .getByRole("heading", { level: 2 })
      .first()
      .innerText();

    /* ── the journeys grid ── */
    const grid = page.locator("ul").filter({ has: page.getByText("Register", { exact: true }) }).first();
    const cols = await grid.evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(" ").length);
    const cells = await grid.locator("li").count();
    /* ⚠⚠ THE CLASS IS `motion-safe:animate-pulse`, NOT `animate-pulse` — my first
       locator was `span.animate-pulse` and matched NOTHING, reporting 0 blinking
       dots on a page that renders them. ⚠ A false red of the test's own making;
       the escaped selector is what actually matches the variant. */
    const blink = await page.locator(String.raw`span.motion-safe\:animate-pulse`).count();

    const overflow = await page.evaluate(() => ({
      s: document.documentElement.scrollWidth,
      c: document.documentElement.clientWidth,
    }));

    console.log(
      `  ${w} ${scheme}: moving=${moving} · phase=${phaseLine} ${phaseName} · grid ${cols}-across, ${cells} cells · ` +
        `blinking ${blink} · scrollW ${overflow.s}/${overflow.c}`
    );

    expect(moving, "moving counts every In Progress task").toBe(27);
    expect(phaseName.trim(), "the admin-set phase wins").toBe("Build");
    expect(cells, "ten journeys").toBe(10);
    expect(cols, `grid is ${w >= 1000 ? 5 : 2}-across at ${w}`).toBe(w >= 1000 ? 5 : 2);
    expect(overflow.s, `no horizontal scroll at ${w}`).toBeLessThanOrEqual(overflow.c);

    await page.screenshot({ path: `e2e-support/shots/walk-${w}-${scheme}.png`, fullPage: false });
  }
});
