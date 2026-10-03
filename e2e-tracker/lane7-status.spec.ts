import { test, expect } from "@playwright/test";

/**
 * `P2-ALL-E757` — the public page, built to mockup v5.
 *
 * ── ⚠⚠⚠ RETARGETED BY `E785`, NOT WEAKENED ──────────────────────────────────
 *
 * ⚠ `/status` stopped rendering the AIM journey grid and the current-phase stage
 * list; it renders the Build Plan. ⚠⚠ So the two assertions whose SUBJECT left
 * the page were re-pointed at the sections that replaced them — the plan
 * timeline and its accordions — and **every other assertion is byte-unchanged**:
 * the hero heading, the three surviving headings, the inverted `Join the Beta`
 * guard, the footer, the no-NaN check, the no-horizontal-scroll check and all
 * four screenshots.
 * ⚠⚠ This is `check:rollup`'s case, not `check:cert-skills`' — the RULING moved,
 * so the gate follows it. The journey-copy guard is kept and re-pointed rather
 * than dropped, because the thing it protected against (a section rendering
 * blank rows) is just as possible in the new one.
 */
test("E757 — /status renders the mockup's sections and screenshots", async ({ page }) => {
  for (const [w, scheme] of [[1440, "light"], [1440, "dark"], [390, "light"], [390, "dark"]] as const) {
    await page.emulateMedia({ colorScheme: scheme });
    await page.setViewportSize({ width: w, height: 1000 });
    await page.goto("/status");

    await expect(page.getByRole("heading", { name: "Watch Panameer get built!" })).toBeVisible();
    /* ⚠ SUPERSEDED, quoted not deleted (`E164`) — "Ten parts of one platform."
       was the AIM journey grid's heading and that section is gone:
       //   for (const h of ["Ten parts of one platform.", "What changed, day by day.", "Found a problem? Tell us.", "Releases"]) { */
    for (const h of ["The plan, phase by phase", "What changed, day by day.", "Found a problem? Tell us.", "Releases"]) {
      await expect(page.getByRole("heading", { name: h })).toBeVisible();
    }
    /* ⚠⚠ `Join the Beta` WAS REMOVED BY RULING (`P2-ALL-E764`) — the close band
       was a sales close on a page whose job is to report. ⚠ The assertion is
       INVERTED rather than deleted, so the band cannot quietly come back, and the
       page's real ending — the minimal footer — is asserted in its place.
       ⚠ SUPERSEDED, quoted not deleted (`E164`):
       //   await expect(page.getByRole("link", { name: "Join the Beta" })).toBeVisible(); */
    await expect(page.getByRole("link", { name: "Join the Beta" })).toHaveCount(0);
    await expect(page.locator("footer").last()).toContainText("Panameer Inc");

    /*
      ⚠⚠ THE PLAN SECTION REPLACES THE TEN-JOURNEY GRID. The old assertion was a
      fixed count of 10 because the catalog was fixed; a plan is whatever Scott
      typed, so a count is the wrong shape — what must hold is that the section
      exists and has at least one row in it.
      ⚠ SUPERSEDED, quoted not deleted (`E164`):
      //   const journeySection = page.locator("section", {
      //     has: page.getByRole("heading", { name: "Ten parts of one platform." }),
      //   });
      //   await expect(journeySection.locator("li")).toHaveCount(10);
    */
    const planSection = page.locator("section", {
      has: page.getByRole("heading", { name: "The plan, phase by phase" }),
    });
    await expect(planSection.locator("details")).not.toHaveCount(0);

    /* ⚠ "Day N" must be absent while Define has no start date — no NaN. */
    const eyebrow = await page.locator("text=Building in the open").first().innerText();
    expect(eyebrow, "Day N must not print NaN").not.toMatch(/NaN/);

    const o = await page.evaluate(() => ({
      s: document.documentElement.scrollWidth,
      c: document.documentElement.clientWidth,
    }));
    expect(o.s, `no horizontal scroll at ${w}`).toBeLessThanOrEqual(o.c);

    /*
      ⚠⚠ THE SAME GUARD, RE-ANCHORED BY SHAPE (ruling 14: when the code a rule
      names goes away, the rule may not). It asserted that no journey rendered a
      blank description; it now asserts no plan accordion renders a blank TITLE,
      which is the same failure — a section full of rows saying nothing.
      ⚠ SUPERSEDED, quoted not deleted (`E164`):
      //   const blanks = await journeySection
      //     .locator("li [data-journey-desc]")
      //     .evaluateAll((els) => els.filter((el) => (el.textContent ?? "").trim() === "").length);
      //   expect(blanks, "every journey needs a one-line description").toBe(0);
    */
    const rowCount = await planSection.locator("details summary").count();
    expect(rowCount, "the blank-title guard needs rows to look at").toBeGreaterThan(0);
    const blanks = await planSection
      .locator("details summary")
      .evaluateAll((els) => els.filter((el) => (el.textContent ?? "").trim() === "").length);
    expect(blanks, "every plan row needs a visible title").toBe(0);

    await page.screenshot({ path: `e2e-tracker/shots/status-v5-${w}-${scheme}.png`, fullPage: false });
    console.log(`  ${w}px ${scheme}: eyebrow "${eyebrow.trim()}" · scrollW ${o.s}/${o.c}`);
  }
});
