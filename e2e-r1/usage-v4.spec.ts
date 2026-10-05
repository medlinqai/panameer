import { test, expect } from "@playwright/test";
import { db } from "../e2e-shell/_db";
import { createFixture, dropFixture, signIn, type R1Fixture } from "./_fixture";

// Usage v4: hero card + six outlined cells + 4-swatch legend; screenshots 1440/390 light/dark.
let f: R1Fixture | null = null;
test.beforeAll(async () => {
  f = await createFixture();
  await db().providerProfile.update({ where: { person_id: f.provider.personId }, data: { onboarding_completed_at: new Date() } });
  await db().connection.create({ data: { from_user_id: f.provider.userId, to_user_id: f.buyer.userId, kind: "COLLEAGUE", status: "ACCEPTED", responded_at: new Date() } });
});
test.afterAll(async () => {
  await db().connection.deleteMany({ where: { from_user_id: f?.provider.userId } });
  await dropFixture(f);
});

for (const scheme of ["light", "dark"] as const)
  for (const vp of [{ width: 1440, height: 900 }, { width: 390, height: 844 }])
    test(`usage v4 ${vp.width} ${scheme}`, async ({ browser }) => {
      const ctx = await browser.newContext({ colorScheme: scheme, viewport: vp });
      const page = await ctx.newPage();
      await signIn(page, f!.provider.email);
      await page.goto("/usage", { waitUntil: "networkidle" });
      const hero = page.getByTestId("usage-hero");
      await expect(hero).toBeVisible();
      const cells = hero.locator(".pm-hive-cell");
      await expect(cells).toHaveCount(6);
      expect(await cells.evaluateAll((els) => els.map((e) => e.getAttribute("data-cell")))).toEqual(["profile", "connect", "learn", "work", "shop", "pay"]);
      // Every cell has an outline.
      const strokes = await hero.locator(".pm-hive-cell path").evaluateAll((ps) => ps.map((p) => p.getAttribute("stroke")));
      expect(strokes.every((s) => s && s !== "none")).toBe(true);
      await expect(hero.locator('.pm-hive-cell[data-cell="pay"] text').first()).toHaveText(/^\$/);
      const sw = await hero.locator(".pm-hive-key [data-level]").evaluateAll((els) => els.map((e) => getComputedStyle(e).backgroundColor));
      expect(new Set(sw).size).toBe(4);
      await expect(hero.getByRole("link", { name: /Invite a Colleague/ })).toBeVisible();
      await expect(hero.getByRole("link", { name: /Complete Your Profile|View Your Profile/ })).toBeVisible();
      const act = page.getByTestId("usage-activity");
      await expect(act.locator("[data-area]")).toHaveCount(6);
      expect(await act.locator("[data-area]").evaluateAll((els) => els.map((e) => e.getAttribute("data-area")))).toEqual(["profile", "learn", "connect", "work", "shop", "pay"]);
      for (const k of ["profile", "learn", "connect", "work", "shop", "pay"]) await expect(act.locator(`[data-area="${k}"] [data-metric]`)).toHaveCount(4);
      await expect(act.locator('[data-metric="Instructors Messaged"]')).toContainText("NOT COUNTED");
      await expect(act.locator('[data-area="pay"] [data-metric="Earnings"] b')).toHaveText("$0");
      await expect(page.getByRole("heading", { name: "Your Profile", exact: true })).toHaveCount(0);
      await expect(act.locator('[aria-current="true"]')).toHaveText("All Time");
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(vp.width);
      // P-E003: no boxes — hero and areas carry no radius or shadow.
      const boxed = await page.locator('[data-testid="usage-hero"], [data-area]').evaluateAll((els) =>
        els.filter((e) => { const c = getComputedStyle(e); return c.borderTopLeftRadius !== "0px" || c.boxShadow !== "none"; }).length);
      expect(boxed).toBe(0);
      await page.screenshot({ path: `e2e-r1/.artifacts/usage-v4-${vp.width}-${scheme}.png`, fullPage: true });
      if (vp.width === 1440 && scheme === "light") {
        await act.getByRole("link", { name: "This Month" }).click();
        await expect(page).toHaveURL(/range=month/);
        await expect(page.getByTestId("usage-activity").locator('[aria-current="true"]')).toHaveText("This Month");
      }
      if (scheme === "light") {
        await page.goto("/profile", { waitUntil: "networkidle" });
        await page.screenshot({ path: `e2e-r1/.artifacts/profile-beside-usage-${vp.width}.png`, fullPage: true });
      }
      await ctx.close();
    });
