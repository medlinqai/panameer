import { test, expect } from "@playwright/test";
import { db } from "../e2e-shell/_db";
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

// Lane 2: a submitted request notifies the buyer; once approved the buyer sees what to pay and how.
test("payment due: buyer is notified, approves, and sees amount + reference + pay instructions", async ({ page }) => {
  await signIn(page, f!.provider.email);
  const created = await page.evaluate(async ({ orderId, lineId }) => {
    const r = await fetch("/api/settlements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId, periodStart: "2026-10-01", periodEnd: "2026-10-07", lines: [{ workOrderLineId: lineId, quantity: 2, serviceDate: "2026-10-03" }] }),
    });
    return { status: r.status, body: (await r.json()) as { id?: string; settlementNumber?: string; error?: string } };
  }, { orderId: f!.orderId, lineId: f!.rateLineId });
  expect(created.status, JSON.stringify(created.body)).toBe(200);
  const sid = created.body.id!;

  const n = await db().notification.findFirst({ where: { person_id: f!.buyer.personId, event_key: "work.settlement_approval" }, select: { title: true, href: true } });
  expect(n?.title).toContain("$200.00");
  expect(n?.href).toBe(`/payments/payment-requests/${sid}`);

  await signIn(page, f!.buyer.email);
  await page.goto(`/payments/payment-requests/${sid}`);
  await expect(page.getByTestId("payment-due")).toHaveCount(0, { timeout: 30_000 });
  const ok = await page.evaluate(async (id) => (await fetch(`/api/settlements/${id}/approve`, { method: "POST" })).status, sid);
  expect(ok).toBe(200);
  await page.reload();
  const due = page.getByTestId("payment-due");
  await expect(due).toBeVisible({ timeout: 30_000 });
  await expect(due.getByText("$200.00")).toBeVisible();
  await expect(due.getByText(created.body.settlementNumber!).first()).toBeVisible();
  await page.screenshot({ path: "e2e-r1/.artifacts/payment-due-1280.png", fullPage: true });

  await signIn(page, f!.provider.email);
  await page.goto(`/payments/payment-requests/${sid}`);
  await expect(page.getByText("You'll get")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("payment-due")).toHaveCount(0);
});
