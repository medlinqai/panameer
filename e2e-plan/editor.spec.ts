import { expect, test } from "@playwright/test";
import { adminAccount, signInAs } from "../e2e-tracker/_admin";
import { TEST_OWNER, createTestPlan, dropTestPlan, liveRowCount } from "./_plan-state";

/**
 * ── `E784` — THE OUTLINE EDITOR, AS A PERSON USES IT ────────────────────────
 *
 * ⚠⚠ These tests drive the real page with the real keyboard. The maths and the
 * structural rules are already proven without a browser by `check:plan`; what
 * can only be proven here is that **Enter, Tab, Shift+Tab and Backspace reach
 * those rules**, which is the part Scott will actually touch.
 */

const OWNER = TEST_OWNER;
/** The live plan is never read for its CONTENT — only counted, to prove a
 *  run left it alone (`E804`). */
let liveBefore = 0;

test.beforeAll(async () => {
  liveBefore = await liveRowCount();
});

test.afterAll(async () => {
  await dropTestPlan();
  /* The one thing still asserted about the live plan: that this run did
     not change its row count. A count, never its contents. */
  const after = await liveRowCount();
  if (after !== liveBefore) {
    throw new Error(`the live plan changed during this run: ${liveBefore} rows -> ${after}`);
  }
});

test.beforeEach(async ({ page }) => {
  const { email, password } = adminAccount();
  await signInAs(page, email, password);
  /* Its OWN plan, emptied before each test (`E804`) — `createTestPlan` is
     idempotent and wipes the rows, so numbering assertions are about the rows
     this test made. */
  await createTestPlan();
  await page.goto("/admin/build-plan", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

/**
 * ⚠⚠⚠ THE WAIT IS ON THE SERVER, NOT ON THE INDICATOR — AND BOTH EARLIER
 * VERSIONS WERE WRONG IN INSTRUCTIVE WAYS.
 *
 * 1. ⚠ Waiting for "All changes saved" alone was VACUOUS: that text was already
 *    on screen from the add that created the row, so the helper returned before
 *    the 500ms title debounce had fired and the reload threw the keystrokes
 *    away. ⚠⚠ That exposed a REAL defect too — the indicator counted only
 *    requests in flight, so it claimed saved about text still sitting in a
 *    timer. The editor now counts pending debounces as unsaved.
 * 2. ⚠⚠ Waiting for `Saving…` → `All changes saved` then hung for three
 *    minutes: `Saving…` is a sub-second transient, and an assertion that has to
 *    catch a flash is flaky by construction, not by accident.
 *
 * ⚠⚠⚠ **SO THIS ASKS THE SERVER WHETHER THE ROW IS THERE.** "Saves as you go"
 * is a claim about the database, and that is the thing to assert. ⚠ `page.request`
 * carries the signed-in cookies, so this is the same admin endpoint the editor
 * posts to.
 */
async function savedTitle(page: import("@playwright/test").Page, title: string) {
  await expect
    .poll(
      async () => {
        const res = await page.request.post("/api/admin/plan", {
          data: { ownerKey: OWNER, action: "read" },
        });
        if (!res.ok()) return `HTTP ${res.status()}`;
        const body = (await res.json()) as { plan?: { rows?: { title: string }[] } };
        return (body.plan?.rows ?? []).map((r) => r.title).join("|");
      },
      { message: `"${title}" never reached the database`, timeout: 20_000, intervals: [200, 300, 500] },
    )
    .toContain(title);
}

/** The rendered numbers, in order — read off the stable badge hook rather than
 *  by text search, which would match a date or an owner that happens to say
 *  "2". ⚠ One place, so every numbering assertion agrees. */
async function numbers(page: import("@playwright/test").Page): Promise<string[]> {
  return page
    .locator("[data-plan-number]")
    .evaluateAll((els) => els.map((el) => (el.textContent ?? "").trim()));
}

async function addPhase(page: import("@playwright/test").Page, title: string) {
  await page.getByRole("button", { name: "+ Add Phase" }).click();
  const input = page.locator("[data-plan-title]").last();
  await expect(input).toBeVisible({ timeout: 20_000 });
  await input.click();
  await input.fill(title);
  /** ⚠ Blur flushes the debounce immediately, so the write does not wait on a
   *  timer — the same path a person takes when they click away. */
  await input.blur();
  await savedTitle(page, title);
  /**
   * ⚠⚠⚠ RETURNS THE INPUT IT FILLED, NOT A `[value="…"]` SELECTOR — AND THAT
   * COST TWO THREE-MINUTE TIMEOUTS.
   *
   * ⚠ `page.locator('[data-plan-title][value="Build"]')` matches the HTML
   * ATTRIBUTE. React sets the `value` **property** on a controlled input and
   * never updates the attribute, so the locator resolved to **zero elements**
   * and the next action waited out the whole test timeout.
   * ⚠⚠ It read exactly like the editor failing to save. It was the selector.
   */
  return input;
}

test("the page is reachable and names the first move when the plan is empty", async ({ page }) => {
  await expect(page.getByText("No rows yet", { exact: false })).toBeVisible();
  /** ⚠⚠ At genuine zero the page offers the template rather than reporting
   *  emptiness — the 2026-09-23 card rule. */
  await expect(page.getByRole("button", { name: /Use the Panameer Template/ })).toBeVisible();
});

test("a typed row survives a reload — it saves as you go, with no save button", async ({ page }) => {
  await addPhase(page, "Define");
  await expect(page.getByRole("button", { name: /^Save$/ })).toHaveCount(0);
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.locator('[data-plan-title]').first()).toHaveValue("Define");
});

test("Enter adds a row, Tab indents it to 1.1 and Shift+Tab takes it back out", async ({ page }) => {
  const first = await addPhase(page, "Build");
  await first.press("Enter");
  const second = page.locator("[data-plan-title]").nth(1);
  await expect(second).toBeFocused();
  await second.fill("Public");
  await second.blur();
  await savedTitle(page, "Public");
  await second.click();
  await second.press("Tab");

  /** ⚠ The number comes from `buildTree`, the same function `/status` uses. */
  await expect.poll(() => numbers(page), { timeout: 20_000 }).toEqual(["1", "1.1"]);

  const child = page.locator("[data-plan-title]").nth(1);
  await child.click();
  await child.press("Shift+Tab");
  /** ⚠⚠ Back out to two top-level rows — so the second is `2`, and `1.1` is
   *  gone. Asserting the whole list catches both halves at once. */
  await expect.poll(() => numbers(page), { timeout: 20_000 }).toEqual(["1", "2"]);
});

test("a milestone shows ◆ and does not take a number from the row after it", async ({ page }) => {
  await addPhase(page, "Prove");
  await page.getByRole("button", { name: /\+ Add Milestone/ }).click();
  await expect.poll(() => numbers(page), { timeout: 20_000 }).toEqual(["1", "◆"]);
  await page.getByRole("button", { name: "+ Add Phase" }).click();
  /** ⚠⚠ THE WHOLE POINT: Prove is 1, the milestone is ◆, and the next phase is
   *  **2** — not 3. Scott's outline reads that way, and renumbering every row
   *  after an inserted milestone is what this prevents. */
  await expect.poll(() => numbers(page), { timeout: 20_000 }).toEqual(["1", "◆", "2"]);
});

test("Backspace on an empty row deletes it", async ({ page }) => {
  const first = await addPhase(page, "Design");
  await first.press("Enter");
  const second = page.locator("[data-plan-title]").nth(1);
  await expect(second).toBeFocused();
  await second.press("Backspace");
  await expect(page.locator("[data-plan-title]")).toHaveCount(1, { timeout: 20_000 });
  await expect(page.locator("[data-plan-title]").first()).toHaveValue("Design");
});

test("deleting a row offers an undo that puts it back", async ({ page }) => {
  await addPhase(page, "Operate");
  await page.getByRole("button", { name: /^Delete Operate$/ }).click();
  await expect(page.getByText("Deleted “Operate”.")).toBeVisible({ timeout: 20_000 });
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(page.locator("[data-plan-title]").first()).toHaveValue("Operate", { timeout: 20_000 });
});

test("the refusal reaches the screen rather than failing silently", async ({ page }) => {
  const first = await addPhase(page, "Launch");
  await first.press("Enter");
  const second = page.locator("[data-plan-title]").nth(1);
  await second.fill("Task");
  await second.blur();
  await savedTitle(page, "Task");
  await second.click();
  await second.press("Tab");
  await expect.poll(() => numbers(page), { timeout: 20_000 }).toEqual(["1", "1.1"]);
  /** ⚠⚠ A SECOND Tab CANNOT INDENT FURTHER, AND THE PERSON MUST BE TOLD WHY.
   *  Tab doing nothing with no explanation is the defect `E539` was about, and
   *  the message has to name the two-level rule — not claim there is no row
   *  above, which is false for a child. */
  const child = page.locator("[data-plan-title]").nth(1);
  await child.click();
  await child.press("Tab");
  await expect(page.getByText(/two levels deep/i)).toBeVisible({ timeout: 20_000 });
});

test("the template builds Scott's outline, and Launch is 5", async ({ page }) => {
  await page.getByRole("button", { name: /Use the Panameer Template/ }).click();
  await expect(page.locator("[data-plan-title]")).toHaveCount(17, { timeout: 30_000 });
  /**
   * ⚠ Read as (number, title) pairs out of the live DOM, because the title lives
   * in an input's VALUE PROPERTY — see `addPhase`'s note. `data-plan-number` is
   * the stable hook for the badge.
   */
  const pairs = await page.locator("li:has([data-plan-title])").evaluateAll((els) =>
    els.map((el) => ({
      number: el.querySelector("[data-plan-number]")?.textContent?.trim() ?? "",
      title: (el.querySelector("[data-plan-title]") as HTMLInputElement | null)?.value ?? "",
    })),
  );
  expect(pairs.length, "the template must have produced rows to read").toBe(17);
  expect(pairs.find((r) => r.title === "Launch")?.number, JSON.stringify(pairs)).toBe("5");
  /** ⚠⚠ AND THE MILESTONE BEFORE IT TAKES THE MARK, NOT A NUMBER — if it took
   *  one, Launch would be 6 and the assertion above is what catches it. */
  expect(pairs.find((r) => r.title === "R1 — Public beta")?.number).toBe("◆");
  /** ⚠ And the template refuses to run twice — the control is replaced by the
   *  clearing path rather than left there to fail. */
  await expect(page.getByRole("button", { name: /Use the Panameer Template/ })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Clear the Plan" })).toBeVisible();
});

test("every row control is at least 44px, on a phone", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await addPhase(page, "Define");
  const controls = page.locator("[data-plan-controls] button, [aria-label^='Reorder'] ");
  const n = await controls.count();
  /** ⚠ Count > 0 (`E586`): a measurement over nothing is not a measurement. */
  expect(n).toBeGreaterThan(2);
  for (let i = 0; i < n; i++) {
    const box = await controls.nth(i).boundingBox();
    expect(box, `control ${i} has no box`).not.toBeNull();
    expect(box!.height, `control ${i} height`).toBeGreaterThanOrEqual(44);
    expect(box!.width, `control ${i} width`).toBeGreaterThanOrEqual(44);
  }
});

test("no sideways scroll at 390 or 1100", async ({ page }) => {
  for (const width of [390, 1100]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/admin/build-plan", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "+ Add Phase" }).click();
    await expect(page.locator("[data-plan-title]").first()).toBeVisible({ timeout: 20_000 });
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, `horizontal overflow at ${width}`).toBeLessThanOrEqual(1);
  }
});

test("Build Plan is in the admin nav, inside the Configuration drawer", async ({ page }) => {
  /**
   * ⚠⚠ THE ADMIN NAV LIVES BEHIND THE CONFIGURATION CONTROL IN THE BAND, so the
   * link is not in the DOM until the drawer is opened (`E694`'s gear).
   * ⚠ The first version asserted `locator(...).first()` had `toHaveCount(1)`,
   * which can never exceed 1 — so it could only ever prove "present", never
   * "exactly one". It now counts the unfiltered locator.
   */
  await page.getByRole("button", { name: /Configuration/i }).first().click();
  const link = page.locator('a[href="/admin/build-plan"]');
  await expect(link).toHaveCount(1, { timeout: 20_000 });
  await expect(link.first()).toContainText("Build Plan");
});
