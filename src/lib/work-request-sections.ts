import { prisma } from "@/lib/prisma";
import type { Viewer } from "@/lib/access";
import { identityVisibleTo, providerLabel, providerNumbers } from "@/lib/provider-number";

// DB-E006: the data behind the Work Request page's sections 4, 6–8, 10 and 12 (provider numbers until a WO is Released).
const TZ = "America/New_York";
const when = (d: Date) => d.toLocaleString("en-US", { timeZone: TZ, month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

export async function workRequestSections(viewer: Viewer, jobId: string) {
  const [job, requests, evaluations, tests, wrs, interviews, event] = await Promise.all([
    prisma.job.findUniqueOrThrow({ where: { id: jobId }, select: { created_at: true, posted_at: true, title: true, job_number: true } }),
    prisma.proposalRequest.findMany({ where: { job_id: jobId }, orderBy: { created_at: "asc" }, select: { provider_person_id: true, request_number: true, issued_at: true, created_at: true, responds_by: true, status: true, decline_reason: true, declined_at: true, bid: { select: { submitted_at: true } } } }),
    prisma.providerEvaluation.findMany({ where: { job_id: jobId, status: "SUBMITTED" }, select: { provider_person_id: true, overall_rating: true, summary: true, interview_request_id: true } }),
    prisma.testRequest.findMany({ where: { job_id: jobId }, orderBy: { created_at: "asc" }, select: { id: true, request_number: true, provider_person_id: true, status: true, created_at: true, lines: { select: { skill_id: true, certification_test_id: true } }, response: { select: { lines: { select: { score: true, passed: true, completed_at: true } } } } } }),
    prisma.workRequest.findMany({ where: { job_id: jobId }, orderBy: { created_at: "asc" }, select: { id: true, wr_number: true, status: true, submitted_at: true, approved_at: true, approval_note: true, created_at: true, description: true, lines: { where: { provider_person_id: { not: null } }, select: { provider_person_id: true, unit_price_cents: true, uom: true, updated_at: true, status: true } } } }),
    prisma.interviewRequest.findMany({ where: { job_id: jobId }, select: { provider_person_id: true, request_number: true, created_at: true, status: true, completed_at: true } }),
    prisma.sourcingEvent.findMany({ where: { job_id: jobId }, select: { event_number: true, created_at: true, deadline_at: true, status: true, others_notified_at: true } }),
  ]);
  const orders = await prisma.workOrder.findMany({ where: { workRequest: { job_id: jobId } }, select: { id: true, order_number: true, created_at: true, buyer_accepted_at: true, provider_accepted_at: true, status: true } });

  const people = [...new Set([...requests.map((r) => r.provider_person_id), ...tests.map((t) => t.provider_person_id), ...wrs.flatMap((w) => w.lines.map((l) => l.provider_person_id!)), ...interviews.map((i) => i.provider_person_id), ...evaluations.map((e) => e.provider_person_id)])];
  const [profiles, seen, persons] = await Promise.all([
    prisma.providerProfile.findMany({ where: { person_id: { in: people } }, select: { id: true, person_id: true } }),
    identityVisibleTo(viewer, people),
    prisma.person.findMany({ where: { id: { in: people } }, select: { id: true, first_name: true, last_name: true } }),
  ]);
  const nums = await providerNumbers(profiles.map((p) => p.id));
  const who = (personId: string) => {
    if (seen.has(personId)) { const p = persons.find((x) => x.id === personId); if (p) return `${p.first_name} ${p.last_name}`.trim(); }
    return providerLabel(nums.get(profiles.find((p) => p.person_id === personId)?.id ?? ""));
  };
  const skillIds = [...new Set(tests.flatMap((t) => t.lines.map((l) => l.skill_id).filter((x): x is string => !!x)))];
  const certIds = [...new Set(tests.flatMap((t) => t.lines.map((l) => l.certification_test_id)))];
  const [skills, certs] = await Promise.all([
    prisma.skill.findMany({ where: { id: { in: skillIds } }, select: { id: true, name: true } }),
    prisma.certificationTest.findMany({ where: { id: { in: certIds } }, select: { id: true, learningPath: { select: { title: true } } } }),
  ]);

  const now = Date.now();
  const requestRows = requests.map((r) => ({
    who: who(r.provider_person_id), number: r.request_number, asked: when(r.issued_at ?? r.created_at), due: r.responds_by ? when(r.responds_by) : null,
    status: r.status === "DECLINED" ? `Declined${r.decline_reason ? ` — “${r.decline_reason}”` : ""}` : r.bid?.submitted_at || r.status === "RESPONDED" ? "Responded" : r.status === "EXPIRED" || (r.responds_by && r.responds_by.getTime() < now) ? "Expired" : "Waiting",
  }));
  const evalRows = evaluations.map((e) => ({ who: who(e.provider_person_id), rating: e.overall_rating, summary: e.summary }));
  const testRows = tests.map((t) => {
    const l = t.lines[0];
    const res = t.response?.lines[0];
    return {
      who: who(t.provider_person_id), number: t.request_number,
      skill: (l?.skill_id && skills.find((s) => s.id === l.skill_id)?.name) || (l && certs.find((c) => c.id === l.certification_test_id)?.learningPath?.title) || "Certification test",
      score: res?.score ?? null, result: res?.passed == null ? (t.status === "COMPLETED" ? "Completed" : t.status === "DECLINED" ? "Declined" : "Pending") : res.passed ? "Pass" : "Fail",
    };
  });
  const awardRows = wrs.flatMap((w) => w.lines.filter((l) => l.status === "ASSIGNED" || l.status === "ORDERED").map((l) => ({ wr: w.wr_number, who: who(l.provider_person_id!), rate: l.unit_price_cents, uom: l.uom, when: when(w.submitted_at ?? l.updated_at) })));
  const approval = wrs.find((w) => w.approved_at || w.submitted_at) ?? null;

  type Ev = { at: Date; text: string };
  const log: Ev[] = [
    { at: job.created_at, text: "Job created" },
    ...(job.posted_at ? [{ at: job.posted_at, text: "Job posted" }] : []),
    ...event.map((e) => ({ at: e.created_at, text: `Sourcing Event ${e.event_number} opened · due ${when(e.deadline_at)}` })),
    ...requests.map((r) => ({ at: r.issued_at ?? r.created_at, text: `Request to Propose sent to ${who(r.provider_person_id)}` })),
    ...requests.filter((r) => r.bid?.submitted_at).map((r) => ({ at: r.bid!.submitted_at!, text: `Proposal from ${who(r.provider_person_id)}` })),
    ...requests.filter((r) => r.declined_at).map((r) => ({ at: r.declined_at!, text: `${who(r.provider_person_id)} declined` })),
    ...interviews.map((i) => ({ at: i.created_at, text: `Interview requested with ${who(i.provider_person_id)}` })),
    ...interviews.filter((i) => i.completed_at).map((i) => ({ at: i.completed_at!, text: `Interview with ${who(i.provider_person_id)} completed` })),
    ...tests.map((t) => ({ at: t.created_at, text: `Test request sent to ${who(t.provider_person_id)}` })),
    ...wrs.filter((w) => w.submitted_at).map((w) => ({ at: w.submitted_at!, text: `Work Request ${w.wr_number ?? ""} submitted (Award)` })),
    ...wrs.filter((w) => w.approved_at).map((w) => ({ at: w.approved_at!, text: `Work Request ${w.wr_number ?? ""} approved` })),
    ...orders.map((o) => ({ at: o.created_at, text: `Work Order ${o.order_number} created` })),
    ...orders.filter((o) => o.buyer_accepted_at).map((o) => ({ at: o.buyer_accepted_at!, text: `Work Order ${o.order_number} accepted by you` })),
    ...orders.filter((o) => o.provider_accepted_at).map((o) => ({ at: o.provider_accepted_at!, text: `Work Order ${o.order_number} accepted by the provider` })),
    ...event.filter((e) => e.others_notified_at).map((e) => ({ at: e.others_notified_at!, text: "Other candidates told (not awarded)" })),
  ].sort((a, b) => b.at.getTime() - a.at.getTime());

  return {
    requestRows, evalRows, testRows, awardRows,
    approval: approval ? { wr: approval.wr_number, at: approval.approved_at ? when(approval.approved_at) : null, note: approval.approval_note, status: approval.status } : null,
    notes: wrs.map((w) => w.description).filter((d): d is string => !!d?.trim()),
    log: log.map((e) => ({ at: when(e.at), text: e.text })),
    jobNumber: job.job_number,
    latestWr: wrs.at(-1)?.wr_number ?? null,
    provider: awardRows[0]?.who ?? null,
    orders,
  };
}
