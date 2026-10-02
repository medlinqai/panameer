import { test, expect } from "@playwright/test";
import { signIn } from "../e2e-shell/_auth";

/**
 * `P2-A1.1-E762` — the owner preview bar, after.
 *
 * ⚠⚠ LOCATED BY ITS OWN TEXT, not by `div.bg-canvas`. The first version of this
 * spec used the class and matched the APP SHELL's canvas instead — it reported
 * plausible colours for an element that was not under test, which is a
 * measurement that proves nothing.
 */
test("E762 after — the owner preview bar is themed in both schemes", async ({ page }) => {
  await signIn(page);
  await page.goto("/profile");
  const href = await page
    .getByRole("link", { name: /How Others See My Profile/i })
    .first()
    .getAttribute("href");

  for (const scheme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: scheme });
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(href!);

    const bar = page
      .locator("div")
      .filter({ hasText: /^This Is How Buyers See You/ })
      .first();
    await bar.waitFor({ state: "visible", timeout: 20_000 });
    const bg = await bar.evaluate((el) => getComputedStyle(el).backgroundColor);
    const fg = await bar.evaluate((el) => getComputedStyle(el).color);
    const pageBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);

    /* ⚠⚠⚠ THE DEFECT, ASSERTED SO IT CANNOT COME BACK: the bar must never be the
       light-only `#f9fafb` while the page is dark. */
    expect(bg, `the bar must not keep its light fill in ${scheme}`).not.toBe("rgb(249, 250, 251)");
    if (scheme === "dark") {
      expect(bg, "dark: the bar is the themed canvas").toBe("rgb(11, 8, 23)");
    } else {
      expect(bg, "light: the bar barely moves").toBe("rgb(250, 250, 250)");
    }
    console.log(`  ${scheme}: bar ${bg} · text ${fg} · page ${pageBg}`);

    const box = (await bar.boundingBox())!;
    await page.screenshot({
      path: `e2e-support/shots/after-bar-1280-${scheme}.png`,
      clip: { x: 0, y: Math.max(0, box.y - 6), width: 1280, height: Math.min(140, box.height + 50) },
    });
  }
});
