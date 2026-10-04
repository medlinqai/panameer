import { test, expect } from "@playwright/test";
import { db } from "../e2e-shell/_db";
import { adminAccount, signInAs } from "../e2e-tracker/_admin";
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

// Lane 3: admin records one buyer payment and splits it across two work orders.
test("admin payments: record one payment across two work orders; a request paid in full becomes PAID", async ({ page }) => {
  const f2 = await createFixture({ feeBps: 499 });
  try {
    const s1 = await createSettlement(f!, "APPROVED");
    const s2 = await createSettlement(f2, "APPROVED");
    const prisma = db();
    const num = async (id: string) => (await prisma.settlementRequest.findUnique({ where: { id }, select: { settlement_number: true } }))!.settlement_number;
    const [n1, n2] = [await num(s1), await num(s2)];

    const { email, password } = adminAccount();
    await signInAs(page, email, password);
    await page.goto("/admin/payments");
    const form = page.getByTestId("record-payment");
    await expect(form).toBeVisible({ timeout: 30_000 });
    await form.locator("select").selectOption(f!.pAccountId);
    await form.getByLabel("Amount received").fill("800");
    await form.getByLabel("Bank reference").fill(`e2e ${f!.tag}`);
    await form.getByLabel(`Apply to ${n1}`).fill("500");
    await form.getByLabel(`Apply to ${n2}`).fill("300");
    await form.getByRole("button", { name: "Record Payment" }).click();
    await expect(form.getByText(/Recorded PAY-/)).toBeVisible({ timeout: 30_000 });

    const st = async (id: string) => (await prisma.settlementRequest.findUnique({ where: { id }, select: { status: true } }))!.status;
    expect(await st(s1)).toBe("PAID");
    expect(await st(s2)).toBe("APPROVED");
    const pay = await prisma.payment.findFirst({ where: { external_ref: `e2e ${f!.tag}` }, include: { lines: true } });
    expect(pay?.status).toBe("ALLOCATED");
    expect(pay?.lines.map((l) => l.amount_cents).sort()).toEqual([30000, 50000]);
    await page.screenshot({ path: "e2e-r1/.artifacts/admin-payments-1280.png", fullPage: true });

    const over = await page.evaluate(async ({ acct, sid }) => {
      const r = await fetch("/api/admin/payments", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pAccountId: acct, amountCents: 50000, receivedAt: "2026-10-04", allocations: [{ settlementId: sid, amountCents: 30000 }] }) });
      return r.status;
    }, { acct: f!.pAccountId, sid: s2 });
    expect(over, "allocating more than the request still owes is refused").toBe(409);
  } finally {
    await dropFixture(f2);
  }
});

// Lane 4: once the buyer has paid, admin records the payout and the provider sees Paid.
test("payouts: provider sees Payout pending, admin records payout, provider sees Paid + net", async ({ page }) => {
  const g = await createFixture({ feeBps: 999 });
  try {
    const sid = await createSettlement(g, "APPROVED");
    const prisma = db();
    const number = (await prisma.settlementRequest.findUnique({ where: { id: sid }, select: { settlement_number: true } }))!.settlement_number;
    const { email, password } = adminAccount();
    await signInAs(page, email, password);
    const rec = await page.evaluate(async ({ acct, sid }) => {
      const r = await fetch("/api/admin/payments", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pAccountId: acct, amountCents: 50000, receivedAt: "2026-10-04", externalRef: "e2e payout", allocations: [{ settlementId: sid, amountCents: 50000 }] }) });
      return r.status;
    }, { acct: g.pAccountId, sid });
    expect(rec).toBe(200);

    await signIn(page, g.provider.email);
    await page.goto(`/payments/payment-requests/${sid}`);
    await expect(page.getByText("Payout pending")).toBeVisible({ timeout: 30_000 });

    await signInAs(page, email, password);
    await page.goto("/admin/payments");
    const row = page.locator(`[data-payout="${number}"]`);
    await expect(row).toBeVisible({ timeout: 30_000 });
    await expect(row.getByText("$450.05")).toBeVisible();
    await row.getByLabel(`Reference for ${number}`).fill("e2e-ach-1");
    await row.getByRole("button", { name: "Record Payout" }).click();
    await expect(page.locator(`[data-payout="${number}"]`)).toHaveCount(0, { timeout: 30_000 });

    const n = await prisma.notification.findFirst({ where: { person_id: g.provider.personId, event_key: "payment.sent" }, select: { title: true } });
    expect(n?.title).toContain("$450.05");

    await signIn(page, g.provider.email);
    await page.goto(`/payments/payment-requests/${sid}`);
    const paid = page.getByTestId("paid-out");
    await expect(paid).toBeVisible({ timeout: 30_000 });
    await expect(paid.getByText("$450.05")).toBeVisible();
    await expect(page.getByText("Payout pending")).toHaveCount(0);
    await page.screenshot({ path: "e2e-r1/.artifacts/provider-paid-390.png" });
  } finally {
    await dropFixture(g);
  }
});
