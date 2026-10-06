import { test, expect, type Page } from "@playwright/test";
import { db } from "../e2e-shell/_db";
import { createFixture, dropFixture, signIn, type R1Fixture } from "./_fixture";

// check:hero-motion: the Account heroes keep every animation — countdown ticks, honeycomb rotates, Score ring
// redraws and grows on hover — and with reduced motion nothing moves.
let f: R1Fixture | null = null;
test.beforeAll(async () => {
  f = await createFixture();
  await db().providerProfile.update({ where: { person_id: f.provider.personId }, data: { onboarding_completed_at: new Date() } });
});
test.afterAll(async () => dropFixture(f));

const countdown = (p: Page) => p.getByText(/rebuilds in \d+s/).first();
const cellPositions = (p: Page) =>
  p.locator(".pm-hive-cell").evaluateAll((els) => els.map((e) => e.getBoundingClientRect()).map((r) => `${Math.round(r.x)},${Math.round(r.y)}`).join("|"));

test("usage: countdown ticks and the honeycomb rotates", async ({ page }) => {
  test.setTimeout(90_000);
  await signIn(page, f!.provider.email);
  await page.goto("/usage", { waitUntil: "networkidle" });
  const t0 = await countdown(page).textContent();
  await expect(countdown(page)).not.toHaveText(t0!, { timeout: 2500 });
  const before = await cellPositions(page);
  await expect.poll(() => cellPositions(page), { timeout: 20_000, intervals: [1000] }).not.toBe(before);
});

test("score: countdown ticks, ring redraws, segment grows on hover", async ({ page }) => {
  test.setTimeout(90_000);
  await signIn(page, f!.provider.email);
  await page.goto("/score", { waitUntil: "networkidle" });
  const t0 = await countdown(page).textContent();
  await expect(countdown(page)).not.toHaveText(t0!, { timeout: 2500 });
  const anim = () => page.locator(".pm-rebuild-draw [data-seg]").first().evaluate((e) => getComputedStyle(e).animationName);
  expect(await anim()).toBe("pm-rebuild-seg");
  const box = (await page.locator("svg.pm-score-svg").boundingBox())!;
  const k = box.width / 300, a = (-90 + 4) * (Math.PI / 180);
  await page.mouse.move(box.x + (150 + 118 * Math.cos(a)) * k, box.y + (150 + 118 * Math.sin(a)) * k);
  await expect(page.locator("[data-seg]").first()).toHaveAttribute("stroke-width", "30");
});

test("reduced motion: no countdown, nothing moves", async ({ browser }) => {
  test.setTimeout(90_000);
  const ctx = await browser.newContext({ reducedMotion: "reduce", viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await signIn(page, f!.provider.email);
  await page.goto("/usage", { waitUntil: "networkidle" });
  await expect(page.getByText(/rebuilds in \d+s/)).toHaveCount(0);
  const before = await cellPositions(page);
  await page.waitForTimeout(17_000);
  expect(await cellPositions(page)).toBe(before);
  await page.goto("/score", { waitUntil: "networkidle" });
  await expect(page.getByText(/rebuilds in \d+s/)).toHaveCount(0);
  expect(await page.locator(".pm-rebuild-draw [data-seg]").first().evaluate((e) => getComputedStyle(e).animationName)).toBe("none");
  await ctx.close();
});
