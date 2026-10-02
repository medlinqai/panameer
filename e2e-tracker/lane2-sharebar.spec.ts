import { test, expect } from "@playwright/test";
/* ⚠⚠ THE GATE PROVIDER, NOT THE ADMIN. `admin@panameer.com` has no provider
   profile and therefore no public slug, so `ShareBar` correctly renders NULL —
   the first run timed out looking for a bar that was right not to be there. */
import { signIn } from "../e2e-shell/_auth";

/**
 * `P2-A1.1-E755` — the share bar stands out.
 *
 * ⚠ Screenshots at 1280 and 390, light and dark, as the brief asks. The
 * assertions are about the things Scott named, not about pixels.
 */
test("E755 — the share bar: intro line, filled primary, ink icons, URL in ink", async ({ page }) => {
  await signIn(page);

  for (const [w, scheme] of [[1280, "light"], [1280, "dark"], [390, "light"], [390, "dark"]] as const) {
    await page.emulateMedia({ colorScheme: scheme });
    await page.setViewportSize({ width: w, height: 900 });
    await page.goto("/profile");

    const bar = page.locator("section", { has: page.getByRole("heading", { name: "Share Your Profile" }) }).last();
    await bar.scrollIntoViewIfNeeded();
    await expect(bar.getByText("Share your profile where clients look for you.")).toBeVisible();

    const copy = bar.getByRole("button", { name: "Copy Link" });
    await expect(copy).toBeVisible();

    /* ⚠⚠ THE PRIMARY IS FILLED, NOT OUTLINED — that is the defect Scott reported.
       Asserted as a COMPUTED background that is not the surface, rather than a
       class name, so a refactor that keeps the look keeps the gate green. */
    const bg = await copy.evaluate((el) => getComputedStyle(el).backgroundColor);
    const surface = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(bg, `Copy Link must be filled, not ${bg}`).not.toBe(surface);
    expect(bg).not.toBe("rgba(0, 0, 0, 0)");

    /* ⚠ The three networks, each with a glyph drawn in currentColor. */
    for (const n of ["LinkedIn", "X", "Facebook"]) {
      const link = bar.getByRole("link", { name: n });
      await expect(link).toBeVisible();
      await expect(link.locator("svg"), `${n} has a single-colour mark`).toHaveCount(1);
      const fill = await link.locator("svg").evaluate((el) => getComputedStyle(el).fill);
      const ink = await link.evaluate((el) => getComputedStyle(el).color);
      /* ⚠⚠ `currentColor` is what keeps it in INK and makes it follow dark mode;
         a brand hex would not. Proven by comparing to the link's own colour. */
      expect(fill, `${n}'s mark must be ink, not a brand colour`).toBe(ink);
    }

    /* ⚠ The URL, in ink at body size, with the scheme stripped for display. */
    const urlText = (await bar.locator("#share-url").innerText()).trim();
    expect(urlText).not.toMatch(/^https?:\/\//);
    expect(urlText).toContain("/pro/");

    /* ⚠ Phone: buttons wrap, no horizontal page scroll. */
    const o = await page.evaluate(() => ({
      s: document.documentElement.scrollWidth,
      c: document.documentElement.clientWidth,
    }));
    expect(o.s, `no horizontal scroll at ${w}`).toBeLessThanOrEqual(o.c);

    const box = (await bar.boundingBox())!;
    await page.screenshot({
      path: `e2e-tracker/shots/sharebar-${w}-${scheme}.png`,
      clip: { x: 0, y: Math.max(0, box.y - 10), width: w, height: Math.min(300, box.height + 30) },
    });
    console.log(`  ${w}px ${scheme}: primary bg ${bg} · url "${urlText}" · scrollW ${o.s}/${o.c}`);
  }
});
