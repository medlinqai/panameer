import { test, expect } from "@playwright/test";
import { adminAccount, signInAs } from "./_admin";

/**
 * ── ⚠⚠ THE TRACKER ADMIN YOU CAN ACTUALLY USE (`P2-ALL-E768`) ──────────────
 *
 * ⚠ Scott, 2026-10-02: *"There was no save button."* · *"I could see sections
 * with no way to expand and add data."*
 *
 * ⚠⚠⚠ **THESE WRITE NOTHING THEY DO NOT WRITE BACK, BY CONSTRUCTION.** The one
 * test that saves writes a task's OWNER back to the value it already held, so the
 * row is byte-identical before and after — the strongest form of "leaves no data
 * on the public page" is a test that never changes one. ⚠ Owner is admin-only and
 * is not in the public payload at all, so even a failure could not publish.
 */
test.describe("P2-ALL-E768 — the tracker admin", () => {
  test.beforeEach(async ({ page }) => {
    const a = adminAccount();
    await signInAs(page, a.email, a.password);
    await page.setViewportSize({ width: 1440, height: 1100 });
    await page.goto("/admin/work-tracker", { waitUntil: "domcontentloaded" });
  });

  test("⚠ every section is an expander with a count", async ({ page }) => {
    const names = [/^Phases \(\d+\)$/, /^Gates \(\d+\)$/, /^Releases \(\d+\)$/, /^Your own tasks \(\d+\)$/, /^Shipped \(\d+\)$/];
    for (const n of names) {
      const b = page.getByRole("button", { name: n });
      await expect(b, `${n} is one chevron button carrying its count`).toHaveCount(1);
      await expect(b).toHaveAttribute("aria-expanded", /true|false/);
    }
    /* ⚠⚠ AND THE CHEVRON IS NOT IN THE ACCESSIBLE NAME. It is `aria-hidden`, so a
       screen reader hears "Phases (6)" and not "› Phases (6)" — asserted because
       the regexes above would silently stop matching if that ever changed. */
    const phases = page.getByRole("button", { name: /^Phases \(\d+\)$/ });
    await expect(phases).toHaveCount(1);
  });

  /** ⚠⚠ An empty section opens itself; a full one does not. */
  test("⚠⚠ an empty section is open, and Phases is open because it is the page", async ({ page }) => {
    await expect(page.getByRole("button", { name: /^Your own tasks \(0\)$/ })).toHaveAttribute("aria-expanded", "true");
    await expect(page.getByRole("button", { name: /^Phases \(\d+\)$/ })).toHaveAttribute("aria-expanded", "true");
    await expect(page.getByRole("button", { name: /^Gates \(\d+\)$/ })).toHaveAttribute("aria-expanded", "false");
  });

  test("⚠⚠ each section offers its primary action", async ({ page }) => {
    for (const label of ["Add Release", "Add Task", "Add Shipped Entry"]) {
      await expect(page.getByRole("button", { name: label, exact: true }), label).toHaveCount(1);
    }
    /* ⚠ Per phase: the dates ARE the action, labelled so they read as one. */
    await expect(page.getByText("Set dates").first()).toBeVisible();
  });

  test("⚠⚠ the page states how it works, and that it saves itself", async ({ page }) => {
    await expect(page.getByText(/Statuses save as you go/)).toBeVisible();
    await expect(page.getByText("All changes saved")).toBeVisible();
  });

  /**
   * ⚠⚠⚠ THE ONE THAT MATTERS. Before this lane the rendered page contained ZERO
   * occurrences of `Saving` or `Saved` — a save that worked looked exactly like a
   * save that never fired.
   */
  test("⚠⚠⚠ a write reports itself, and writes the same value back", async ({ page }) => {
    const phaseBtn = page.locator("button[aria-expanded]").filter({ hasText: /Define/ }).first();
    if ((await phaseBtn.getAttribute("aria-expanded")) === "false") await phaseBtn.click();
    const stage = page.locator("button[aria-expanded]").filter({ hasText: /AI Setup/ }).first();
    if ((await stage.getAttribute("aria-expanded")) === "false") await stage.click();

    const owner = page.locator('input[placeholder="Owner"]').first();
    await expect(owner).toBeVisible();
    const before = await owner.inputValue();
    await owner.click();
    await owner.fill(before);           /* ⚠ the SAME value — no data changes */
    /* ⚠⚠⚠ THE TICK IS WHAT IS UNDER TEST, NOT THE IDLE LINE. `All changes saved`
       is ALSO the resting state, so asserting only that would pass against a page
       where nothing happens at all — an assertion its own mutation cannot fail
       (ruling 12). ⚠ `Saved ✓` exists only on the success path, so it is the one
       that proves the write reported itself.
       ⚠ It fades after ~2s, so it is awaited immediately after the blur. */
    const tick = page.getByText("Saved ✓").first();
    await owner.blur();
    await expect(tick, "the row reports Saved ✓").toBeVisible({ timeout: 15_000 });
    /* ⚠ And it FADES — a permanent tick on 212 rows stops meaning "just now". */
    await expect(tick).toBeHidden({ timeout: 15_000 });
    await expect(page.getByText("All changes saved")).toBeVisible({ timeout: 20_000 });
    expect(await owner.inputValue(), "the value is unchanged").toBe(before);
  });

  /**
   * ⚠⚠⚠ NOTHING PAINTS OUTSIDE THE FRAME, AND THIS CAUGHT A REAL ONE.
   * `rotate-90` turns an element about its centre, so its box becomes
   * **height × width** — the inline `›` carets measured 18–26px tall and after
   * the turn sat **6–10px left of the page frame** on every collapsed row.
   * ⚠ A width alone did not fix it; only a square turns into itself.
   */
  test("⚠⚠ nothing overflows the frame on the left", async ({ page }) => {
    const out = await page.evaluate(() => {
      const frame = document.querySelector("main > div > div") as HTMLElement | null;
      if (!frame) return ["no frame"];
      const fl = frame.getBoundingClientRect().left;
      return Array.from(document.querySelectorAll<HTMLElement>("main *"))
        .map((el) => ({ el, r: el.getBoundingClientRect() }))
        .filter(
          (x) =>
            x.r.width > 0 &&
            x.r.left < fl - 0.5 &&
            /* ⚠ The shell's own task-strip padding wrapper IS the frame's parent. */
            !x.el.className.toString().includes("lg:pr-"),
        )
        .map((x) => `${x.el.tagName}.${x.el.className.toString().slice(0, 40)} @${Math.round(x.r.left)}`);
    });
    expect(out, "elements left of the content frame").toEqual([]);
  });

  test("⚠ phone: no horizontal scroll", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 900 });
    await page.goto("/admin/work-tracker", { waitUntil: "domcontentloaded" });
    const o = await page.evaluate(() => ({
      s: document.documentElement.scrollWidth,
      c: document.documentElement.clientWidth,
    }));
    expect(o.s).toBeLessThanOrEqual(o.c);
  });
});
