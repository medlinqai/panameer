import { test, expect } from "@playwright/test";
import { createFixture, dropFixture, signIn, createSettlement, type R1Fixture } from "./_fixture";

let f: R1Fixture | null = null;
test.beforeAll(async () => { f = await createFixture({ feeBps: 999 }); });
test.afterAll(async () => { await dropFixture(f); });

// Lane 1: the provider sees the fee and their net; the buyer does not.
test("fee: provider sees fee % and net on the work order and the payment request", async ({ page }) => {
  const sid = await createSettlement(f!);
  await signIn(page, f!.provider.email);
  await page.goto(`/orders/${f!.orderId}`);
  await expect(page.getByText("Service fee")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(/9\.99% · \$149\.85/)).toBeVisible();
  await expect(page.getByText("$1,350.15")).toBeVisible();
  await page.goto(`/payments/payment-requests/${sid}`);
  await expect(page.getByText(/9\.99% · \$49\.95/)).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("$450.05")).toBeVisible();

  await signIn(page, f!.buyer.email);
  await page.goto(`/orders/${f!.orderId}`);
  await expect(page.getByText("Not to exceed")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("Service fee")).toHaveCount(0);
});
