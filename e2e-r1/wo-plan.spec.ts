import { test, expect } from "@playwright/test";
import { db } from "../e2e-shell/_db";
import { createFixture, dropFixture, signIn, createSettlement, type R1Fixture } from "./_fixture";

// Work Order Plan (R2), behind the order's Plan tab. Throwaway users only.
let f: R1Fixture | null = null;
test.beforeAll(async () => { f = await createFixture(); });
test.afterAll(async () => { await dropFixture(f); });

test("lane 1: Plan tab shows Time | Dollars from real figures; Overview unchanged", async ({ page }) => {
  await db().workOrder.update({ where: { id: f!.orderId }, data: { period_start: new Date("2026-10-01"), period_end: new Date("2026-12-31") } });
  const paidId = await createSettlement(f!, "APPROVED");
  await db().payment.create({ data: { payment_number: `PAY-W-${f!.tag}`.slice(0, 40), p_account_id: f!.pAccountId, received_at: new Date(), amount_cents: 50000, status: "ALLOCATED",
    lines: { create: [{ line_number: 1, settlement_request_id: paidId, amount_cents: 50000 }] } } });
  await createSettlement(f!, "SUBMITTED");

  await signIn(page, f!.provider.email);
  await page.goto(`/orders/${f!.orderId}`);
  await expect(page.getByTestId("order-money")).toBeVisible({ timeout: 30_000 });
  await page.getByRole("link", { name: "Plan", exact: true }).click();
  const td = page.getByTestId("time-dollars");
  await expect(td).toBeVisible({ timeout: 30_000 });
  await expect(td.getByText("of 10 hours")).toBeVisible();
  await expect(td.getByText("$500.00 left to be paid", { exact: false })).toHaveCount(0);
  await expect(td.getByText("$500.00").first()).toBeVisible();
  await expect(td.getByText("Paid $500.00")).toBeVisible();
  await expect(td.getByText("Awaiting approval $500.00")).toBeVisible();
  for (const w of [1440, 390]) {
    await page.setViewportSize({ width: w, height: 900 });
    await page.screenshot({ path: `e2e-r1/.artifacts/wo-plan-header-${w}.png` });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(w);
  }
});
