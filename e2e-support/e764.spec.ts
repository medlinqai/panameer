import { test, expect } from "@playwright/test";

/** `P2-ALL-E764` — a status page, not a sales page. */
test("E764 — no sales voice, and a plain footer", async ({ page }) => {
  for (const [w, scheme] of [[1440, "light"], [1440, "dark"], [390, "light"], [390, "dark"]] as const) {
    await page.emulateMedia({ colorScheme: scheme });
    await page.setViewportSize({ width: w, height: 1100 });
    await page.goto("/status");

    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Watch Panameer get built!");
    await expect(page.getByText("Daily progress on the Panameer build, from first idea to public beta.")).toBeVisible();

    /* ⚠⚠ THE WHOLE SALES VOICE, ASSERTED AS ABSENT FROM THE RENDERED HTML —
       including the share preview, which is copy a reader never sees on the page
       and which would otherwise have survived every change to it. */
    const html = await page.content();
    for (const gone of [
      "Build it once",
      "sell it for years",
      "Join the Beta",
      "Package the reports",
      "your platform",
      "your own",
      "buyers and providers will use",
    ]) {
      expect(html.includes(gone), `"${gone}" must be gone`).toBe(false);
    }
    const desc = await page.locator('meta[name="description"]').getAttribute("content");
    expect(desc, "the share preview carries no sales voice").toBe(
      "Daily progress on the Panameer build, from first idea to public beta."
    );

    /* ⚠ Follow stays — in the hero only. */
    await expect(page.getByTestId("follow-hero")).toBeVisible();
    await expect(page.getByTestId("follow-close")).toHaveCount(0);

    /* ⚠ The minimal footer, and no CTA in it. */
    const footer = page.locator("footer").last();
    const footText = (await footer.innerText()).replace(/\s+/g, " ").trim();
    expect(footText).toContain("Panameer Inc");
    expect(footText).toContain("panameer.com");
    expect(footText).toContain("Report an issue");
    expect(await footer.getByRole("button").count(), "no CTA in the footer").toBe(0);

    const o = await page.evaluate(() => ({
      s: document.documentElement.scrollWidth,
      c: document.documentElement.clientWidth,
    }));
    expect(o.s).toBeLessThanOrEqual(o.c);
    console.log(`  ${w} ${scheme}: footer "${footText}" · scrollW ${o.s}/${o.c}`);

    await page.screenshot({ path: `e2e-support/shots/e764-${w}-${scheme}.png`, fullPage: false });
  }
});
