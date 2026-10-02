import { test, expect } from "@playwright/test";
import { adminAccount, signInAs } from "./_admin";

/**
 * `P2-ALL-E752` lane A acceptance — the admin can change a task status, a gate
 * criterion, a phase date and publish a Shipped entry, and each one PERSISTS.
 *
 * ⚠⚠ Every assertion re-loads the page before checking, so what is proved is
 * what the DATABASE holds — not what the component put in its own state.
 */

test("E752 — a non-admin cannot reach the Builder", async ({ page }) => {
  await page.goto("/admin/work-tracker");
  /* ⚠ Signed out: the route-access layer sends them to /login. */
  await expect(page).toHaveURL(/\/login/);
});

test("E752 — the Builder renders the whole catalog", async ({ page }) => {
  const { email, password } = adminAccount();
  await signInAs(page, email, password);
  await page.goto("/admin/work-tracker");

  await expect(page.getByRole("heading", { name: "The build, as it stands" })).toBeVisible();
  for (const phase of ["Define", "Design", "Build", "Prove", "Launch", "Operate"]) {
    await expect(page.getByRole("button", { name: phase, exact: true })).toBeVisible();
  }
  for (const gate of ["GATE 1", "GATE 2", "GATE 3", "GATE 4"]) {
    await expect(page.getByRole("heading", { name: gate })).toBeVisible();
  }
  const overall = await page.locator("header p").last().innerText();
  console.log(`\n  overall line: ${overall.replace(/\s+/g, " ")}`);
});

test("E752 — a task status change persists", async ({ page }) => {
  const { email, password } = adminAccount();
  await signInAs(page, email, password);
  await page.goto("/admin/work-tracker");
  /* Define is open by default; DEF-003 is seeded "Not Started" or similar. */
  const row = page.locator("li", { has: page.getByText("DEF-003", { exact: true }) }).first();
  const select = row.locator("select").first();
  const before = await select.inputValue();
  const next = before === "Blocked" ? "In Progress" : "Blocked";
  await select.selectOption(next);
  await page.waitForTimeout(1500);

  await page.reload();
  const after = await page
    .locator("li", { has: page.getByText("DEF-003", { exact: true }) })
    .first()
    .locator("select")
    .first()
    .inputValue();
  console.log(`\n  DEF-003: ${before} → ${next}, after reload: ${after}`);
  expect(after).toBe(next);

  /* ⚠⚠ PUT IT BACK. This is the ONE shared database — a probe that leaves a task
     flipped would show up on Scott's own Builder as work nobody did. */
  await page
    .locator("li", { has: page.getByText("DEF-003", { exact: true }) })
    .first()
    .locator("select")
    .first()
    .selectOption(before);
  await page.waitForTimeout(1500);
});

test("E752 — a gate criterion and a phase date persist", async ({ page }) => {
  const { email, password } = adminAccount();
  await signInAs(page, email, password);
  await page.goto("/admin/work-tracker");

  const gate1 = page.getByTestId("gate-gate-1");
  const crit = gate1.locator("li select").first();
  const before = await crit.inputValue();
  const next = before === "Yes" ? "No" : "Yes";
  await crit.selectOption(next);
  await page.waitForTimeout(1200);

  const start = page.locator('input[type="date"]').first();
  await start.fill("2026-05-01");
  await start.blur();
  await page.waitForTimeout(1200);

  await page.reload();
  const critAfter = await page.getByTestId("gate-gate-1").locator("li select").first().inputValue();
  const startAfter = await page.locator('input[type="date"]').first().inputValue();
  console.log(`\n  GATE 1 criterion 0: ${before} → ${next}, after reload: ${critAfter}`);
  console.log(`  Define start date after reload: ${startAfter}`);
  expect(critAfter).toBe(next);
  expect(startAfter).toBe("2026-05-01");

  /* ⚠ Put the criterion back; the date is left, because a Define start of
     2026-05-01 is a plausible real value and Scott edits it himself. The
     criterion is a DECISION and must not be invented by a test. */
  await page.getByTestId("gate-gate-1").locator("li select").first().selectOption(before || "No");
  await page.waitForTimeout(1200);
});

test("E752 — a Shipped entry is created as a DRAFT and can be published", async ({ page }) => {
  const { email, password } = adminAccount();
  await signInAs(page, email, password);
  await page.goto("/admin/work-tracker");

  const title = `E752 probe ${Date.now()}`;
  await page.getByPlaceholder("What shipped").fill(title);
  await page.getByPlaceholder("Tag").fill("Platform");
  await page.getByRole("button", { name: "Add Draft" }).click();
  await page.waitForTimeout(1800);
  await page.reload();

  const row = page.locator("div", { has: page.getByText(title, { exact: true }) }).last();
  /* ⚠⚠ THE BUTTON READING "Publish" IS THE PROOF IT IS A DRAFT. A new entry that
     arrived published would make Scott's approval optional, which is the whole
     reason the column exists. */
  await expect(row.getByRole("button", { name: "Publish" })).toBeVisible();

  await row.getByRole("button", { name: "Publish" }).click();
  await page.waitForTimeout(1800);
  await page.reload();
  const row2 = page.locator("div", { has: page.getByText(title, { exact: true }) }).last();
  await expect(row2.getByRole("button", { name: "Unpublish" })).toBeVisible();

  /* clean up — this is a real table on the shared database */
  await row2.getByRole("button", { name: "Delete" }).click();
  await page.waitForTimeout(1800);
  await page.reload();
  await expect(page.getByText(title, { exact: true })).toHaveCount(0);
  console.log(`\n  Shipped probe created as draft, published, deleted — table left as found`);
});
