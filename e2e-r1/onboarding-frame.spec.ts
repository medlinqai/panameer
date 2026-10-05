import { test, expect } from "@playwright/test";
import { db } from "../e2e-shell/_db";
import { createFixture, dropFixture, signIn, type R1Fixture } from "./_fixture";

// Onboarding frame (E868): slim bar, step rail, eyebrow, one screen at 1440×800 / 390×750, light + dark.
let p: R1Fixture | null = null;
let r: R1Fixture | null = null;
test.beforeAll(async () => {
  p = await createFixture();
  r = await createFixture();
  await db().providerProfile.update({ where: { person_id: r.provider.personId }, data: { work_method: "RECRUITER" } });
});
test.afterAll(async () => {
  await dropFixture(p);
  await dropFixture(r);
});

const sizes = [{ width: 1440, height: 800 }, { width: 390, height: 750 }];
for (const scheme of ["light", "dark"] as const)
  test(`onboarding frame (${scheme})`, async ({ browser }) => {
    for (const c of [{ who: "provider", email: p!.provider.email, n: 6 }, { who: "recruiter", email: r!.provider.email, n: 5 }]) {
      const ctx = await browser.newContext({ colorScheme: scheme });
      const page = await ctx.newPage();
      await signIn(page, c.email);
      for (const s of sizes) {
        await page.setViewportSize(s);
        await page.goto("/join/provider", { waitUntil: "domcontentloaded" });
        await expect(page.locator("[data-step-eyebrow]")).toContainText(`Step 1 of ${c.n} · Résumé`, { timeout: 30_000 });
        await expect(page.locator("[data-onboarding-bar]")).toBeVisible();
        await expect(page.getByRole("button", { name: "Finish later" }).first()).toBeVisible();
        await expect(page.locator("footer.marketing-footer, [data-marketing-footer]")).toHaveCount(0);
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(s.width);
        await page.screenshot({ path: `e2e-r1/.artifacts/frame-${c.who}-${s.width}-${scheme}.png` });
      }
      await page.goto("/join/provider/start", { waitUntil: "domcontentloaded" });
      await expect(page.locator("[data-onboarding-bar]")).toBeVisible({ timeout: 30_000 });
      await ctx.close();
    }
  });
