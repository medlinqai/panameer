import { test, expect } from "@playwright/test";
import { signIn } from "../e2e-shell/_auth";

/** `P2-ALL-E760` — the phone bottom nav must look IDENTICAL after the fix. */
test("E760 — the bottom nav uses the pinned rail tokens at 390", async ({ page }) => {
  await signIn(page);
  for (const scheme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: scheme });
    await page.setViewportSize({ width: 390, height: 844 });
    /* ⚠⚠ `/connect/community` AND NOT `/dashboard`: on `/dashboard` NO bottom-nav link is
       active, so the active-pill assertion never ran — the first version of this
       test passed vacuously on exactly the half that matters. */
    await page.goto("/connect/community");
    const nav = page.locator(".pm-bottomnav").first();
    await nav.waitFor({ state: "visible", timeout: 20_000 });

    const bg = await nav.evaluate((el) => getComputedStyle(el).backgroundColor);
    const active = page.locator(".pm-bottomnav-link.is-active").first();
    /* ⚠⚠⚠ THE PILL MUST EXIST, or this test proves nothing about the colour that
       is actually parked on Scott's decision. */
    await expect(active, "a bottom-nav link must be active here").toHaveCount(1);
    const activeBg = await active.evaluate((el) => getComputedStyle(el).backgroundColor);

    /* ⚠ `#272334` = rgb(39,35,52) is the rail token. The old hard-coded fallback
       was `#211c2e` = rgb(33,28,46), a 19-point move nobody can see — but it IS a
       move, so it is stated rather than called "no change".

       ⚠⚠⚠ **THE PILL IS MAGENTA NOW — SCOTT RULED IT 2026-10-02.** It is
       `--color-rail-active` = `#b02aae` = rgb(176,42,174), the same fill the band
       uses for the same state. ⚠ Both tokens are PINNED (defined once, outside
       the dark block), which is why one value is asserted for both schemes.
       ⚠ SUPERSEDED, quoted not deleted (`E164`):
       //   expect(activeBg, "must NOT have become magenta").toBe("rgb(58, 49, 80)"); */
    expect(bg, `bottom nav background, ${scheme}`).toBe("rgb(39, 35, 52)");
    expect(activeBg, `the active pill is the rail's magenta, ${scheme}`).toBe("rgb(176, 42, 174)");
    await page.screenshot({
      path: `e2e-tracker/shots/bottomnav-390-${scheme}.png`,
      clip: { x: 0, y: 744, width: 390, height: 100 },
    });
    console.log(`  390 ${scheme}: nav ${bg} · active ${activeBg}`);
  }
});
