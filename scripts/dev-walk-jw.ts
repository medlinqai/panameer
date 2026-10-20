import { nextNumber } from "@/lib/numbering";
// JW lane 2 walk (lib level, throwaway parties): Job → proposal → Hire → Submit → WO with description; Shop with 2 sellers →
// Submit → 2 WOs; Estimate accepted → WR → WO; Externally Sourced WR → WO. Run: npx tsx --env-file=.env.local scripts/dev-walk-jw.ts
import { prisma } from "@/lib/prisma";
import { party, cleanup, check, done, made, refuses, type Party } from "./lib/dev-fixture";
import { selectProvider } from "@/lib/selection";
import { hire, submitWorkRequest } from "@/lib/work-orders";
import { addToCart, cartFor, placeOrder } from "@/lib/cart";
import { saveEstimate, sendEstimate, decideEstimate } from "@/lib/estimates";

async function linked(p: Party, buyer: boolean) {
  const co = await prisma.company.findFirstOrThrow({ where: { p_account_id: p.pAccountId }, select: { id: true } });
  await prisma.companyMembership.create({ data: { person_id: p.personId, company_id: co.id, role: "ADMIN", status: "APPROVED" } });
  if (buyer) {
    await prisma.company.update({ where: { id: co.id }, data: { legal_name: "Walk Buyer LLC", invoice_email: "ap@example.test" } });
    await prisma.site.create({ data: { company_id: co.id, name: "HQ", addresses: { create: { line1: "1 Buyer Way" } } } });
    await prisma.person.update({ where: { id: p.personId }, data: { is_service_buyer: true } });
  } else await prisma.person.update({ where: { id: p.personId }, data: { is_service_provider: true } });
}

async function main() {
  const buyer = await party("BUYER", "Bea");
  const pat = await party("PROVIDER", "Pat");
  const ria = await party("PROVIDER", "Ria");
  await linked(buyer, true);
  await linked(pat, false);
  await linked(ria, false);

  // 1 · Job → proposal → Hire → Submit
  const job = await prisma.job.create({ data: { buyer_person_id: buyer.personId, p_account_id: buyer.pAccountId, title: "Walk: Oracle AP cleanup", status: "OPEN", proposal_access: "OPEN", posted_at: new Date(), start_date: new Date(Date.UTC(2026, 10, 2)), end_date: new Date(Date.UTC(2026, 10, 13)) }, select: { id: true } });
  await prisma.proposal.create({ data: { proposal_number: `PRO-WALK-${Date.now().toString(36)}`, job_id: job.id, provider_person_id: pat.personId, status: "SUBMITTED", submitted_at: new Date(), lines: { create: { line_number: 1, basis: "RATE", uom: "HOUR", unit_price_cents: 12000 } } } });
  const sel = await selectProvider(buyer.viewer, { workRequestId: job.id, providerPersonId: pat.personId });
  const req = await prisma.workRequest.findUniqueOrThrow({ where: { id: (await prisma.workRequestLine.findUniqueOrThrow({ where: { id: sel.workRequestLineId } })).work_request_id } });
  check("Hire line sits on the Job's Work Request (JOB_HIRE, INCOMPLETE, WR number)", req.job_id === job.id && req.source === "JOB_HIRE" && req.status === "INCOMPLETE" && /^WR-[A-Z0-9]{3,6}-\d{2}-\d{8}$/.test(req.wr_number ?? ""), `${req.source} ${req.status}`);
  check("description pre-filled from the Job title", req.description === "Walk: Oracle AP cleanup");
  await refuses("company requires a description → empty one refused", () => hire(buyer.viewer, { jobId: job.id, description: "" }), "description");
  const wo = await hire(buyer.viewer, { jobId: job.id, description: "AP cleanup, Nov" });
  const o = await prisma.workOrder.findUniqueOrThrow({ where: { id: wo.id }, include: { lines: true } });
  const reqAfter = await prisma.workRequest.findUniqueOrThrow({ where: { id: req.id } });
  check("Submit → one WO from the Work Request, with its description", o.work_request_id === req.id && o.description === "AP cleanup, Nov" && o.lines.length === 1);
  check("Work Request ORDERED (submitted + approved stamped); Job FILLED", reqAfter.status === "ORDERED" && !!reqAfter.submitted_at && !!reqAfter.approved_at && (await prisma.job.findUniqueOrThrow({ where: { id: job.id } })).status === "FILLED");

  // 2 · Shop: products from 2 providers → Submit → 2 WOs
  const mk = async (p: Party, title: string, cents: number) => prisma.serviceProduct.create({ data: { provider_profile_id: p.profileId!, title, status: "PUBLISHED", price_cents: cents, currency: "USD", pricing_type: "FIXED" }, select: { id: true } });
  const a = await mk(pat, "Walk: AP Health Check", 250000);
  const b = await mk(ria, "Walk: Close Checklist", 90000);
  await addToCart(buyer.viewer, a.id);
  await addToCart(buyer.viewer, b.id, 2);
  const cart = await cartFor(buyer.viewer);
  check("cart = INCOMPLETE SHOP Work Request, 2 sellers, total 4,300", cart.groups.length === 2 && cart.totalCents === 430000 && !!cart.workRequest?.wrNumber, `${cart.groups.length} · ${cart.totalCents}`);
  const shopWr = await prisma.workRequest.findUniqueOrThrow({ where: { id: cart.workRequest!.id } });
  check("Shop work request source SHOP, INCOMPLETE", shopWr.source === "SHOP" && shopWr.status === "INCOMPLETE");
  const placed = await placeOrder(buyer.viewer, { description: "Q4 finance services" });
  const shopWos = await prisma.workOrder.findMany({ where: { work_request_id: shopWr.id } });
  check("Submit → 2 Work Orders (one per seller) from one Work Request", placed.length === 2 && shopWos.length === 2 && new Set(shopWos.map((w) => w.provider_person_id)).size === 2);
  check("each WO carries the description; WR ORDERED", shopWos.every((w) => w.description === "Q4 finance services") && (await prisma.workRequest.findUniqueOrThrow({ where: { id: shopWr.id } })).status === "ORDERED");
  check("cart empty afterwards", (await cartFor(buyer.viewer)).groups.length === 0);

  // 3 · Estimate accepted → Work Request (ESTIMATE) → WO
  const estId = await saveEstimate(ria.viewer, null, { customerPersonId: buyer.personId, title: "Walk: Year-end support", lines: [{ kind: "SERVICE", description: "Support hours", quantity: 10, rateCents: 15000, uom: "HOUR" }] } as never);
  await sendEstimate(ria.viewer, estId);
  const decided = await decideEstimate(buyer.viewer, estId, "ACCEPT");
  const eo = await prisma.workOrder.findUniqueOrThrow({ where: { id: decided.orderId! }, include: { workRequest: true, lines: true } });
  check("estimate → Work Request (ESTIMATE, ORDERED) → WO with description", eo.workRequest.source === "ESTIMATE" && eo.workRequest.status === "ORDERED" && eo.description === "Walk: Year-end support" && eo.lines.every((l) => !!l.work_request_line_id));

  // 4 · Externally sourced Work Request (no Job) → Submit → WO
  const xid = crypto.randomUUID();
  await prisma.workRequest.create({ data: { id: xid, wr_number: await nextNumber("WR", { pAccountId: buyer.pAccountId }), source: "EXTERNALLY_SOURCED", status: "INCOMPLETE", buyer_person_id: buyer.personId, p_account_id: buyer.pAccountId, proposal_access: "INVITE_ONLY", sole_sourced: true, description: "Walk: outside consultant",
    lines: { create: { line_number: 1, transaction_type: "SERVICE_BY_AMT", description: "Fixed fee", currency: "USD", amount_cents: 500000, provider_person_id: pat.personId } } } });
  const [xo] = await submitWorkRequest(buyer.viewer, { workRequestId: xid });
  const x = await prisma.workOrder.findUniqueOrThrow({ where: { id: xo!.id } });
  check("externally sourced WR → WO (no Job)", x.work_request_id === xid && x.description === "Walk: outside consultant" && (await prisma.workRequest.findUniqueOrThrow({ where: { id: xid } })).status === "ORDERED");
}

main()
  .catch((e) => { check("walk threw", false, (e as Error).stack); })
  .finally(async () => {
    try {
      const persons = made.persons;
      const wos = (await prisma.workOrder.findMany({ where: { OR: [{ buyer_person_id: { in: persons } }, { provider_person_id: { in: persons } }] }, select: { id: true } })).map((w) => w.id);
      await prisma.onboardingRequest.deleteMany({ where: { work_order_id: { in: wos } } });
      await prisma.estimate.deleteMany({ where: { provider_person_id: { in: persons } } });
      await prisma.serviceProduct.deleteMany({ where: { providerProfile: { person_id: { in: persons } } } });
      await prisma.proposal.deleteMany({ where: { provider_person_id: { in: persons } } });
      const { cleanup: _c } = await import("./lib/dev-fixture");
      void _c;
      await prisma.workOrderMilestone.deleteMany({ where: { work_order_line_id: { in: (await prisma.workOrderLine.findMany({ where: { work_order_id: { in: wos } }, select: { id: true } })).map((l) => l.id) } } }).catch(() => {});
      await prisma.workOrderLine.deleteMany({ where: { work_order_id: { in: wos } } });
      await prisma.workRequestLine.updateMany({ where: { workRequest: { buyer_person_id: { in: persons } } }, data: { work_order_id: null } });
      await prisma.workOrderEvent.deleteMany({ where: { work_order_id: { in: wos } } });
      await prisma.workOrder.deleteMany({ where: { id: { in: wos } } });
      await prisma.workRequest.deleteMany({ where: { buyer_person_id: { in: persons } } });
      await prisma.job.deleteMany({ where: { buyer_person_id: { in: persons } } });
      await prisma.companyMembership.deleteMany({ where: { person_id: { in: persons } } });
      await cleanup();
      const left = await prisma.workRequest.count({ where: { buyer_person_id: { in: persons } } }) + await prisma.person.count({ where: { id: { in: persons } } }) + await prisma.workOrder.count({ where: { id: { in: wos } } });
      check("throwaway rows removed", left === 0, `${left} left`);
    } catch (e) {
      check("cleanup", false, (e as Error).message);
    }
    process.exitCode = done("JW walk");
    await prisma.$disconnect();
  });
