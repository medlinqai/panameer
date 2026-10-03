import { test, expect } from "@playwright/test";

/**
 * ── ⚠⚠ THE HERO HEADLINE HOLDS ONE LINE (`P2-ALL-E776`) ────────────────────
 *
 * ⚠⚠⚠ **THE COLUMN DOES NOT GROW WITH THE VIEWPORT, AND THAT IS THE FINDING.**
 * Measured before the fix: the copy column is **686px at 1280, at 1440 and at
 * 1600** — the hero grid is capped at `max-w-[1040px]`, as all three containers
 * on the page are. ⚠ A viewport-based `clamp()` would have changed nothing above
 * ~1080px, which is where the brief expected the room to come from. The headline
 * is sized against the COLUMN instead.
 */
test.describe("P2-ALL-E776 — the hero headline", () => {
  /** ⚠ Reads the rendered line count, the font size and the column width. */
  async function measure(page: import("@playwright/test").Page, figure: string) {
    return page.evaluate((v) => {
      const fig = document.querySelector("h1")?.closest("section")?.querySelector(".tabular-nums");
      if (fig) fig.textContent = v;
      const el = document.querySelector("h1")!;
      const b = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      const lh = parseFloat(cs.lineHeight) || b.height;
      return {
        lines: Math.round(b.height / lh),
        fontSize: Math.round(parseFloat(cs.fontSize)),
        column: Math.round((el.parentElement as HTMLElement).getBoundingClientRect().width),
      };
    }, figure);
  }

  /**
   * ⚠⚠⚠ THE BRIEF'S ACCEPTANCE CRITERION, AND THE HARD ONE: a THREE-DIGIT figure
   * at 1280. That is the narrowest the column ever gets (558px) while still being
   * a two-column hero.
   */
  for (const w of [1024, 1280, 1440, 1600]) {
    test(`⚠⚠ one line at ${w}, with a two- and a three-digit figure`, async ({ page }) => {
      await page.setViewportSize({ width: w, height: 1000 });
      await page.goto("/status", { waitUntil: "domcontentloaded" });
      for (const figure of ["84", "100"]) {
        const m = await measure(page, figure);
        console.log(`  ${w}px "${figure}" -> ${m.lines} line(s), ${m.fontSize}px, column ${m.column}px`);
        expect(m.lines, `"${figure}" at ${w} wraps`).toBe(1);
      }
    });
  }

  /**
   * ⚠⚠ THE TYPE SCALES WITH THE COLUMN — asserted as a RELATIONSHIP, not as two
   * magic numbers, so it survives a copy change. A three-digit figure takes room
   * from the column, so the headline must be strictly smaller there.
   */
  test("⚠⚠ a wider column gets bigger type, and 52px is the ceiling", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/status", { waitUntil: "domcontentloaded" });
    const two = await measure(page, "84");
    await page.goto("/status", { waitUntil: "domcontentloaded" });
    const three = await measure(page, "100");
    expect(three.column, "a 3-digit figure narrows the column").toBeLessThan(two.column);
    expect(three.fontSize, "and the headline steps down with it").toBeLessThan(two.fontSize);
    expect(two.fontSize, "52px is the ceiling, never exceeded").toBeLessThanOrEqual(52);
  });

  /** ⚠ Phone: one column, the floor applies, and wrapping there is correct. */
  test("⚠ phone still fits its width", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 900 });
    await page.goto("/status", { waitUntil: "domcontentloaded" });
    const o = await page.evaluate(() => ({
      s: document.documentElement.scrollWidth,
      c: document.documentElement.clientWidth,
    }));
    expect(o.s).toBeLessThanOrEqual(o.c);
  });
});
