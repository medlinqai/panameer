// EST-E001..E003 dev walk: buyer requests from a service → provider bell/worklist → Build Estimate (from the request) → Send
// → request Answered → buyer sees it under Received → Accept → work order; plus Decline and Withdraw. Throwaway rows removed.
// Run: MAIL_CAPTURE=1 npx tsx --env-file=.env.local scripts/dev-walk-estimate-request.ts
import { prisma } from "@/lib/prisma";
import { createRequest, declineRequest, estimatesPage, requestFor, withdrawRequest } from "@/lib/estimate-requests";
import { decideEstimate, saveEstimate, sendEstimate } from "@/lib/estimates";
import { check, cleanup, done, made, party, refuses } from "./lib/dev-fixture";

async function main() {
  const prov = await party("PROVIDER", "Pam");
  const buyer = await party("BUYER", "Bo");
  const svc = await prisma.providerService.create({ data: { provider_profile_id: prov.profileId!, name: "Supplier Portal Consulting", service_type: "SERVICE_BY_QTY", uom: "HOUR", rate_cents: 12500, published_at: new Date() } });

  await refuses("can't ask yourself", () => createRequest(prov.viewer, { providerPersonId: prov.personId, description: "Need help with things" }), "yourself");
  const rid = await createRequest(buyer.viewer, { providerPersonId: prov.personId, serviceId: svc.id, description: "Supplier Portal rollout for 3 BUs\nMore detail here", budgetMinCents: 500000, budgetMaxCents: 1000000 });
  const n = await prisma.notification.findFirst({ where: { person_id: prov.personId, event_key: "estimate.requested" } });
  check("provider gets bell + worklist: '{Buyer} asked for an estimate: …'", !!n?.requires_action && /asked for an estimate: Supplier Portal rollout for 3 BUs/.test(n.title));
  await refuses("a stranger can't open the request", async () => requestFor((await party("BUYER", "Sly")).viewer, rid));

  // Build Estimate from the request (what the pre-filled wizard sends).
  const eid = await saveEstimate(prov.viewer, null, { requestId: rid, customerPersonId: buyer.personId, title: svc.name, scope: "Supplier Portal rollout for 3 BUs", lines: [{ kind: "SERVICE", description: svc.name, providerServiceId: svc.id, uom: "HOUR", quantity: 40, rateCents: 12500 }] });
  check("draft links the request", (await prisma.costEstimateRequest.findUnique({ where: { id: rid } }))?.cost_estimate_id === eid);
  await sendEstimate(prov.viewer, eid);
  const r = await prisma.costEstimateRequest.findUnique({ where: { id: rid } });
  check("Send → request Answered, provider's item cleared", r?.status === "ANSWERED" && !!(await prisma.notification.findFirst({ where: { id: n!.id } }))?.resolved_at);
  const bp = await estimatesPage(buyer.viewer);
  check("buyer sees the estimate under Received", bp.received.some((x) => x.kind === "estimate" && x.id === eid));
  const pp = await estimatesPage(prov.viewer);
  check("provider sees it under Sent; nothing waiting", pp.sent.some((x) => x.id === eid) && pp.waiting.length === 0);
  const { orderId } = await decideEstimate(buyer.viewer, eid, "ACCEPT");
  check("Accept → work order", !!orderId && !!(await prisma.workOrder.findUnique({ where: { id: orderId! } })));

  const r2 = await createRequest(buyer.viewer, { providerPersonId: prov.personId, description: "Another piece of work" });
  check("provider sees it under Requests Waiting on Me", (await estimatesPage(prov.viewer)).waiting.some((x) => x.id === r2));
  await refuses("decline needs a reason", () => declineRequest(prov.viewer, r2, ""), "reason");
  await declineRequest(prov.viewer, r2, "Fully booked this quarter");
  check("Decline → buyer notified, status Declined", (await prisma.costEstimateRequest.findUnique({ where: { id: r2 } }))?.status === "DECLINED" && (await prisma.notification.count({ where: { person_id: buyer.personId, event_key: "estimate.request_declined" } })) === 1);

  const r3 = await createRequest(buyer.viewer, { providerPersonId: prov.personId, description: "Third request to withdraw" });
  await refuses("only the requester can withdraw", () => withdrawRequest(prov.viewer, r3), "requester");
  await withdrawRequest(buyer.viewer, r3);
  check("Withdraw → status Withdrawn, provider's item cleared", (await prisma.costEstimateRequest.findUnique({ where: { id: r3 } }))?.status === "WITHDRAWN" && !!(await prisma.notification.findFirst({ where: { dedupe_key: `estimate.requested:${r3}` } }))?.resolved_at);
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(async () => {
    await prisma.costEstimateRequest.deleteMany({ where: { OR: [{ provider_person_id: { in: made.persons } }, { requester_person_id: { in: made.persons } }] } });
    await prisma.costEstimate.deleteMany({ where: { provider_person_id: { in: made.persons } } });
    await cleanup();
    process.exitCode = done("dev-walk-estimate-request") || process.exitCode;
    await prisma.$disconnect();
  });
