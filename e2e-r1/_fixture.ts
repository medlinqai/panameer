import bcrypt from "bcryptjs";
import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { db } from "../e2e-shell/_db";

// Throwaway R1 money fixture: one buyer, one provider, one RELEASED work order. Removes only what it made.
export const PASSWORD = "Panameer123";
export type R1Fixture = {
  tag: string;
  buyer: { email: string; userId: string; personId: string };
  provider: { email: string; userId: string; personId: string };
  orderId: string;
  rateLineId: string;
  amountLineId: string;
  pAccountId: string;
};

export async function createFixture(opts: { feeBps?: number } = {}): Promise<R1Fixture> {
  const prisma = db();
  const tag = `r1money-${Date.now()}`;
  const host = await prisma.person.findFirst({
    select: { company_id: true, site_id: true },
    orderBy: [{ created_at: "asc" }, { id: "asc" }],
  });
  const company = host ? await prisma.company.findUnique({ where: { id: host.company_id }, select: { p_account_id: true } }) : null;
  if (!host || !company) throw new Error("no company to borrow");
  const hash = await bcrypt.hash(PASSWORD, 10);
  const mk = async (role: "buyer" | "provider") => {
    const email = `${tag}-${role}@example.seed`;
    const u = await prisma.user.create({
      data: { email, password_hash: hash, email_verified: new Date(), first_name: role === "buyer" ? "Bea" : "Pat", last_name: "R1test" },
      select: { id: true },
    });
    const p = await prisma.person.create({
      data: {
        user_id: u.id, first_name: role === "buyer" ? "Bea" : "Pat", last_name: "R1test",
        company_id: host.company_id, site_id: host.site_id,
        is_service_buyer: role === "buyer", is_service_provider: role === "provider",
      },
      select: { id: true },
    });
    if (role === "provider") await prisma.providerProfile.create({ data: { person_id: p.id, status: "ACTIVE", currency: "USD", work_method: "SERVICES" } });
    return { email, userId: u.id, personId: p.id };
  };
  const buyer = await mk("buyer");
  const provider = await mk("provider");
  const fee = opts.feeBps ?? 999;
  const order = await prisma.workOrder.create({
    data: {
      order_number: `WO-${tag}`, origin: "DIRECT", buyer_person_id: buyer.personId, provider_person_id: provider.personId,
      p_account_id: company.p_account_id, status: "RELEASED", not_to_exceed_cents: 150000, fee_bps: fee,
      provider_accepted_at: new Date(), buyer_accepted_at: new Date(), buyer_released_at: new Date(),
      lines: {
        create: [
          { line_number: 1, transaction_type: "SERVICE_BY_QTY", description: "Consulting hours", uom: "HOUR", quantity: 10, unit_price_cents: 10000, fee_bps: fee },
          { line_number: 2, transaction_type: "SERVICE_BY_AMT", description: "Workshop", amount_cents: 50000, fee_bps: fee },
        ],
      },
    },
    select: { id: true, lines: { select: { id: true, line_number: true } } },
  });
  return {
    tag, buyer, provider, orderId: order.id, pAccountId: company.p_account_id,
    rateLineId: order.lines.find((l) => l.line_number === 1)!.id,
    amountLineId: order.lines.find((l) => l.line_number === 2)!.id,
  };
}

export async function dropFixture(f: R1Fixture | null): Promise<void> {
  if (!f) return;
  const prisma = db();
  const settlements = await prisma.settlementRequest.findMany({ where: { work_order_id: f.orderId }, select: { id: true, lines: { select: { id: true } } } });
  const sIds = settlements.map((s) => s.id);
  const sLineIds = settlements.flatMap((s) => s.lines.map((l) => l.id));
  const payLines = await prisma.paymentLine.findMany({ where: { settlement_request_id: { in: sIds } }, select: { payment_id: true } });
  const payoutLines = await prisma.providerPayoutLine.findMany({ where: { settlement_line_id: { in: sLineIds } }, select: { provider_payout_id: true } });
  await prisma.providerPayout.deleteMany({ where: { id: { in: payoutLines.map((p) => p.provider_payout_id) } } });
  await prisma.payment.deleteMany({ where: { id: { in: payLines.map((p) => p.payment_id) } } });
  await prisma.settlementRequest.deleteMany({ where: { id: { in: sIds } } });
  const extraOrders = await prisma.workOrder.findMany({ where: { buyer_person_id: f.buyer.personId }, select: { id: true } });
  const allOrders = [f.orderId, ...extraOrders.map((o) => o.id)];
  await prisma.plan.deleteMany({ where: { owner_key: { in: allOrders.map((id) => `wo:${id}`) } } });
  await prisma.workOrderEvent.deleteMany({ where: { work_order_id: { in: allOrders } } });
  await prisma.workOrder.deleteMany({ where: { id: { in: [f.orderId, ...extraOrders.map((o) => o.id)] } } });
  await prisma.workRequest.deleteMany({ where: { buyer_person_id: f.buyer.personId } });
  await prisma.serviceProductOffer.deleteMany({ where: { OR: [{ buyer_person_id: f.buyer.personId }, { provider_person_id: f.provider.personId }] } });
  await prisma.serviceProduct.deleteMany({ where: { providerProfile: { person_id: f.provider.personId } } });
  await prisma.notification.deleteMany({ where: { person_id: { in: [f.buyer.personId, f.provider.personId] } } });
  await prisma.person.deleteMany({ where: { id: { in: [f.buyer.personId, f.provider.personId] } } });
  await prisma.user.deleteMany({ where: { id: { in: [f.buyer.userId, f.provider.userId] } } });
}

export async function signIn(page: Page, email: string, password = PASSWORD) {
  await page.context().clearCookies();
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await page.waitForSelector('input[type="email"]');
  await page.waitForTimeout(1000);
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await Promise.all([
    page.waitForResponse((r) => r.url().includes("/api/auth/callback/credentials")),
    page.click('button[type="submit"]'),
  ]);
  await page.waitForURL((u) => new URL(u).pathname !== "/login", { timeout: 20_000 }).catch(() => {});
  expect(new URL(page.url()).pathname).not.toBe("/login");
}

/** A submitted payment request against the fixture order: 5 hours on the rate line. */
export async function createSettlement(f: R1Fixture, status: "SUBMITTED" | "APPROVED" = "SUBMITTED"): Promise<string> {
  const prisma = db();
  const s = await prisma.settlementRequest.create({
    data: {
      settlement_number: `PR-${f.tag}-${Math.random().toString(36).slice(2, 7)}`,
      work_order_id: f.orderId, provider_person_id: f.provider.personId,
      period_start: new Date("2026-10-01"), period_end: new Date("2026-10-07"),
      status, submitted_at: new Date(), ...(status === "APPROVED" ? { decided_at: new Date(), decided_by_person_id: f.buyer.personId } : {}),
      lines: { create: [{ line_number: 1, work_order_line_id: f.rateLineId, basis: "RATE", uom: "HOUR", quantity: 5, unit_price_cents: 10000, service_date: new Date("2026-10-02") }] },
    },
    select: { id: true },
  });
  await prisma.workOrderLine.update({ where: { id: f.rateLineId }, data: { drawn_quantity: { increment: 5 }, drawn_amount_cents: { increment: 50000 } } });
  return s.id;
}
