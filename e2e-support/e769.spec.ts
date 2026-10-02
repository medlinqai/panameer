import { test, expect } from "@playwright/test";

/**
 * ── ⚠⚠ THE BUILD LINE DRAWS WITH THE DATES IT HAS (`P2-ALL-E769`) ──────────
 *
 * ⚠ Before this, one missing phase date hid four real ones: the page printed
 * `Dates coming soon` while four of six phases were dated and a release target
 * was set.
 *
 * ⚠⚠⚠ **EVERY EXPECTATION IS DERIVED FROM `/api/status`, NOT HARD-CODED.** Scott
 * edits these dates in the admin; a test that pins "4 dated, 2 undated" would go
 * red the day he sets another one, and a test that goes red for being right is a
 * test people switch off (ruling 10). ⚠ It also writes nothing, so there is
 * nothing to restore.
 */
type Payload = {
  phases: { name: string; start: string | null; end: string | null; current: boolean }[];
  releases: { code: string | null; date: string | null }[];
};

test.describe("P2-ALL-E769 — the Build Line", () => {
  test("⚠⚠⚠ it draws while some phases are undated, and names the ones that are", async ({
    page,
    request,
  }) => {
    const body = (await (await request.get("/api/status")).json()) as Payload;
    const dated = body.phases.filter((p) => p.start);
    const undated = body.phases.filter((p) => !p.start);
    /* ⚠ The whole point only exists in the partial case; say so rather than pass
       silently against a fully-dated plan. */
    test.skip(dated.length === 0, "no phase has a start date — the degraded line is correct");

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/status");
    const line = page.locator('section[aria-label="Build line"]');
    await expect(line).toBeVisible();
    await expect(line.getByText("Dates coming soon")).toHaveCount(0);

    /* ⚠⚠ Each DISTINCT start date appears once — phases sharing a day share a
       marker, because moving one of them would put it on a date it does not have. */
    /* ⚠ Scoped to the AXIS, not the section: the same marks also render as a
       phone list in the DOM (hidden by CSS at this width), so an unscoped count
       finds each date twice and reads as a duplicate that is not one. */
    const axis = line.locator("div.relative.h-10");
    const distinct = [...new Set(dated.map((p) => p.start as string))];
    for (const d of distinct) {
      await expect(axis.getByText(d, { exact: true }), `${d} is on the axis once`).toHaveCount(1);
    }
    expect(distinct.length, "one marker per distinct start date").toBe(
      await axis.locator("> span").count(),
    );

    if (undated.length > 0) {
      const tail = line.getByText(/dates to come/);
      await expect(tail).toBeVisible();
      /* ⚠⚠⚠ NAMED, NOT OMITTED. A reader who knows the method counts six phases;
         silently dropping two reads as "there are four" — a quieter lie than a
         wrong date. */
      for (const p of undated) await expect(tail).toContainText(p.name);
    }
    /* ⚠ And an undated phase is NOT placed on the axis. */
    const labels = await axis.locator("> span").allInnerTexts();
    for (const p of undated) {
      expect(labels.join("|"), `${p.name} must not be positioned`).not.toContain(p.name);
    }
  });

  test("⚠⚠ a release with a target date is flagged; one without is not", async ({ page, request }) => {
    const body = (await (await request.get("/api/status")).json()) as Payload;
    const withDate = body.releases.filter((r) => r.date);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/status");
    const flags = page.locator('section[aria-label="Build line"] span.rotate-45');
    await expect(flags, "one flag per dated release").toHaveCount(withDate.length);
  });

  /**
   * ⚠⚠⚠ MEASURED DEFECTS, BOTH OF THEM, AND BOTH ON THE LIVE PAGE: a centred
   * label at 0% printed `n` for `Design`, and `Prove` at 100% ran off the right
   * edge. At 390 two labels 91px apart printed over each other.
   */
  test("⚠⚠⚠ no label escapes the line, at either width", async ({ page }) => {
    for (const w of [1440, 390]) {
      await page.setViewportSize({ width: w, height: 900 });
      await page.goto("/status");
      const out = await page.evaluate(() => {
        const sec = document.querySelector('section[aria-label="Build line"]') as HTMLElement | null;
        if (!sec) return ["no build line"];
        const r = sec.getBoundingClientRect();
        return Array.from(sec.querySelectorAll<HTMLElement>("span, li"))
          .map((el) => ({ el, b: el.getBoundingClientRect() }))
          .filter((x) => x.b.width > 0 && (x.b.left < r.left - 0.5 || x.b.right > r.right + 0.5))
          .map((x) => `${(x.el.textContent || "").trim().slice(0, 24)} @${Math.round(x.b.left)}`);
      });
      expect(out, `labels outside the line at ${w}`).toEqual([]);
    }
  });
});
