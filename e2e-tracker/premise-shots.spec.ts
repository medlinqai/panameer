import { test, expect } from "@playwright/test";
import { adminAccount, signInAs } from "./_admin";
/** Phase-1 re-confirmation: E750/E751 touched PageTabs and AppShell's `main`
 *  (`overflow-x-clip`). Prove the Builder and /status are unaffected. */
test("premise — /admin/work-tracker and /status after E750/E751", async ({ page }) => {
  const { email, password } = adminAccount();
  await signInAs(page, email, password);
  for (const [w, h] of [[1440, 900], [390, 844]] as const) {
    await page.setViewportSize({ width: w, height: h });
    await page.goto("/admin/work-tracker");
    await expect(page.getByRole("heading", { name: "The build, as it stands" })).toBeVisible();
    const o1 = await page.evaluate(() => ({ s: document.documentElement.scrollWidth, c: document.documentElement.clientWidth }));
    await page.screenshot({ path: `e2e-tracker/shots/admin-${w}.png`, clip: { x: 0, y: 0, width: w, height: Math.min(h, 700) } });
    await page.goto("/status");
    await expect(page.getByRole("heading", { name: /Watch your platform/ })).toBeVisible();
    const o2 = await page.evaluate(() => ({ s: document.documentElement.scrollWidth, c: document.documentElement.clientWidth }));
    await page.screenshot({ path: `e2e-tracker/shots/status-${w}.png`, clip: { x: 0, y: 0, width: w, height: Math.min(h, 700) } });
    console.log(`\n  ${w}px — admin scrollW/clientW ${o1.s}/${o1.c}${o1.s > o1.c ? " ⚠ H-OVERFLOW" : " ✓"} · status ${o2.s}/${o2.c}${o2.s > o2.c ? " ⚠ H-OVERFLOW" : " ✓"}`);
    expect(o1.s, `admin @${w} no h-overflow`).toBeLessThanOrEqual(o1.c);
    expect(o2.s, `status @${w} no h-overflow`).toBeLessThanOrEqual(o2.c);
  }
});
