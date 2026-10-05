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

// Walk the provider steps: each opens at the top with the right eyebrow and Next label.
for (const v of [{ w: 1440, h: 800, scheme: "light" as const }, { w: 390, h: 750, scheme: "dark" as const }])
  test(`provider steps walk ${v.w} ${v.scheme}`, async ({ browser }) => {
    const f = await createFixture();
    try {
      const ctx = await browser.newContext({ colorScheme: v.scheme, viewport: { width: v.w, height: v.h } });
      const page = await ctx.newPage();
      await signIn(page, f.provider.email);
      await page.goto("/join/provider", { waitUntil: "domcontentloaded" });
      const eyebrow = page.locator("[data-step-eyebrow]");
      const shot = (n: string) => page.screenshot({ path: `e2e-r1/.artifacts/walk-${n}-${v.w}-${v.scheme}.png` });
      const atTop = async (label: string) => {
        await expect(eyebrow).toContainText(label, { timeout: 30_000 });
        await page.waitForTimeout(300);
        expect(await page.evaluate(() => window.scrollY), `${label} opens at top`).toBe(0);
      };
      await atTop("Step 1 of 6 · Résumé");
      await expect(page.getByRole("button", { name: "Next: Title" })).toBeVisible();
      await page.getByRole("button", { name: "Skip for Now" }).click();
      await atTop("Step 2 of 6 · Title");
      await shot("title");
      await page.locator("input[type=text], input:not([type])").first().fill("Oracle Cloud Procurement Consultant");
      await page.getByRole("button", { name: "Next: Roles" }).click();
      await atTop("Step 3 of 6 · Roles");
      await expect(page.getByRole("heading", { name: "What kind of work do you do?" })).toBeVisible();
      await page.locator("[data-role-rows] button").first().click();
      await page.locator("[data-role-rows] button").nth(1).click();
      await expect(page.getByText("Leads profile")).toBeVisible();
      await shot("roles");
      await page.mouse.wheel(0, 2000);
      await page.getByRole("button", { name: "Next: Skills" }).click();
      await atTop("Step 4 of 6 · Skills");
      await expect(page.locator("[data-skill-suggestions]")).toBeVisible({ timeout: 20_000 });
      const sugg = page.locator("button[aria-pressed=false]");
      const n = await sugg.count();
      expect(n).toBeGreaterThanOrEqual(10);
      expect(n).toBeLessThanOrEqual(15);
      await sugg.first().click();
      await shot("skills");
      await page.mouse.wheel(0, 2000);
      await page.getByRole("button", { name: "Next: Rates" }).click();
      await atTop("Step 5 of 6 · Rates");
      await expect(page.getByRole("heading", { name: "What do you charge?" })).toBeVisible();
      await page.locator("input[inputmode=decimal], input[inputmode=numeric], input[type=number]").first().fill("150");
      await shot("rates");
      await page.getByRole("button", { name: "Next: Photo" }).click();
      await atTop("Step 6 of 6 · Photo");
      await shot("photo");
      await page.getByRole("button", { name: "Back" }).click();
      await atTop("Step 5 of 6 · Rates");
      await ctx.close();
    } finally {
      await dropFixture(f);
    }
  });

// Review: one row per step + Work history, Publish profile.
for (const v of [{ w: 1440, h: 800, scheme: "light" as const }, { w: 390, h: 750, scheme: "dark" as const }])
  test(`review rows ${v.w} ${v.scheme}`, async ({ browser }) => {
    const f = await createFixture();
    try {
      const ctx = await browser.newContext({ colorScheme: v.scheme, viewport: { width: v.w, height: v.h } });
      const page = await ctx.newPage();
      await signIn(page, f.provider.email);
      await page.goto("/join/provider?step=finish", { waitUntil: "domcontentloaded" });
      await expect(page.locator("[data-step-eyebrow]")).toHaveText("Review", { timeout: 30_000 });
      await expect(page.getByRole("heading", { name: "Here's your profile. Check it, then publish." })).toBeVisible();
      for (const k of ["Résumé", "Title", "Roles", "Skills", "Rates", "Photo", "Work history"])
        await expect(page.locator(`[data-review-row="${k}"]`)).toBeVisible();
      await expect(page.getByRole("button", { name: "Publish profile" })).toBeVisible();
      await page.screenshot({ path: `e2e-r1/.artifacts/review-${v.w}-${v.scheme}.png` });
      await page.locator('[data-review-row="Roles"] button').click();
      await expect(page.locator("dialog [data-role-rows]")).toBeVisible();
      await page.screenshot({ path: `e2e-r1/.artifacts/review-roles-${v.w}-${v.scheme}.png` });
      await ctx.close();
    } finally {
      await dropFixture(f);
    }
  });

// Requester steps + the other pages in scope: slim bar, title in the first screen.
for (const scheme of ["light", "dark"] as const)
  test(`requester + other pages (${scheme})`, async ({ browser }) => {
    const f = await createFixture();
    await db().requesterProfile.create({ data: { person_id: f.buyer.personId } });
    try {
      for (const s of sizes) {
        const anon = await browser.newContext({ colorScheme: scheme, viewport: s });
        const a = await anon.newPage();
        for (const path of ["/join", "/join/buyer", "/join/coming-soon", "/verify-email", "/invite/accept"]) {
          await a.goto(path, { waitUntil: "domcontentloaded" });
          await expect(a.locator("[data-onboarding-bar]"), path).toBeVisible({ timeout: 30_000 });
          await expect(a.locator("[data-marketing-footer], footer.marketing-footer")).toHaveCount(0);
          const h1 = await a.locator("h1").first().boundingBox();
          expect(h1 && h1.y + h1.height <= s.height, `${path} title in first screen`).toBeTruthy();
          expect(await a.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(s.width);
          await a.screenshot({ path: `e2e-r1/.artifacts/page${path.replace(/\//g, "_")}-${s.width}-${scheme}.png` });
        }
        await anon.close();
        const ctx = await browser.newContext({ colorScheme: scheme, viewport: s });
        const page = await ctx.newPage();
        await signIn(page, f.buyer.email);
        await page.goto("/join/requester/steps", { waitUntil: "domcontentloaded" });
        await expect(page.locator("[data-step-eyebrow]")).toContainText("Step 1 of 2 · Requester Details", { timeout: 30_000 });
        await expect(page.locator("[data-onboarding-bar]")).toBeVisible();
        await page.screenshot({ path: `e2e-r1/.artifacts/requester-steps-${s.width}-${scheme}.png` });
        await page.goto("/join/requester/start", { waitUntil: "domcontentloaded" });
        await expect(page.locator("[data-onboarding-bar]")).toBeVisible({ timeout: 30_000 });
        await ctx.close();
      }
    } finally {
      await db().requesterProfile.deleteMany({ where: { person_id: f.buyer.personId } });
      await dropFixture(f);
    }
  });
