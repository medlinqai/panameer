import { test, expect } from "@playwright/test";
import { createFixture, dropFixture, signIn, type R1Fixture } from "./_fixture";

// Square buttons: no visible button on these pages has rounded corners (round exceptions: equal width/height).
let f: R1Fixture | null = null;
test.beforeAll(async () => { f = await createFixture(); });
test.afterAll(async () => { await dropFixture(f); });

const roundButtons = (page: import("@playwright/test").Page) =>
  page.evaluate(() =>
    [...document.querySelectorAll("button, a")]
      .filter((e) => {
        const r = e.getBoundingClientRect();
        if (!r.width || !r.height || Math.abs(r.width - r.height) < 2) return false;
        const cs = getComputedStyle(e);
        const filled = cs.backgroundColor !== "rgba(0, 0, 0, 0)" || parseFloat(cs.borderTopWidth) > 0;
        return filled && parseFloat(cs.borderTopLeftRadius) > 4;
      })
      .map((e) => `${e.tagName} "${(e.textContent ?? "").trim().slice(0, 30)}" r=${getComputedStyle(e).borderTopLeftRadius}`)
  );

for (const w of [1440, 390])
  test(`square buttons at ${w}`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: 900 });
    for (const path of ["/status", "/login"]) {
      await page.goto(path, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(800);
      const r = await roundButtons(page);
      expect(r, `${path}: ${r.join(" | ")}`).toEqual([]);
      await page.screenshot({ path: `e2e-r1/.artifacts/square${path.replace("/", "-")}-${w}.png` });
    }
    await signIn(page, f!.provider.email);
    for (const path of ["/status", "/join/provider", "/messages"]) {
      await page.goto(path, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(1200);
      const r = await roundButtons(page);
      expect(r, `${path} signed in: ${r.join(" | ")}`).toEqual([]);
      await page.screenshot({ path: `e2e-r1/.artifacts/square${path.replace(/\//g, "-")}-in-${w}.png` });
    }
  });
