import { test, expect } from "@playwright/test";
import { db } from "../e2e-shell/_db";
import { createFixture, dropFixture, signIn, type R1Fixture } from "./_fixture";

// P-E001: /score ring ↔ row hover works both ways (and keyboard focus = hover).
let f: R1Fixture | null = null;
test.beforeAll(async () => {
  f = await createFixture();
  await db().providerProfile.update({ where: { person_id: f.provider.personId }, data: { onboarding_completed_at: new Date() } });
});
test.afterAll(async () => dropFixture(f));

for (const w of [1440, 390])
  test(`score hover two-way @${w}`, async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: w, height: 900 } });
    const page = await ctx.newPage();
    await signIn(page, f!.provider.email);
    await page.goto("/score", { waitUntil: "networkidle" });
    const seg = page.locator("[data-seg]").first();
    const key = await seg.getAttribute("data-seg");
    const row = page.locator(`[data-line="${key}"]`).first();
    const y0 = await page.evaluate(() => window.scrollY);
    // Point on the first segment's arc: just clockwise of 12 o'clock, r=118 in a 300 viewBox.
    const box = (await page.locator("svg.pm-score-svg").boundingBox())!;
    const k = box.width / 300, a = (-90 + 4) * (Math.PI / 180);
    await page.mouse.move(box.x + (150 + 118 * Math.cos(a)) * k, box.y + (150 + 118 * Math.sin(a)) * k);
    await expect(row).toHaveAttribute("data-active", "true");
    expect(await page.evaluate(() => window.scrollY), "no jump").toBe(y0);
    await page.mouse.move(0, 0);
    await expect(row).not.toHaveAttribute("data-active", "true");
    await row.hover();
    await expect(seg).toHaveAttribute("stroke-width", "30");
    await page.mouse.move(0, 0);
    await seg.focus();
    await expect(row).toHaveAttribute("data-active", "true");
    await page.screenshot({ path: `e2e-r1/.artifacts/score-hover-${w}.png` });
    await ctx.close();
  });
