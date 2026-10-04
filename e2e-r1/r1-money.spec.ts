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

// Lane 5: the admin lists show the fixture's order and its request.
test("admin lists: work orders and payment requests list real rows", async ({ page }) => {
  const sid = await createSettlement(f!);
  const num = (await db().settlementRequest.findUnique({ where: { id: sid }, select: { settlement_number: true } }))!.settlement_number;
  const { email, password } = adminAccount();
  await signInAs(page, email, password);
  await page.goto("/admin/work-orders");
  await page.getByPlaceholder("Search work orders").fill(f!.tag);
  await expect(page.getByText(`WO-${f!.tag}`)).toBeVisible({ timeout: 30_000 });
  await page.goto("/admin/settlements");
  await page.getByPlaceholder("Search payment requests").fill(f!.tag);
  await expect(page.getByText(num)).toBeVisible({ timeout: 30_000 });
  await page.goto("/admin/payments");
  await expect(page.getByRole("heading", { name: /Payments Received/ })).toBeVisible({ timeout: 30_000 });
});

// Lane 6: the order header shows hours, approved, paid and what is left under the cap.
test("work order header: hours, approved, paid, remaining", async ({ page }) => {
  const g = await createFixture({ feeBps: 999 });
  try {
    const sid = await createSettlement(g, "APPROVED");
    await db().payment.create({
      data: { payment_number: `PAY-${g.tag}`.slice(0, 40), p_account_id: g.pAccountId, received_at: new Date(), amount_cents: 20000, status: "PARTIALLY_ALLOCATED",
        lines: { create: [{ line_number: 1, settlement_request_id: sid, amount_cents: 20000 }] } },
    });
    await signIn(page, g.buyer.email);
    await page.goto(`/orders/${g.orderId}`);
    const m = page.getByTestId("order-money");
    await expect(m).toBeVisible({ timeout: 30_000 });
    await expect(m.getByText("5 of 10")).toBeVisible();
    await expect(m.getByText("$500.00")).toBeVisible();
    await expect(m.getByText("$200.00")).toBeVisible();
    await expect(m.getByText("$1,000.00")).toBeVisible();
    await page.setViewportSize({ width: 390, height: 900 });
    await page.screenshot({ path: "e2e-r1/.artifacts/order-money-390.png" });
  } finally {
    await dropFixture(g);
  }
});

// Lane 7: two requests at the same moment cannot overdraw; a closed order takes no more; paying in full closes it.
test("safety: concurrent requests cannot overdraw, close blocks new requests, full payment auto-closes", async ({ page }) => {
  const g = await createFixture({ feeBps: 999 });
  const h = await createFixture({ feeBps: 999 });
  try {
    await signIn(page, g.provider.email);
    const statuses = await page.evaluate(async ({ orderId, lineId }) => {
      const send = () => fetch("/api/settlements", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, periodStart: "2026-10-01", periodEnd: "2026-10-07", lines: [{ workOrderLineId: lineId, quantity: 8, serviceDate: "2026-10-03" }] }) }).then((r) => r.status);
      return Promise.all([send(), send()]);
    }, { orderId: g.orderId, lineId: g.rateLineId });
    expect(statuses.sort(), "exactly one of two 8-hour claims on a 10-hour line goes through").toEqual([200, 400]);
    const line = await db().workOrderLine.findUnique({ where: { id: g.rateLineId }, select: { drawn_quantity: true } });
    expect(Number(line?.drawn_quantity)).toBe(8);

    await db().settlementRequest.updateMany({ where: { work_order_id: g.orderId }, data: { status: "APPROVED", decided_at: new Date() } });
    await signIn(page, g.buyer.email);
    await page.goto(`/orders/${g.orderId}`);
    await page.getByRole("button", { name: "Close Work Order" }).click();
    await page.getByRole("button", { name: "Yes, Close It" }).click();
    await expect.poll(async () => (await db().workOrder.findUnique({ where: { id: g.orderId }, select: { status: true } }))?.status, { timeout: 30_000 }).toBe("CLOSED");
    await signIn(page, g.provider.email);
    const after = await page.evaluate(async ({ orderId, lineId }) => (await fetch("/api/settlements", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId, periodStart: "2026-10-01", periodEnd: "2026-10-07", lines: [{ workOrderLineId: lineId, quantity: 1, serviceDate: "2026-10-04" }] }) })).status, { orderId: g.orderId, lineId: g.rateLineId });
    expect(after, "a closed order refuses a new payment request").toBe(400);

    // h: bill the whole order (10h + workshop = $1,500 = cap), buyer pays all of it → closes itself.
    const s = await db().settlementRequest.create({
      data: { settlement_number: `PR-${h.tag}-full`, work_order_id: h.orderId, provider_person_id: h.provider.personId, period_start: new Date("2026-10-01"), period_end: new Date("2026-10-07"),
        status: "APPROVED", submitted_at: new Date(), decided_at: new Date(),
        lines: { create: [
          { line_number: 1, work_order_line_id: h.rateLineId, basis: "RATE", uom: "HOUR", quantity: 10, unit_price_cents: 10000 },
          { line_number: 2, work_order_line_id: h.amountLineId, basis: "AMOUNT", amount_cents: 50000 },
        ] } },
      select: { id: true },
    });
    const { email, password } = adminAccount();
    await signInAs(page, email, password);
    const rec = await page.evaluate(async ({ acct, sid }) => (await fetch("/api/admin/payments", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pAccountId: acct, amountCents: 150000, receivedAt: "2026-10-04", allocations: [{ settlementId: sid, amountCents: 150000 }] }) })).status, { acct: h.pAccountId, sid: s.id });
    expect(rec).toBe(200);
    expect((await db().workOrder.findUnique({ where: { id: h.orderId }, select: { status: true } }))?.status).toBe("CLOSED");
  } finally {
    await dropFixture(g);
    await dropFixture(h);
  }
});

// Lane 8: a buyer offers on a product, the seller accepts, the buyer completes the cart and orders it.
test("service product: offer → accept → complete → work order at the service-product fee", async ({ page }) => {
  const g = await createFixture();
  try {
    const prisma = db();
    const profile = await prisma.providerProfile.findUnique({ where: { person_id: g.provider.personId }, select: { id: true } });
    const product = await prisma.serviceProduct.create({
      data: { provider_profile_id: profile!.id, title: `R1 Health Check ${g.tag}`, summary: "A fixed-price review.", pricing_type: "FIXED", price_cents: 50000, status: "PUBLISHED" },
      select: { id: true },
    });

    await signIn(page, g.buyer.email);
    await page.goto("/shop");
    await expect(page.getByRole("link", { name: `R1 Health Check ${g.tag}` })).toBeVisible({ timeout: 30_000 });
    await page.goto(`/shop/${product.id}`);
    const offer = page.getByTestId("make-offer");
    await offer.getByLabel("Your offer").fill("450");
    await offer.getByRole("button", { name: "Make an Offer" }).click();
    await expect(page.getByTestId("offer-sent")).toBeVisible({ timeout: 30_000 });

    const o = await prisma.serviceProductOffer.findFirst({ where: { buyer_person_id: g.buyer.personId }, select: { id: true } });
    await signIn(page, g.provider.email);
    await page.goto(`/shop/${product.id}`);
    await expect(page.getByTestId("make-offer")).toHaveCount(0, { timeout: 30_000 });
    const acc = await page.evaluate(async (offerId) => (await fetch("/api/provider/offers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "accept", offerId }) })).status, o!.id);
    expect(acc).toBe(200);

    const wr = await prisma.workRequest.findFirst({ where: { buyer_person_id: g.buyer.personId }, select: { id: true } });
    await signIn(page, g.buyer.email);
    await page.goto(`/work-requests/${wr!.id}`);
    await page.getByRole("button", { name: "Complete" }).click();
    const create = page.getByRole("button", { name: /Create (the )?(Work )?Order/i });
    await expect(create).toBeVisible({ timeout: 30_000 });
    await create.click();
    await expect.poll(async () => prisma.workOrder.count({ where: { work_request_id: wr!.id } }), { timeout: 30_000 }).toBe(1);
    const line = await prisma.workOrderLine.findFirst({ where: { workOrder: { work_request_id: wr!.id } }, select: { fee_bps: true, amount_cents: true } });
    expect(line?.amount_cents).toBe(45000);
    const rows = await prisma.applicationCommission.findMany({ where: { sourcing_kind: "SERVICE_PRODUCT" }, select: { rate_bps: true, transaction_type: true } });
    const expected = rows.find((r) => r.transaction_type === "SERVICE_BY_AMT")?.rate_bps ?? rows.find((r) => r.transaction_type == null)?.rate_bps ?? 1499;
    expect(line?.fee_bps, "a product line bills at the service-product rate, not app-sourced").toBe(expected);
  } finally {
    await dropFixture(g);
  }
});
