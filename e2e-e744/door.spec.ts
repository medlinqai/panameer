import { test, expect } from "@playwright/test";
import { signIn } from "../e2e-shell/_auth";

/** ⚠ `P2-A1.1-E744` — the Score door survives the tile's removal. */
test("the score page is still reachable from /usage", async ({ page }) => {
  await signIn(page);
  await page.goto("/usage", { waitUntil: "networkidle" });
  const doors = page.locator('a[href="/connect/score"]');
  const n = await doors.count();
  console.log(`E744  /usage → /connect/score links: ${n}`);
  expect(n, "the Score door is gone from /usage").toBeGreaterThan(0);
  /* ⚠⚠ AND IT IS THE TAB ROW THAT SUPPLIES IT NOW — named, so a future change
     that drops the tab cannot pass by leaving some other link behind. */
  const inTabs = await page
    .locator('[data-testid="page-tabs"] a[href="/connect/score"]')
    .count();
  console.log(`E744  …of which in the tab row: ${inTabs}`);
  expect(inTabs, "the tab row no longer offers Score").toBeGreaterThan(0);
});
