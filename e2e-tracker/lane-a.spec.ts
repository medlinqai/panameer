import { test, expect } from "@playwright/test";
import { adminAccount, signInAs } from "./_admin";
import { disconnectTracker, restoreTracker, snapshotTracker, type TrackerSnapshot } from "./_state";
import { openPhase, openSection, openStage } from "./_open";

/**
 * `P2-ALL-E752` lane A acceptance — the admin can change a task status, a gate
 * criterion, a phase date and publish a Shipped entry, and each one PERSISTS.
 *
 * ⚠⚠ Every assertion re-loads the page before checking, so what is proved is
 * what the DATABASE holds — not what the component put in its own state.
 */


/* ⚠⚠⚠ THESE TESTS WRITE TO THE ONE SHARED DATABASE, AND `/status` IS PUBLIC.
   Snapshot before, restore after, and ASSERT the restore — `afterAll` runs even
   when a test fails, which is exactly when the data is dirtiest. See `_state.ts`
   for why this exists (my own spec published an invented date). */
let BEFORE: TrackerSnapshot;
test.beforeAll(async () => {
  BEFORE = await snapshotTracker();
});
test.afterAll(async () => {
  await restoreTracker(BEFORE);
  await disconnectTracker();
});

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
  /* ⚠ `E768` made Gates an expander; the assertion is unchanged, the path is not. */
  await openSection(page, "Gates");
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
  /* ⚠ Define opens by default, but `E768` collapsed its STAGES — DEF-003 lives in
     `AI Setup`. ⚠⚠ SUPERSEDED, quoted not deleted (`E164`):
     //   Define is open by default; DEF-003 is seeded "Not Started" or similar. */
  await openPhase(page, "Define");
  await openStage(page, "AI Setup");
  const row = page.locator("li", { has: page.getByText("DEF-003", { exact: true }) }).first();
  const select = row.locator("select").first();
  const before = await select.inputValue();
  const next = before === "Blocked" ? "In Progress" : "Blocked";
  await select.selectOption(next);
  await page.waitForTimeout(1500);

  /* ⚠⚠⚠ A RELOAD CLOSES THEM AGAIN, AND THAT COST A 3-MINUTE TIMEOUT. The
     expanders are component state, not a URL or a cookie, so every `reload()` in
     this file has to re-open its way back to the row. ⚠ Deliberately NOT fixed by
     persisting the open state: an admin landing on a page that remembers six
     open phases is the long-page problem `E768` just removed. */
  await page.reload();
  await openPhase(page, "Define");
  await openStage(page, "AI Setup");
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

  await openSection(page, "Gates");
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
  await openSection(page, "Gates");
  const critAfter = await page.getByTestId("gate-gate-1").locator("li select").first().inputValue();
  const startAfter = await page.locator('input[type="date"]').first().inputValue();
  console.log(`\n  GATE 1 criterion 0: ${before} → ${next}, after reload: ${critAfter}`);
  console.log(`  Define start date after reload: ${startAfter}`);
  expect(critAfter).toBe(next);
  expect(startAfter).toBe("2026-05-01");

  /*
    ⚠⚠⚠ THE OLD COMMENT HERE WAS WRONG BY THE TIME IT MATTERED, AND CORRECTING IT
    IS THE POINT (ruling 6 — a stated rule that contradicts correct behaviour is
    the more dangerous half). ⚠ SUPERSEDED, quoted not deleted (`E164`):
    //   Put the criterion back; the date is left, because a Define start of
    //   2026-05-01 is a plausible real value and Scott edits it himself.
    ⚠⚠ **IT IS NOT LEFT. `_state.ts`'s `afterAll` restores it**, and that is now
    load-bearing rather than tidy: Scott set Define to a REAL date (`2026-08-15`)
    and `/status` publishes it, so a test that left `2026-05-01` behind would
    print an invented date to the public — the exact defect the snapshot exists
    to prevent.
    ⚠ The criterion is still put back here as well, because it is a DECISION and
    the restore should not be the only thing standing between a test and one.
  */
  await openSection(page, "Gates");
  await page.getByTestId("gate-gate-1").locator("li select").first().selectOption(before || "No");
  await page.waitForTimeout(1200);
});

test("E752 — a Shipped entry is created as a DRAFT and can be published", async ({ page }) => {
  const { email, password } = adminAccount();
  await signInAs(page, email, password);
  await page.goto("/admin/work-tracker");

  const title = `E752 probe ${Date.now()}`;
  await openSection(page, "Shipped");
  await page.getByPlaceholder("What shipped").fill(title);
  await page.getByPlaceholder("Tag").fill("Platform");
  /* ⚠ `E768` renamed the form submit to `Create Draft` — the section header now
     owns `Add Shipped Entry`, and two buttons with one accessible name was a
     strict-mode violation. */
  await page.getByRole("button", { name: "Create Draft" }).click();
  await page.waitForTimeout(1800);
  await page.reload();
  await openSection(page, "Shipped");

  const row = page.locator("div", { has: page.getByText(title, { exact: true }) }).last();
  /* ⚠⚠ THE BUTTON READING "Publish" IS THE PROOF IT IS A DRAFT. A new entry that
     arrived published would make Scott's approval optional, which is the whole
     reason the column exists. */
  await expect(row.getByRole("button", { name: "Publish" })).toBeVisible();

  await row.getByRole("button", { name: "Publish" }).click();
  await page.waitForTimeout(1800);
  await page.reload();
  await openSection(page, "Shipped");
  const row2 = page.locator("div", { has: page.getByText(title, { exact: true }) }).last();
  await expect(row2.getByRole("button", { name: "Unpublish" })).toBeVisible();

  /* clean up — this is a real table on the shared database */
  await row2.getByRole("button", { name: "Delete" }).click();
  await page.waitForTimeout(1800);
  await page.reload();
  await openSection(page, "Shipped");
  await expect(page.getByText(title, { exact: true })).toHaveCount(0);
  console.log(`\n  Shipped probe created as draft, published, deleted — table left as found`);
});
