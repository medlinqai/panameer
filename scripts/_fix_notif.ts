import { prisma } from "@/lib/prisma";
(async () => {
  const rows = await prisma.notification.findMany({ where: { event_key: "work.proposal_received" }, select: { id: true, entity_id: true } });
  for (const r of rows) {
    const p = r.entity_id ? await prisma.proposal.findUnique({ where: { id: r.entity_id }, select: { job_id: true, provider_person_id: true, job: { select: { title: true, budget_type: true } }, lines: { take: 1, select: { unit_price_cents: true } }, proposalRequest: { select: { sourcing_event_id: true } } } }) : null;
    if (!p) continue;
    const prof = await prisma.providerProfile.findUnique({ where: { person_id: p.provider_person_id }, select: { provider_number: true } });
    const c = p.lines[0]?.unit_price_cents; const rate = c ? ` at $${(c / 100).toLocaleString("en-US")}${p.job.budget_type === "HOURLY" ? "/hr" : ""}` : "";
    const ev = p.proposalRequest?.sourcing_event_id;
    await prisma.notification.update({ where: { id: r.id }, data: { title: `Proposal from ${prof?.provider_number ?? "a provider"}${rate} on ${p.job.title}`, body: "Open it to compare, shortlist or award.", href: ev ? `/hire/sourcing/${ev}` : `/work-requests/${p.job_id}` } });
    console.log("fixed", r.id, ev ?? "");
  }
  process.exit(0);
})();
