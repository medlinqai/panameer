import { test, expect } from "@playwright/test";
import { signIn } from "../e2e-shell/_auth";

/** Scott's rulings of 2026-10-02: the pill is magenta, and the bands are pinned dark. */
test("rulings — pill magenta, bands pinned in both schemes", async ({ page }) => {
  await signIn(page);
  for (const scheme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: scheme });

    /* ── (1) the phone bottom nav's active pill ── */
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/community");
    const pill = page.locator(".pm-bottomnav-link.is-active").first();
    await expect(pill).toHaveCount(1);
    const pillBg = await pill.evaluate((el) => getComputedStyle(el).backgroundColor);
    await page.screenshot({
      path: `e2e-support/shots/pill-390-${scheme}.png`,
      clip: { x: 0, y: 744, width: 390, height: 100 },
    });

    /* ── (2) the /status bands ── */
    await page.setViewportSize({ width: 1280, height: 1000 });
    await page.goto("/status");
    const hero = page.locator("section").filter({ hasText: /Watch your platform/ }).first();
    const close = page.locator("section").filter({ hasText: /Build it once/ }).first();
    const heroBg = await hero.evaluate((el) => getComputedStyle(el).backgroundColor);
    const closeBg = await close.evaluate((el) => getComputedStyle(el).backgroundColor);
    const bodyBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);

    console.log(`  ${scheme}: pill ${pillBg} · hero ${heroBg} · close ${closeBg} · page ${bodyBg}`);

    /* ⚠⚠ ONE VALUE FOR BOTH SCHEMES — that is what "pinned" means, and asserting
       the same number twice is what proves it rather than describing it. */
    expect(pillBg, `pill, ${scheme}`).toBe("rgb(176, 42, 174)");
    expect(heroBg, `hero band, ${scheme}`).toBe("rgb(39, 35, 52)");
    expect(closeBg, `close band, ${scheme}`).toBe("rgb(39, 35, 52)");

    await page.screenshot({ path: `e2e-support/shots/bands-1280-${scheme}.png`, fullPage: false });
  }
});
