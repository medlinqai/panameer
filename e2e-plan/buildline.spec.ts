import { expect, test } from "@playwright/test";

/**
 * ── `E792` — THE BUILD LINE IS BACK, ABOVE THE PLAN'S TIMELINE ──────────────
 *
 * ⚠ Scott: keep the thin line — *"it is cleaner"* — and the Gantt under it,
 * lighter. ⚠⚠ The ORDER is the assertion that matters: line → timeline →
 * accordions, because the line is the one-glance answer.
 */
test("the order is Build Line → plan timeline → accordions", async ({ page }) => {
  await page.goto("/status", { waitUntil: "domcontentloaded" });

  const line = page.locator('[aria-label="Build line"]');
  const gantt = page.locator('[aria-label="Plan timeline"]');
  const acc = page.getByRole("heading", { name: "The plan, phase by phase" });
  for (const [name, loc] of [["Build line", line], ["Plan timeline", gantt], ["accordions", acc]] as const) {
    await expect(loc, `${name} missing`).toBeVisible();
  }
  const y = async (l: typeof line) => (await l.first().boundingBox())!.y;
  const [a, b, c] = [await y(line), await y(gantt), await y(acc as never)];
  expect(a, `Build line (${a}) must sit above the timeline (${b})`).toBeLessThan(b);
  expect(b, `timeline (${b}) must sit above the accordions (${c})`).toBeLessThan(c);
});

test("the Build Line is drawn from the plan, not the AIM phase dates", async ({ page }) => {
  await page.goto("/status", { waitUntil: "domcontentloaded" });
  const line = page.locator('[aria-label="Build line"]');
  const text = await line.innerText();
  /** ⚠⚠ The plan's own phase names. The AIM catalog's six phases include
   *  `Panameer Build`, which the plan does not — so its ABSENCE is what proves
   *  the source changed. */
  for (const name of ["Define", "Design", "Build", "Prove"]) {
    expect(text, `${name} missing from the line`).toContain(name);
  }
  expect(text, "Panameer Build is an AIM stage and must not appear").not.toContain("Panameer Build");
});

test("the Gantt is lighter: 4px task bars, 6px top-level, rounded", async ({ page }) => {
  await page.goto("/status", { waitUntil: "domcontentloaded" });
  await page.setViewportSize({ width: 1280, height: 1000 });
  const bars = await page.locator('[aria-label="Plan timeline"] li span[title]').evaluateAll((els) =>
    els.map((e) => {
      const cs = getComputedStyle(e);
      return { h: Math.round(parseFloat(cs.height)), r: cs.borderRadius, t: (e.getAttribute("title") ?? "").slice(0, 18) };
    }),
  );
  expect(bars.length, "no bars to measure").toBeGreaterThan(3);
  /** ⚠ 4px or 6px for a bar; the milestone diamond is 10px and is excluded by
   *  its own rotation class, so it is allowed through here. */
  const bad = bars.filter((b) => ![4, 6, 10].includes(b.h));
  expect(bad, `bars must be 4px, 6px (or a 10px diamond): ${JSON.stringify(bad)}`).toEqual([]);
  /** ⚠⚠ THE DIAMOND IS EXCLUDED, AND THAT IS NOT A LOOSENING. A milestone mark
   *  is a ROTATED SQUARE — `BuildLine`'s own flag is the same shape — so square
   *  corners are correct there and rounding it would make it a dot. ⚠ Only the
   *  BARS are asserted rounded. */
  const barsOnly = bars.filter((b) => b.h !== 10);
  expect(barsOnly.length, "no 4/6px bars to check for rounding").toBeGreaterThan(2);
  expect(
    barsOnly.every((b) => b.r !== "0px"),
    `bars must have rounded ends like the Build Line: ${JSON.stringify(barsOnly.filter((b) => b.r === "0px"))}`,
  ).toBe(true);
});

/** Phone first, then desktop — the speed rule. */
for (const [w, h] of [[390, 1400], [1440, 1200]] as const) {
  for (const scheme of ["light", "dark"] as const) {
    test(`shot ${w} ${scheme}`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await page.setViewportSize({ width: w, height: h });
      await page.goto("/status", { waitUntil: "domcontentloaded" });
      await expect(page.locator('[aria-label="Plan timeline"]')).toBeVisible();
      const o = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(o, `h-overflow at ${w}`).toBeLessThanOrEqual(1);
      await page.screenshot({ path: `e2e-plan/shots/e792-status-${w}-${scheme}.png`, fullPage: false });
    });
  }
}
