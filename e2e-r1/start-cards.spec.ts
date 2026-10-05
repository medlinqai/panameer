import { test, expect } from "@playwright/test";
import { db } from "../e2e-shell/_db";
import { createFixture, dropFixture, signIn, type R1Fixture } from "./_fixture";

// Seller start page matches the buyer's: provider 6 cards, recruiter 5, requester 2; no carousel.
let p: R1Fixture | null = null;
let r: R1Fixture | null = null;
test.beforeAll(async () => {
  p = await createFixture();
  r = await createFixture();
  await db().providerProfile.update({ where: { person_id: r.provider.personId }, data: { work_method: "RECRUITER" } });
  await db().requesterProfile.create({ data: { person_id: p.buyer.personId } });
});
test.afterAll(async () => {
  await db().requesterProfile.deleteMany({ where: { person_id: p?.buyer.personId } });
  await dropFixture(p);
  await dropFixture(r);
});

const cases = () => [
  { who: "provider", email: p!.provider.email, path: "/join/provider/start", n: 6, last: "Your Photo", head: /Ready for the work to find you\?/ },
  { who: "recruiter", email: r!.provider.email, path: "/join/provider/start", n: 5, last: "Your Photo", head: /Ready for the work to find you\?/ },
  { who: "requester", email: p!.buyer.email, path: "/join/requester/start", n: 2, last: null, head: /Ready to find the world's best talent\?/ },
];

for (const scheme of ["light", "dark"] as const)
  test(`start cards (${scheme})`, async ({ browser }) => {
    for (const c of cases()) {
      const ctx = await browser.newContext({ colorScheme: scheme });
      const page = await ctx.newPage();
      await signIn(page, c.email);
      for (const w of [1440, 390]) {
        await page.setViewportSize({ width: w, height: 900 });
        await page.goto(c.path, { waitUntil: "domcontentloaded" });
        await expect(page.getByRole("heading", { level: 1 })).toHaveText(c.head, { timeout: 30_000 });
        await expect(page.getByTestId("start-card")).toHaveCount(c.n);
        if (c.last) await expect(page.getByTestId("start-card").last()).toContainText(c.last);
        if (c.who === "recruiter") await expect(page.getByText("Your Rates")).toHaveCount(0);
        await expect(page.getByRole("link", { name: "Get Started Now!" })).toBeVisible();
        const cols = await page.getByTestId("start-cards").evaluate((e) => getComputedStyle(e).gridTemplateColumns.split(" ").length);
        expect(cols, `${c.who} ${w} columns`).toBe(w === 390 ? 1 : Math.min(c.n, 3));
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(w);
        await page.screenshot({ path: `e2e-r1/.artifacts/start-${c.who}-${w}-${scheme}.png`, fullPage: true });
      }
      await ctx.close();
    }
  });
