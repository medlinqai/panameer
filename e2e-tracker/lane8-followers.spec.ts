import { test, expect } from "@playwright/test";
import { adminAccount, signInAs } from "./_admin";
import { disconnectTracker, restoreTracker, snapshotTracker, type TrackerSnapshot } from "./_state";
import { NOTIFICATION_EMAIL_EVENTS } from "../src/lib/notification-email";

/**
 * `P2-ALL-E758` — followers. Bell only; **no mail may leave the branch.**
 */

/* ⚠⚠ Following is tracker state; snapshot and restore it like the rest. */
let BEFORE: TrackerSnapshot;
test.beforeAll(async () => {
  BEFORE = await snapshotTracker();
});
test.afterAll(async () => {
  await restoreTracker(BEFORE);
  await disconnectTracker();
});

test("E758 — the three events are NOT on the email allowlist", () => {
  /* ⚠⚠⚠ THE WHOLE SAFETY PROPERTY OF THIS LANE, ASSERTED RATHER THAN PROMISED.
     Adding a key to this allowlist is the one-line diff that mails real members
     from a database that also serves production (ruling 38). ⚠ If someone adds
     one later, this test is what tells them it was a product decision. */
  for (const e of ["work_tracker.shipped", "work_tracker.gate_passed", "work_tracker.milestone"]) {
    expect(
      (NOTIFICATION_EMAIL_EVENTS as readonly string[]).includes(e),
      `${e} must not send email from this branch`
    ).toBe(false);
  }
  /* ⚠ Paired positive: the allowlist still holds what it held, so this is not
     passing because the list vanished. */
  expect((NOTIFICATION_EMAIL_EVENTS as readonly string[]).length).toBeGreaterThan(0);
});

test("E758 — a signed-out visitor is offered sign-up, not a follow", async ({ page }) => {
  await page.goto("/status");
  const btn = page.getByTestId("follow-hero");
  await expect(btn).toBeVisible();
  await btn.click();
  await expect(page).toHaveURL(/\/join\?.*follow=1/);
  /* ⚠ And the intent carries the destination with it. */
  /* ⚠ Next does not percent-encode a param it builds into a push; the assertion
     matches what the browser actually shows rather than what I assumed. */
  expect(page.url()).toContain("next=/status");
});

test("E758 — follow, unfollow, and the ?follow=1 return path", async ({ page }) => {
  const { email, password } = adminAccount();
  await signInAs(page, email, password);

  /* ⚠⚠ NORMALISE FIRST. A previous partial run can leave this persona following,
     and a test that only works from one starting state is a test that fails for a
     reason that has nothing to do with the code. */
  await page.goto("/status");
  if ((await page.getByTestId("follow-hero").innerText()).includes("Following")) {
    await page.getByTestId("follow-hero").click();
    await expect(page.getByTestId("follow-hero")).toHaveText("Follow the Build");
  }

  await expect(page.getByTestId("follow-hero")).toHaveText("Follow the Build");
  await page.getByTestId("follow-hero").click();
  await expect(page.getByTestId("follow-hero")).toHaveText("Following ✓");

  /* ⚠ It survives a reload — the state is in the database, not in the component. */
  await page.reload();
  await expect(page.getByTestId("follow-hero")).toHaveText("Following ✓");

  /* ⚠⚠ THE SIGN-UP RETURN PATH IS IDEMPOTENT: arriving with ?follow=1 while
     already following changes nothing and must not error. */
  await page.goto("/status?follow=1");
  await expect(page.getByTestId("follow-hero")).toHaveText("Following ✓");

  /* ⚠ Unfollow deletes the row — and the button says so. */
  await page.getByTestId("follow-hero").click();
  await expect(page.getByTestId("follow-hero")).toHaveText("Follow the Build");
  await page.reload();
  await expect(page.getByTestId("follow-hero")).toHaveText("Follow the Build");

  /* ⚠⚠ AND THE RETURN PATH FOLLOWS WHEN NOT ALREADY FOLLOWING — otherwise the
     test above would pass against a page that never follows at all. */
  await page.goto("/status?follow=1");
  await expect(page.getByTestId("follow-hero")).toHaveText("Following ✓");

  /* clean up: this is the one shared database */
  await page.getByTestId("follow-hero").click();
  await expect(page.getByTestId("follow-hero")).toHaveText("Follow the Build");
});

test("E758 — the follower count is hidden below the floor", async ({ page }) => {
  await page.goto("/status");
  /* ⚠ With 0–24 followers the line must be absent, not shown small: "3 people
     following" makes a young page look emptier than silence does. */
  await expect(page.getByText(/people following the build/)).toHaveCount(0);
});
