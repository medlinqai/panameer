// O-E001..O-E005 dev walk (no Playwright): issue → both accept (Open) → change order → provider accepts → payment request (due date)
// → Hold blocks a request → Release → Close → request still payable → Finally Close refused while pending → approve → Finally Close.
// Run: MAIL_CAPTURE=1 npx tsx --env-file=.env.local scripts/dev-walk-order.ts  (throwaway is_test parties; removed at the end)
import { prisma } from "@/lib/prisma";
import { controlOrder, getOrderDetail } from "@/lib/orders";
import { decideChange, proposeChange } from "@/lib/change-orders";
import { approveSettlement, createSettlement } from "@/lib/settlements";
import { openRequests } from "@/lib/admin-money";
import { check, cleanup, done, party, refuses } from "./lib/dev-fixture";

async function main() {
  const buyer = await party("BUYER", "Bea");
  const prov = await party("PROVIDER", "Pat");
  const start = new Date(Date.UTC(2026, 8, 1));
  const end = new Date(Date.UTC(2026, 11, 31));
  const o = await prisma.workOrder.create({
    data: {
      order_number: `WO-DEVWALK-${Date.now().toString(36)}`, origin: "INDIRECT", buyer_person_id: buyer.personId, provider_person_id: prov.personId, p_account_id: buyer.pAccountId,
      status: "ISSUED", period_start: start, period_end: end, fee_bps: 1490, not_to_exceed_cents: 40 * 10000 + 600000,
      lines: { create: [
        { line_number: 1, transaction_type: "SERVICE_BY_QTY", fee_bps: 1490, description: "Consulting", uom: "HOUR", quantity: 40, unit_price_cents: 10000, billing_cycle: "MONTHLY", payment_terms: "NET30", payment_trigger: "TIMESHEET" },
        { line_number: 2, transaction_type: "SERVICE_BY_AMT", fee_bps: 1490, description: "Blanket: consulting + travel", amount_cents: 600000, billing_cycle: "MONTHLY", payment_terms: "NET15", payment_trigger: "PAYMENT_REQUEST" },
      ] },
    },
    include: { lines: { orderBy: { line_number: "asc" } } },
  });
  const [rateLine, blanket] = o.lines;
  let d = await getOrderDetail(buyer.viewer, o.id);
  check("issued → Pending Acknowledgment, waiting on the provider", d.status === "ISSUED" && d.waiting === `Waiting on Pat Walk`, d.waiting ?? "");

  // Both acceptances (the company sign gate is out of this walk's scope, so the stamps are written as acceptOrder writes them).
  await prisma.workOrder.update({ where: { id: o.id }, data: { status: "ACCEPTED", provider_accepted_at: new Date() } });
  await prisma.workOrder.update({ where: { id: o.id }, data: { status: "RELEASED", buyer_accepted_at: new Date() } });
  d = await getOrderDetail(buyer.viewer, o.id);
  check("both accept → Open, buyer has Hold/Freeze/Close/Finally Close", d.status === "RELEASED" && ["HOLD", "FREEZE", "CLOSE", "FINALLY_CLOSE"].every((c) => d.controls.includes(c as never)));

  const revId = await proposeChange(buyer.viewer, o.id, { lines: [{ lineId: rateLine.id, fields: { unit_price_cents: 12000 } }] });
  check("change order → pending; current rate still in force", Number((await prisma.workOrderLine.findUnique({ where: { id: rateLine.id } }))!.unit_price_cents) === 10000);
  await refuses("a second change order waits for the first", () => proposeChange(buyer.viewer, o.id, { header: { sow_text: "x" } }), "already waiting");
  await refuses("the customer can't accept their own change", () => decideChange(buyer.viewer, o.id, revId, "ACCEPT"), "Only the provider");
  await decideChange(prov.viewer, o.id, revId, "ACCEPT");
  const after = await prisma.workOrder.findUnique({ where: { id: o.id }, include: { lines: true } });
  check("provider accepts → rate applied, revision 1, cap follows", after!.revision_number === 1 && after!.lines.find((l) => l.id === rateLine.id)!.unit_price_cents === 12000 && after!.not_to_exceed_cents === 40 * 12000 + 600000);

  const p1 = await createSettlement(prov.viewer, o.id, { periodStart: "2026-09-01", periodEnd: "2026-09-30", lines: [{ workOrderLineId: blanket.id, amountCents: 150000 }] });
  const due = new Date(p1.submittedAt!).getTime() + 15 * 86_400_000;
  check("payment request: draw-down 1,500 of 6,000, due = submitted + Net 15", p1.status === "SUBMITTED" && p1.dueDate === new Date(due).toISOString().slice(0, 10) && p1.totalCents === 150000);
  d = await getOrderDetail(prov.viewer, o.id);
  const bl = d.lines.find((l) => l.id === blanket.id)!.drawdown;
  check("blanket shows 4,500 remaining", bl.pricedBy === "AMOUNT" && bl.remainingCents === 450000);
  await refuses("blanket can't be overdrawn", () => createSettlement(prov.viewer, o.id, { periodStart: "2026-09-01", periodEnd: "2026-09-30", lines: [{ workOrderLineId: blanket.id, amountCents: 500000 }] }), "exceed");
  await refuses("a service request for a cycle that hasn't ended is refused", () => createSettlement(prov.viewer, o.id, { periodStart: "2026-12-01", periodEnd: "2026-12-31", lines: [{ workOrderLineId: rateLine.id, quantity: 2 }] }), "ended");

  await controlOrder(buyer.viewer, o.id, "HOLD");
  await refuses("Hold blocks a new payment request", () => createSettlement(prov.viewer, o.id, { periodStart: "2026-09-01", periodEnd: "2026-09-30", lines: [{ workOrderLineId: rateLine.id, quantity: 2 }] }), "on hold");
  await refuses("Hold blocks approval", () => approveSettlement(buyer.viewer, p1.id), "on hold");
  check("Hold keeps the request off the payable list", !(await openRequests()).some((r) => r.id === p1.id));
  await controlOrder(buyer.viewer, o.id, "RELEASE_HOLD");
  check("Release Hold returns to Open", (await prisma.workOrder.findUnique({ where: { id: o.id } }))!.status === "RELEASED");

  await controlOrder(buyer.viewer, o.id, "FREEZE");
  await refuses("Freeze blocks change orders", () => proposeChange(buyer.viewer, o.id, { header: { sow_text: "x" } }), "frozen");
  await controlOrder(buyer.viewer, o.id, "UNFREEZE");

  await controlOrder(buyer.viewer, o.id, "CLOSE");
  await approveSettlement(buyer.viewer, p1.id);
  check("Closed: the pending request is still approved and payable", (await openRequests()).some((r) => r.id === p1.id));
  const p2 = await createSettlement(prov.viewer, o.id, { periodStart: "2026-09-01", periodEnd: "2026-09-30", lines: [{ workOrderLineId: rateLine.id, quantity: 8 }] });
  check("Closed: a new payment request can still be submitted", p2.status === "SUBMITTED");
  await refuses("Finally Close refused while a request is Pending Approval", () => controlOrder(buyer.viewer, o.id, "FINALLY_CLOSE"), "Approve or reject the pending payment request first.");
  await approveSettlement(buyer.viewer, p2.id);
  await controlOrder(buyer.viewer, o.id, "FINALLY_CLOSE");
  const fin = await prisma.workOrder.findUnique({ where: { id: o.id }, include: { lines: true } });
  check("Finally Closed: order and lines", fin!.status === "FINALLY_CLOSED" && fin!.lines.every((l) => l.status === "FINALLY_CLOSED"));
  await refuses("Finally Closed takes nothing further", () => createSettlement(prov.viewer, o.id, { periodStart: "2026-09-01", periodEnd: "2026-09-30", lines: [{ workOrderLineId: rateLine.id, quantity: 1 }] }));
  const n = await prisma.notification.count({ where: { person_id: prov.personId, event_key: { in: ["work.order_control", "work.change_order_received"] } } });
  check("provider was told of each of 6 controls + the change order (bell + worklist)", n === 7, `${n}`);
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(async () => { await cleanup(); process.exitCode = done("dev-walk-order") || process.exitCode; await prisma.$disconnect(); });
