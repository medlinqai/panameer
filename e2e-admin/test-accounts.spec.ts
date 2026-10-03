import { expect, test } from "@playwright/test";
import { adminAccount, signInAs } from "../e2e-tracker/_admin";
import { db } from "../e2e-shell/_db";

/**
 * ── `E793` — TEST ACCOUNTS, THROUGH THE SCREEN ──────────────────────────────
 *
 * ⚠ The logic is proven without a browser by `check:test-accounts` (28
 * assertions, mutation-tested because this is data-loss logic). What only a
 * browser can prove is the part Scott touches: the chip, the filter, and that
 * the destructive button cannot fire on one click.
 *
 * ⚠⚠ **IT CREATES NOTHING AND DELETES NOTHING.** The remove flow is exercised
 * up to — and not past — the confirmation, so a live database with real members
 * is never acted on by this file.
 */
const prisma = db();

test.beforeEach(async ({ page }) => {
  const { email, password } = adminAccount();
  await signInAs(page, email, password);
});

test("the page carries the test-account controls and the All/Real/Test filter", async ({ page }) => {
  await page.goto("/admin/buyers-sellers", { waitUntil: "domcontentloaded" });
  const panel = page.locator("text=Test accounts").first();
  await expect(panel).toBeVisible();
  for (const label of ["All", "Real", "Test"]) {
    await expect(page.getByRole("link", { name: label, exact: true })).toBeVisible();
  }
  await expect(page.getByRole("button", { name: "Create Test Set" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Remove Test Accounts/ })).toBeVisible();
});

test("the Real filter never lists a test account, and All is the default", async ({ page }) => {
  /** ⚠ Read the truth from the database first, so the assertion is against a
   *  fact rather than against the page's own claim. */
  const testEmails = (
    await prisma.user.findMany({ where: { is_test: true }, select: { email: true } })
  ).map((u) => u.email);

  await page.goto("/admin/buyers-sellers?test=real", { waitUntil: "domcontentloaded" });
  const realBody = await page.locator("body").innerText();
  for (const e of testEmails) {
    expect(realBody, `${e} is a test account and must not show under Real`).not.toContain(e);
  }
  /** ⚠⚠ The default is All — a filter that defaults to hiding rows is how a
   *  count and its list start disagreeing. */
  await page.goto("/admin/buyers-sellers", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("link", { name: "All", exact: true })).toHaveClass(/bg-ink/);
});

test("Remove asks before it acts, and the button stays dead until the phrase matches", async ({ page }) => {
  await page.goto("/admin/buyers-sellers", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /Remove Test Accounts/ }).click();

  const count = await prisma.user.count({ where: { is_test: true } });
  if (count === 0) {
    /** ⚠ The honest branch: with no test accounts it must SAY so rather than
     *  offering a delete with nothing behind it. */
    await expect(page.getByText("There are no test accounts to remove.")).toBeVisible({ timeout: 20_000 });
    return;
  }

  /** ⚠⚠⚠ THE LIST IS SHOWN BEFORE ANYTHING IS TYPED — "lists exactly what will
   *  go", per the brief. */
  await expect(page.getByText(/accounts will be deleted/)).toBeVisible({ timeout: 20_000 });
  const del = page.getByRole("button", { name: "Delete Them" });
  await expect(del, "the delete must start disabled").toBeDisabled();

  const box = page.getByRole("textbox", { name: /confirmation phrase/i });
  await box.fill("REMOVE");
  await expect(del, "a partial phrase must not arm it").toBeDisabled();
  await box.fill(`REMOVE ${count + 1}`);
  await expect(del, "a wrong count must not arm it").toBeDisabled();
  await box.fill(`REMOVE ${count}`);
  await expect(del, "the exact counted phrase arms it").toBeEnabled();

  /** ⚠⚠ AND IT STOPS HERE. Cancel, not Delete — this file does not delete from a
   *  database that has real members on it. */
  await page.getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByText(/accounts will be deleted/)).toHaveCount(0);
  expect(await prisma.user.count({ where: { is_test: true } }), "nothing was deleted").toBe(count);
});
