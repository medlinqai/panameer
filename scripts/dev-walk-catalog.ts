// CAT-E001..E007 dev walk (no Playwright): service → publish blocked (unvalidated) → validate the throwaway company → publish;
// product with a 50/50 schedule; estimate → Ask for Changes → revision 2 → Accept → work order → provider accepts →
// Report Installed → payment request 50% → customer approves. Throwaway is_test parties; everything removed at the end.
// Run: MAIL_CAPTURE=1 npx tsx --env-file=.env.local scripts/dev-walk-catalog.ts
import { prisma } from "@/lib/prisma";
import { saveProviderService } from "@/lib/provider-services";
import { saveServiceProductFromWizard } from "@/lib/service-products";
import { decideEstimate, saveEstimate, sendEstimate, estimateFor } from "@/lib/estimates";
import { acceptOrder } from "@/lib/orders";
import { milestonesFor, reportMilestone } from "@/lib/order-milestones";
import { approveSettlement } from "@/lib/settlements";
import { check, cleanup, done, made, party, refuses } from "./lib/dev-fixture";

async function validate(personId: string, payout: boolean) {
  const p = await prisma.person.findUniqueOrThrow({ where: { id: personId }, select: { company_id: true } });
  await prisma.company.update({ where: { id: p.company_id }, data: { legal_name: "Devwalk LLC", tin: "12-3456789", country: "United States", tax_form_uploaded_at: new Date() } });
  await prisma.companyMembership.create({ data: { person_id: personId, company_id: p.company_id, status: "APPROVED", role: "ADMIN" } });
  if (payout) await prisma.payoutMethod.create({ data: { person_id: personId, company_id: p.company_id, kind: "BANK_ACCOUNT", label: "Devwalk ••1234", country: "United States" } });
}

async function main() {
  const prov = await party("PROVIDER", "Pia");
  const buyer = await party("BUYER", "Ben");
  const svc = { name: "Procurement Consulting — Onsite", serviceType: "SERVICE_BY_QTY" as const, uom: "HOUR", rateCents: 12500, billingCycle: "MONTHLY" as const, paymentTerms: "NET30" as const, paymentTrigger: "TIMESHEET" as const, expenses: "AT_COST" as const };
  await refuses("publishing a service before the company is validated is refused", () => saveProviderService(prov.viewer, null, svc, true), "validated");
  const draft = await saveProviderService(prov.viewer, null, svc, false);
  check("Save Draft works without validation", !!draft.id && !(await prisma.providerService.findUnique({ where: { id: draft.id } }))!.published_at);
  await validate(prov.personId, true);
  await saveProviderService(prov.viewer, draft.id, svc, true);
  check("after validation the service publishes", !!(await prisma.providerService.findUnique({ where: { id: draft.id } }))!.published_at);

  const domain = await prisma.capabilityDomain.findFirstOrThrow({ select: { id: true } });
  const productId = await saveServiceProductFromWizard(prov.viewer, null, {
    title: "Procurement Spend Dashboard (OTBI)", summary: "A ready-to-use OTBI dashboard.", kind: "DELIVERABLE", pricingType: "FIXED", priceCents: 100000, durationWeeks: 2,
    capabilityDomainIds: [domain.id], deliverables: ["6 analyses + 1 dashboard page"], paymentTerms: "IMMEDIATE", paymentTrigger: "INSTALLATION", coverCode: "DSH",
    milestones: [{ label: "Kickoff", percent: 50, trigger: "ORDER_ACCEPTED" }, { label: "Installed in test pod", percent: 50, trigger: "INSTALLATION" }],
  }, false);
  const ms = await prisma.serviceProductMilestone.findMany({ where: { service_product_id: productId }, orderBy: { sequence: "asc" } });
  check("product saved with a 50/50 schedule and triggers", ms.length === 2 && ms[0].percent === 50 && ms[1].trigger === "INSTALLATION");
  await refuses("a schedule that doesn't total 100% is refused", () => saveServiceProductFromWizard(prov.viewer, productId, { title: "x", kind: "DELIVERABLE", priceCents: 1000, durationWeeks: 1, capabilityDomainIds: [domain.id], deliverables: ["x"], milestones: [{ label: "a", percent: 40 }, { label: "b", percent: 50 }] }, false), "100");

  const line = { kind: "FIXED" as const, description: "Procurement Spend Dashboard (OTBI)", serviceProductId: productId, amountCents: 100000 };
  const estId = await saveEstimate(prov.viewer, null, { customerPersonId: buyer.personId, title: "Spend Dashboard for Acme", scope: "Install the dashboard.", lines: [line], paymentTerms: "NET30" });
  await refuses("the customer can't open a draft", () => estimateFor(buyer.viewer, estId));
  await sendEstimate(prov.viewer, estId);
  check("sent → customer bell + worklist", (await prisma.notification.count({ where: { person_id: buyer.personId, event_key: "estimate.received", requires_action: true } })) === 1);
  await refuses("Ask for Changes needs a comment", () => decideEstimate(buyer.viewer, estId, "CHANGES", ""), "changed");
  await decideEstimate(buyer.viewer, estId, "CHANGES", "Please add a walkthrough session.");
  check("changes requested → provider notified", (await prisma.notification.count({ where: { person_id: prov.personId, event_key: "estimate.changes_requested" } })) === 1);
  await saveEstimate(prov.viewer, estId, { customerPersonId: buyer.personId, title: "Spend Dashboard for Acme", scope: "Install the dashboard + walkthrough.", lines: [{ ...line, amountCents: 120000 }], paymentTerms: "NET30" });
  await sendEstimate(prov.viewer, estId);
  const e = await prisma.costEstimate.findUniqueOrThrow({ where: { id: estId } });
  check("revised and resubmitted as revision 2 (history kept)", e.current_revision === 2 && e.status === "SENT" && (await prisma.costEstimateRevision.count({ where: { estimate_id: estId } })) === 2);
  const stranger = await party("BUYER", "Sam");
  await refuses("someone else can't open it (private)", () => estimateFor(stranger.viewer, estId));

  await validate(buyer.personId, false);
  const { orderId } = await decideEstimate(buyer.viewer, estId, "ACCEPT");
  const o = await prisma.workOrder.findUniqueOrThrow({ where: { id: orderId! }, include: { lines: true } });
  check("Accept → work order from revision 2, customer acceptance set", o.status === "ISSUED" && !!o.buyer_accepted_at && o.lines[0].amount_cents === 120000);
  await acceptOrder(prov.viewer, o.id);
  check("provider accepts → Open", (await prisma.workOrder.findUniqueOrThrow({ where: { id: o.id } })).status === "RELEASED");
  const mm = (await milestonesFor([o.lines[0].id])).get(o.lines[0].id) ?? [];
  check("order line carries the product's 50/50 schedule", mm.length === 2 && mm[1].trigger === "INSTALLATION");
  const s = await reportMilestone(prov.viewer, mm[1].id);
  const due = new Date(new Date(s.submittedAt!).getTime() + 30 * 86_400_000).toISOString().slice(0, 10);
  check("Report Installed → payment request for 50% ($600), due = report + Net 30", s.totalCents === 60000 && s.dueDate === due);
  await refuses("the same milestone can't be reported twice", () => reportMilestone(prov.viewer, mm[1].id), "already");
  const ok = await approveSettlement(buyer.viewer, s.id);
  check("customer approves", ok.status === "APPROVED");
}

main()
  .catch((err) => { console.error(err); process.exitCode = 1; })
  .finally(async () => {
    const people = made.persons;
    const ests = await prisma.costEstimate.findMany({ where: { provider_person_id: { in: people } }, select: { id: true } });
    await prisma.costEstimate.deleteMany({ where: { id: { in: ests.map((x) => x.id) } } });
    const lines = await prisma.workOrderLine.findMany({ where: { workOrder: { provider_person_id: { in: people } } }, select: { id: true } });
    await prisma.workOrderMilestone.deleteMany({ where: { work_order_line_id: { in: lines.map((l) => l.id) } } });
    await prisma.payoutMethod.deleteMany({ where: { person_id: { in: people } } });
    await prisma.companyMembership.deleteMany({ where: { person_id: { in: people } } });
    await cleanup();
    process.exitCode = done("dev-walk-catalog") || process.exitCode;
    await prisma.$disconnect();
  });
