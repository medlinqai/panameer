import { expect, test } from "@playwright/test";
import { adminAccount, signInAs } from "../e2e-tracker/_admin";

/**
 * ── ⚠⚠ THE CONSOLE PANEL — SCOTT'S D2 CALL (`P2-ALL-E800`) ──────────────────
 *
 * ⚠ `Tasks · Transactions · Configuration · Activity · Reports`, the two new
 * tabs opening the admin menu's own groups, the gear off the band on DESKTOP and
 * on in the band on MOBILE, and ≥44px targets.
 *
 * ⚠⚠ `check:task-panel` holds the SOURCE rules — the group mapping, the
 * complementary breakpoints, the class names. ⚠⚠⚠ **THIS HOLDS WHAT ONLY A
 * BROWSER CAN SAY: that the links are on screen, clickable, and not covered.**
 */
test.describe("E800 — the right-side console panel", () => {
  test.beforeEach(async ({ page }) => {
    const { email, password } = adminAccount();
    await signInAs(page, email, password);
  });

  test("five tabs, in order, at desktop width", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/admin", { waitUntil: "domcontentloaded" });
    const strip = page.locator('button[aria-pressed]').filter({ hasNot: page.locator("svg + svg") });
    const labels = await page
      .locator('button[aria-pressed]')
      .evaluateAll((els) => els.map((e) => e.getAttribute("aria-label")));
    expect(labels).toEqual(["Tasks", "Transactions", "Configuration", "Activity", "Reports"]);
    expect(await strip.count()).toBe(5);
  });

  test("Transactions opens the transaction links, uncovered and clickable", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/admin", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Transactions", exact: true }).click();

    const drawer = page.getByRole("navigation", { name: "Transaction Data" });
    await expect(drawer).toBeVisible();
    /** ⚠ The ten Scott named, by their visible labels. */
    for (const label of [
      "Learn",
      "Work Requests",
      "Work Orders",
      "Work Packages",
      "Contracts",
      "Settlements",
      "Payments",
      "Messages",
      "Community",
      "AIM Checklist",
    ]) {
      await expect(drawer.getByRole("link", { name: label, exact: true })).toBeVisible();
    }

    /**
     * ⚠⚠⚠ "NOTHING COVERS ITS LINKS" IS MEASURED, NOT ASSUMED (Scott, D2).
     * `toBeVisible()` only asks about CSS; it says nothing about another element
     * painting on top. ⚠ `elementFromPoint` at each row's own centre is the
     * question a clicking finger asks.
     */
    const covered = await drawer.evaluateAll((navs) => {
      const out: { label: string; hitBy: string }[] = [];
      for (const nav of navs) {
        for (const a of nav.querySelectorAll("a")) {
          const r = a.getBoundingClientRect();
          const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
          if (!hit || !a.contains(hit)) {
            out.push({
              label: (a.textContent ?? "").trim(),
              hitBy: hit ? `${hit.tagName}.${(hit.className || "").toString().slice(0, 40)}` : "nothing",
            });
          }
        }
      }
      return out;
    });
    expect(covered, `these rows are not the topmost element at their own centre`).toEqual([]);

    /** ⚠ 44px, every row (Scott, D2). */
    const short = await drawer.evaluateAll((navs) =>
      navs
        .flatMap((n) => [...n.querySelectorAll("a")])
        .map((a) => ({ label: (a.textContent ?? "").trim(), h: Math.round(a.getBoundingClientRect().height) }))
        .filter((x) => x.h < 44),
    );
    expect(short, `rows under 44px: ${JSON.stringify(short)}`).toEqual([]);

    /** ⚠⚠ And it NAVIGATES — a visible row that does not go anywhere is a
     *  decoration. The drawer closes on the click, by design. */
    await drawer.getByRole("link", { name: "Work Orders", exact: true }).click();
    await expect(page).toHaveURL(/\/admin\/work-orders/);
  });

  test("Configuration opens BOTH groups, labelled separately", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/admin", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Configuration", exact: true }).click();

    /**
     * ⚠⚠ TWO HEADINGS, NOT ONE LIST. `Support Data` sitting unlabelled under
     * `Configuration Data` would read as a single menu, and they are two.
     */
    await expect(page.getByText("Configuration Data", { exact: true })).toBeVisible();
    await expect(page.getByText("Support Data", { exact: true })).toBeVisible();

    const cfg = page.getByRole("navigation", { name: "Configuration Data" });
    for (const label of [
      "Build Plan",
      "Users",
      "Roles>Domains>Skills",
      "Specializations",
    ]) {
      await expect(cfg.getByRole("link", { name: label, exact: true })).toBeVisible();
    }
    const sup = page.getByRole("navigation", { name: "Support Data" });
    await expect(sup.getByRole("link").first()).toBeVisible();
  });

  test("the gear leaves the band on desktop and stays on mobile", async ({ page }) => {
    /**
     * ⚠⚠⚠ THE PAIR IS THE POINT, AND IT IS WHY BOTH WIDTHS ARE IN ONE TEST:
     * asserting only the desktop half would pass for a gear deleted outright,
     * which is NOT the ruling — mobile keeps the full menu (rule 5).
     */
    const gear = page.getByRole("button", { name: "Configuration", exact: true });

    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/admin", { waitUntil: "domcontentloaded" });
    /** ⚠ At 1440 the only `Configuration` button is the panel's tab, which is
     *  inside the fixed right-hand strip — so the BAND must hold none. */
    const bandGearWide = page.locator('header button[aria-label="Configuration"], .pm-band button[aria-label="Configuration"]');
    await expect(bandGearWide).toHaveCount(0);
    /** ⚠⚠ And the panel IS there, or this test would pass on a console with no
     *  door at all. */
    await expect(gear).toBeVisible();

    await page.setViewportSize({ width: 390, height: 900 });
    await page.goto("/admin", { waitUntil: "domcontentloaded" });
    /** ⚠ Below `lg` the panel is hidden and the band's gear is the door. */
    const bandGearNarrow = page.locator('.pm-band button[aria-label="Configuration"]');
    await expect(bandGearNarrow).toHaveCount(1);
    await bandGearNarrow.click();
    await expect(page.getByRole("link", { name: "Build Plan", exact: true })).toBeVisible();
  });
});
