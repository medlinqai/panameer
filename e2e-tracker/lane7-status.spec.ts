import { test, expect } from "@playwright/test";

/** `P2-ALL-E757` — the public page, built to mockup v5. */
test("E757 — /status renders the mockup's sections and screenshots", async ({ page }) => {
  for (const [w, scheme] of [[1440, "light"], [1440, "dark"], [390, "light"], [390, "dark"]] as const) {
    await page.emulateMedia({ colorScheme: scheme });
    await page.setViewportSize({ width: w, height: 1000 });
    await page.goto("/status");

    await expect(page.getByRole("heading", { name: "Watch Panameer get built!" })).toBeVisible();
    for (const h of ["Ten parts of one platform.", "What changed, day by day.", "Found a problem? Tell us.", "Releases"]) {
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

    /* ⚠⚠ TEN JOURNEY ROWS, NOT TWELVE — the milestones have their own section. */
    const journeySection = page.locator("section", {
      has: page.getByRole("heading", { name: "Ten parts of one platform." }),
    });
    await expect(journeySection.locator("li")).toHaveCount(10);

    /* ⚠ "Day N" must be absent while Define has no start date — no NaN. */
    const eyebrow = await page.locator("text=Building in the open").first().innerText();
    expect(eyebrow, "Day N must not print NaN").not.toMatch(/NaN/);

    const o = await page.evaluate(() => ({
      s: document.documentElement.scrollWidth,
      c: document.documentElement.clientWidth,
    }));
    expect(o.s, `no horizontal scroll at ${w}`).toBeLessThanOrEqual(o.c);

    /* ⚠⚠ EVERY JOURNEY HAS PUBLIC COPY. A new `PNM-*` row with no entry in
       `JOURNEY_COPY` renders an empty description — silence is safe but it is
       also invisible, so it is asserted rather than left to be noticed. */
    /* ⚠ Anchored on `data-journey-desc`, not on child position — the positional
       version silently stopped finding the description when `E766` rebuilt this
       section as a grid, and reported every journey as blank. */
    const blanks = await journeySection
      .locator("li [data-journey-desc]")
      .evaluateAll((els) => els.filter((el) => (el.textContent ?? "").trim() === "").length);
    expect(blanks, "every journey needs a one-line description").toBe(0);

    await page.screenshot({ path: `e2e-tracker/shots/status-v5-${w}-${scheme}.png`, fullPage: false });
    console.log(`  ${w}px ${scheme}: eyebrow "${eyebrow.trim()}" · scrollW ${o.s}/${o.c}`);
  }
});
