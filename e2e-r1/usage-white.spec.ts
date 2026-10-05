import { test, expect } from "@playwright/test";
import { db } from "../e2e-shell/_db";
import { createFixture, dropFixture, signIn, type R1Fixture } from "./_fixture";

// check:usage-white (usage v4 lane 1): Account pages are pure white from the tab row to the footer, gutters included.
// A sample point fails when the layer painting it is page-wide (not a card or control) and is not white.
let f: R1Fixture | null = null;
test.beforeAll(async () => {
  f = await createFixture();
  await db().providerProfile.update({ where: { person_id: f.provider.personId }, data: { onboarding_completed_at: new Date() } });
});
test.afterAll(async () => dropFixture(f));

for (const w of [1440, 390])
  test(`account pages are white @${w}`, async ({ browser }) => {
    const ctx = await browser.newContext({ colorScheme: "light", viewport: { width: w, height: 900 } });
    const page = await ctx.newPage();
    await signIn(page, f!.provider.email);
    for (const path of ["/usage", "/score", "/account-health", "/profile"]) {
      await page.goto(path, { waitUntil: "networkidle" });
      const bad = await page.evaluate(() => {
        const main = document.querySelector("main") as HTMLElement;
        const wide = main.getBoundingClientRect().width * 0.9;
        const top = (main.getBoundingClientRect().top + window.scrollY) | 0;
        const foot = document.querySelector("footer") as HTMLElement | null;
        const bottom = foot ? foot.getBoundingClientRect().top + window.scrollY : document.body.scrollHeight;
        const out: string[] = [];
        for (let y = top; y < bottom - 2; y += 40) {
          window.scrollTo(0, Math.max(0, y - 400));
          for (let x = 2; x < window.innerWidth; x += 40) {
            let e = document.elementFromPoint(x, y - window.scrollY) as HTMLElement | null;
            while (e) {
              const cs = getComputedStyle(e);
              if (cs.backgroundColor !== "rgba(0, 0, 0, 0)" || cs.backgroundImage !== "none") break;
              e = e.parentElement;
            }
            if (!e || e.getBoundingClientRect().width < wide) continue; // a card / control paints it
            const cs = getComputedStyle(e);
            if (cs.backgroundColor !== "rgb(255, 255, 255)" || cs.backgroundImage !== "none")
              out.push(`${x},${y} ${cs.backgroundColor} ${e.tagName}.${String(e.className).slice(0, 60)}`);
          }
        }
        return out.slice(0, 5);
      });
      expect(bad, `${path} @${w}`).toEqual([]);
    }
    await ctx.close();
  });
