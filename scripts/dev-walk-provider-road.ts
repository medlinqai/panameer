// RD-E001..E003 dev walk: provider registers with a company → publishes while unvalidated → work order signed →
// payment request held "Waiting on Tax & Banking" → company validated → request released. Throwaway rows removed.
// Run: MAIL_CAPTURE=1 npx tsx --env-file=.env.local scripts/dev-walk-provider-road.ts
import { prisma } from "@/lib/prisma";
import { defineCompany, updateCompanyDetails } from "@/lib/company";
import { saveProviderService } from "@/lib/provider-services";
import { lifecycleFor, assertCanSign } from "@/lib/your-path";
import { addToCart, placeOrder } from "@/lib/cart";
import { reportMilestone } from "@/lib/order-milestones";
import { approveSettlement, getSettlement, releaseHeldForCompanyOf } from "@/lib/settlements";
import { check, cleanup, done, made, party, refuses } from "./lib/dev-fixture";

const products: string[] = [];
async function validate(personId: string, membership = true) {
  const per = await prisma.person.findUniqueOrThrow({ where: { id: personId }, select: { company_id: true } });
  await prisma.company.update({ where: { id: per.company_id! }, data: { legal_name: "Walk Co LLC", tin: "12-3456789", country: "US", tax_form_uploaded_at: new Date() } });
  if (membership) await prisma.companyMembership.create({ data: { person_id: personId, company_id: per.company_id!, role: "ADMIN", status: "APPROVED" } });
  await prisma.payoutMethod.create({ data: { person_id: personId, company_id: per.company_id!, kind: "BANK_ACCOUNT", label: "Walk Bank", last4: "0000", country: "US" } });
}

async function main() {
  const tag = Date.now().toString(36);
  const prov = await party("PROVIDER", "Rae");
  const buyer = await party("BUYER", "Ben");
  await validate(buyer.personId);
  await prisma.person.update({ where: { id: prov.personId }, data: { is_service_provider: true } });

  let path = (await lifecycleFor(prov.personId))!;
  check("no company → stop 1 Register is the open to-do", path.road === "provider" && path.steps.length === 8 && path.current === 0 && path.steps[0].next === "Add Your Company");
  await defineCompany(prov.viewer, { name: `Rae Walk ${tag}`, website: `rae-walk-${tag}.example.com`, attestation: true, companyTos: true });
  const industry = await prisma.specialization.findFirst({ where: { kind: "INDUSTRY", status: "ACTIVE" }, select: { id: true } });
  await updateCompanyDetails(prov.viewer, { industryId: industry?.id ?? null, description: "One-person consultancy" });
  path = (await lifecycleFor(prov.personId))!;
  const co = await prisma.companyMembership.findFirst({ where: { person_id: prov.personId, status: "APPROVED" }, select: { company: { select: { name: true, website: true, industry_id: true, description: true } } } });
  check("Register with company → membership + company (website, industry, description); stop 1 done", !!co && co.company.industry_id === (industry?.id ?? null) && co.company.description === "One-person consultancy" && path.done[0]);

  const svc = await saveProviderService(prov.viewer, null, { name: "Oracle Procurement Help", serviceType: "SERVICE_BY_QTY", uom: "HOUR", rateCents: 15000, billingCycle: "WEEKLY", paymentTerms: "NET30", paymentTrigger: "TIMESHEET" }, true);
  check("publish with a linked, unvalidated company", !!(await prisma.providerService.findUnique({ where: { id: svc.id } }))?.published_at);
  await assertCanSign(prov.personId, buyer.personId, prov.personId);
  check("provider can sign before validation (buyer validated)", true);
  await refuses("buyer side unchanged: an unvalidated buyer can't sign", async () => { const b2 = await party("BUYER", "Bo"); await assertCanSign(b2.personId, b2.personId, prov.personId); }, "company");

  const p = await prisma.serviceProduct.create({ data: { provider_profile_id: prov.profileId!, title: `Health Check ${tag}`, price_cents: 200000, status: "PUBLISHED", payment_terms: "NET30", payment_event: "ACCEPTANCE" } });
  products.push(p.id);
  await addToCart(buyer.viewer, p.id);
  const [placed] = await placeOrder(buyer.viewer);
  const order = await prisma.workOrder.findUniqueOrThrow({ where: { id: placed.orderId }, include: { lines: true } });
  check("work order signed (Open) with an unvalidated provider", order.status === "RELEASED");
  const nudge = await prisma.notification.findFirst({ where: { person_id: prov.personId, event_key: "work.tax_banking_needed" } });
  check("first signed order → 'Add Tax & Banking to get paid' on the worklist", nudge?.title === "Add Tax & Banking to get paid" && nudge.requires_action);

  const m = await prisma.workOrderMilestone.findFirstOrThrow({ where: { work_order_line_id: order.lines[0].id } });
  const s = await reportMilestone(prov.viewer, m.id);
  let detail = await getSettlement(buyer.viewer, s.id);
  check("payment request held: Waiting on Tax & Banking, nothing for the buyer to approve", detail.held && detail.actions.length === 0 && !(await prisma.notification.findFirst({ where: { person_id: buyer.personId, event_key: "work.settlement_approval" } })));
  await refuses("buyer can't approve a held request", () => approveSettlement(buyer.viewer, s.id));

  await validate(prov.personId, false);
  await releaseHeldForCompanyOf(prov.personId);
  detail = await getSettlement(buyer.viewer, s.id);
  check("validation releases it: buyer notified and can approve", !detail.held && detail.actions.includes("APPROVE") && !!(await prisma.notification.findFirst({ where: { person_id: buyer.personId, event_key: "work.settlement_approval" } })));
  check("tax & banking item cleared", !!(await prisma.notification.findFirst({ where: { id: nudge!.id } }))?.resolved_at);
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(async () => {
    const lineIds = (await prisma.workOrderLine.findMany({ where: { workOrder: { buyer_person_id: { in: made.persons } } }, select: { id: true } })).map((l) => l.id);
    await prisma.workOrderMilestone.deleteMany({ where: { work_order_line_id: { in: lineIds } } });
    await prisma.cart.deleteMany({ where: { buyer_person_id: { in: made.persons } } });
    await prisma.payoutMethod.deleteMany({ where: { person_id: { in: made.persons } } });
    const cos = (await prisma.companyMembership.findMany({ where: { person_id: { in: made.persons } }, select: { company_id: true } })).map((c) => c.company_id);
    await prisma.companyMembership.deleteMany({ where: { person_id: { in: made.persons } } });
    await cleanup();
    await prisma.serviceProduct.deleteMany({ where: { id: { in: products } } });
    await prisma.requesterProfile.deleteMany({ where: { person_id: { in: made.persons } } });
    const left = await prisma.company.findMany({ where: { id: { in: cos } }, select: { id: true, p_account_id: true } });
    await prisma.company.deleteMany({ where: { id: { in: left.map((c) => c.id) } } }).catch(() => {});
    await prisma.pAccount.deleteMany({ where: { id: { in: left.map((c) => c.p_account_id) } } }).catch(() => {});
    process.exitCode = done("dev-walk-provider-road") || process.exitCode;
    await prisma.$disconnect();
  });
