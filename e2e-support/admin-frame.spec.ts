import { test, expect } from "@playwright/test";
import { adminAccount, signInAs } from "./_admin";

/**
 * ── ⚠⚠ ONE CONTENT FRAME FOR EVERY ADMIN PAGE (`P2-ALL-E768`) ───────────────
 *
 * ⚠ Scott, 2026-10-02: *"The page margins were a bit to the edge."* ⚠⚠ The
 * premise check found **nothing to match it to** — four admin pages all measured
 * `max-width: none` and 1376px of content at 1440 — so the frame is new, and
 * these assertions are what stop it drifting back or spreading.
 */
test.describe("P2-ALL-E768 — the admin content frame", () => {
  test.beforeEach(async ({ page }) => {
    const a = adminAccount();
    await signInAs(page, a.email, a.password);
  });

  test("⚠ it caps every admin page at 1200 and centres it", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    for (const url of ["/admin/work-tracker", "/admin/support", "/admin/skill-catalog"]) {
      await page.goto(url, { waitUntil: "domcontentloaded" });
      const m = await page.evaluate(() => {
        const f = document.querySelector("main > div > div") as HTMLElement | null;
        const r = f?.getBoundingClientRect();
        return { w: r ? Math.round(r.width) : null, left: r ? Math.round(r.left) : null };
      });
      expect(m.w, `${url} frame width`).toBe(1200);
      /* ⚠ Centred inside the content area, which excludes the fixed task strip —
         so the left gutter is larger than `main`'s 32px padding, not equal to it. */
      expect(m.left, `${url} frame left`).toBeGreaterThan(32);
    }
  });

  /**
   * ⚠⚠⚠ THE ASSERTION THAT MAKES IT A CAP AND NOT A WIDTH. A page that already
   * chose a NARROWER width must keep it; if this ever reads 1200 the frame has
   * stopped capping and started imposing.
   */
  test("⚠⚠ a page with its own narrower width keeps it", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/admin/skill-catalog", { waitUntil: "domcontentloaded" });
    const narrow = await page.evaluate(() => {
      const el = document.querySelector("main .max-w-5xl") as HTMLElement | null;
      return el ? Math.round(el.getBoundingClientRect().width) : null;
    });
    expect(narrow, "skill-catalog's own max-w-5xl").toBe(1024);
  });

  /**
   * ⚠⚠ ADMIN ONLY. Scott: *"Admin pages only; no app or public page changes."*
   * ⚠ Asserted STRUCTURALLY rather than by width — a width can coincide, but the
   * wrapper either wraps a page or it does not.
   */
  test("⚠⚠ no app or public page gains the frame", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/admin/support", { waitUntil: "domcontentloaded" });
    expect(
      await page.locator('main > div > div.max-w-\\[1200px\\]').count(),
      "admin has the frame"
    ).toBe(1);
    for (const url of ["/dashboard", "/connect/community"]) {
      await page.goto(url, { waitUntil: "domcontentloaded" });
      expect(
        await page.locator('main div.max-w-\\[1200px\\]').count(),
        `${url} must not have the admin frame`
      ).toBe(0);
    }
  });

  /** ⚠ Phone is untouched — the gutters are `AppShell`'s and this adds none. */
  test("⚠ phone width is unchanged", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 900 });
    await page.goto("/admin/work-tracker", { waitUntil: "domcontentloaded" });
    const m = await page.evaluate(() => {
      const f = document.querySelector("main > div > div") as HTMLElement | null;
      const r = f?.getBoundingClientRect();
      return {
        w: r ? Math.round(r.width) : null,
        left: r ? Math.round(r.left) : null,
        scroll: document.documentElement.scrollWidth,
        client: document.documentElement.clientWidth,
      };
    });
    expect(m.w, "phone content width").toBe(350);
    expect(m.left, "phone left gutter").toBe(20);
    expect(m.scroll, "no horizontal scroll").toBeLessThanOrEqual(m.client);
  });
});
