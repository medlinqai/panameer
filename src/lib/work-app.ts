import { prisma } from "@/lib/prisma";
import { sellerDashboard } from "@/lib/dashboard/seller";
import { C, type DashRow, type Donut } from "@/lib/dashboard/types";
import type { AttentionItem, AttentionLine } from "@/lib/attention";

// WK-E002: the Work home's tiles and to-dos — Jobs for You · Estimates · Interviews & Tests · My Catalog.
export const JOB_STAGES = ["You Matched", "You Applied", "They Requested", "You Answered", "You Interviewed", "They Chose You"] as const;
export const jobsHref = (stage?: string) => (stage ? `/work/jobs?stage=${encodeURIComponent(stage)}` : "/work/jobs");

export async function workJobRows(personId: string, viewer: { userId: string }): Promise<DashRow[]> {
  return (await sellerDashboard(personId, viewer)).rows.filter((r) => r.type === "Job");
}

export async function workApp(personId: string, viewer: { userId: string }) {
  const now = new Date();
  const pp = await prisma.providerProfile.findUnique({ where: { person_id: personId }, select: { id: true } });
  const [rows, openJobs, asked, sent, accepted, expired, toSchedule, booked, testsReq, testsPassed, ratesLive, productsLive, drafts] = await Promise.all([
    workJobRows(personId, viewer),
    prisma.job.count({ where: { kind: "JOB", status: "OPEN" } }),
    prisma.estimateRequest.findMany({ where: { provider_person_id: personId, status: "OPEN" }, orderBy: { created_at: "asc" }, take: 50, select: { id: true, description: true, start_by: true, requester_person_id: true } }),
    prisma.estimate.count({ where: { provider_person_id: personId, status: { in: ["SENT", "CHANGES_REQUESTED"] } } }),
    prisma.estimate.count({ where: { provider_person_id: personId, status: "ACCEPTED" } }),
    prisma.estimate.count({ where: { provider_person_id: personId, OR: [{ status: "EXPIRED" }, { status: "SENT", valid_until: { lt: now } }] } }),
    prisma.interviewRequest.findMany({ where: { provider_person_id: personId, status: "REQUESTED" }, select: { id: true, job_id: true, request_number: true } }),
    prisma.interviewRequest.count({ where: { provider_person_id: personId, status: "SCHEDULED" } }),
    prisma.testRequest.findMany({ where: { provider_person_id: personId, status: { in: ["ISSUED", "IN_PROGRESS"] } }, select: { id: true, request_number: true, job_id: true } }),
    prisma.testResponseLine.count({ where: { passed: true, testResponse: { provider_person_id: personId } } }),
    pp ? prisma.providerService.count({ where: { provider_profile_id: pp.id, active: true } }) : 0,
    pp ? prisma.serviceProduct.count({ where: { provider_profile_id: pp.id, status: "PUBLISHED" } }) : 0,
    pp ? prisma.serviceProduct.count({ where: { provider_profile_id: pp.id, status: { not: "PUBLISHED" } } }) : 0,
  ]);
  const n = (stage: string) => rows.filter((r) => r.slice === stage).length;
  const MINE = new Set(["You Matched", "They Requested"]);
  const COLOR: Record<string, string> = { "You Matched": C.grey, "You Applied": C.steel, "They Requested": C.pend, "You Answered": C.pendSoft, "You Interviewed": C.ink, "They Chose You": C.ok };
  const donuts: Donut[] = [
    { key: "jobs", title: "Jobs for You", sub: "Matched to your skills", href: jobsHref(), seeAllLabel: "Open Jobs for You", lead: { text: `${openJobs.toLocaleString("en-US")} open jobs on Panameer`, href: "/find-work?tab=best", label: "Browse" },
      slices: JOB_STAGES.map((s) => ({ label: s, n: n(s), color: COLOR[s], mine: MINE.has(s), href: jobsHref(s) })) },
    { key: "estimates", title: "Estimates", sub: "Buyers asking your price", href: "/work/estimates", seeAllLabel: "Open Estimates", slices: [
      { label: "Asked of You", n: asked.length, color: C.pend, mine: true, href: "/estimate" }, { label: "Sent", n: sent, color: C.steel, href: "/work/estimates" },
      { label: "Accepted", n: accepted, color: C.ok, href: "/work/estimates" }, { label: "Expired", n: expired, color: C.grey, href: "/work/estimates" }] },
    { key: "fit", title: "Interviews & Tests", sub: "Buyers checking fit", href: "/work/interviews", seeAllLabel: "Open Interviews & Tests", slices: [
      { label: "Interviews to Schedule", n: toSchedule.length, color: C.pend, mine: true, href: "/work/interviews" }, { label: "Interviews Booked", n: booked, color: C.ink, href: "/work/interviews" },
      { label: "Tests Requested", n: testsReq.length, color: C.pendSoft, mine: true, href: "/work/interviews?stage=tests" }, { label: "Tests Passed", n: testsPassed, color: C.ok, href: "/work/interviews?stage=tests" }] },
    { key: "catalog", title: "My Catalog", sub: "What you offer", href: "/catalog", seeAllLabel: "Open My Catalog", slices: [
      { label: "Rates Live", n: ratesLive, color: C.ok, href: "/catalog#services" }, { label: "Products Live", n: productsLive, color: C.ink, href: "/catalog#products" },
      { label: "Draft", n: drafts, color: C.grey, mine: true, href: "/catalog#products" }] },
  ];
  // Things You Need to Do — estimates to send, interviews to pick, tests to take, requests to answer, matched jobs to apply for.
  const jobs = new Map((await prisma.job.findMany({ where: { id: { in: [...toSchedule, ...testsReq].map((x) => x.job_id) } }, select: { id: true, title: true, job_number: true } })).map((j) => [j.id, j]));
  const group = (title: string, lines: AttentionLine[], href: string): AttentionItem[] => (lines.length ? [{ id: `work:${title}`, title, n: lines.length, what: title, app: "request", appLabel: "Work", due: null, dueAt: null, href, action: "Open", lines }] : []);
  const requesters = new Map((await prisma.person.findMany({ where: { id: { in: asked.map((r) => r.requester_person_id) } }, select: { id: true, first_name: true, last_name: true, company: { select: { name: true } } } })).map((p) => [p.id, p]));
  const who = (r: (typeof asked)[number]) => { const p = requesters.get(r.requester_person_id); return p ? p.company?.name ?? `${p.first_name} ${p.last_name}`.trim() : "A buyer"; };
  const todo: AttentionItem[] = [
    ...group("Estimates", asked.map((r) => ({ key: r.id, what: `${who(r)} Asked for an Estimate`, detail: r.description.slice(0, 80), dueAt: r.start_by?.toISOString() ?? null, href: "/estimate", action: "Send" })), "/work/estimates"),
    ...group("Interviews & Tests", [
      ...toSchedule.map((i) => ({ key: i.id, what: "Pick an Interview Time", detail: [jobs.get(i.job_id)?.title, jobs.get(i.job_id)?.job_number].filter(Boolean).join(" · "), dueAt: null, href: `/find-work/${i.job_id}#interview`, action: "Pick" })),
      ...testsReq.map((t) => ({ key: t.id, what: "Take the Test", detail: [jobs.get(t.job_id)?.title, t.request_number].filter(Boolean).join(" · "), dueAt: null, href: "/work/interviews?stage=tests", action: "Start" })),
    ], "/work/interviews"),
    ...group("Jobs for You", [
      ...rows.filter((r) => r.slice === "They Requested").map((r) => ({ key: r.key, what: r.what, detail: `They requested · ${r.amount}`, dueAt: null, href: r.href, action: "Respond" })),
      ...rows.filter((r) => r.slice === "You Matched").map((r) => ({ key: r.key, what: r.what, detail: `You matched · ${r.amount}`, dueAt: null, href: r.href, action: "Apply" })),
    ], jobsHref()),
  ];
  const needYou = todo.reduce((s, g) => s + (g.n ?? 0), 0);
  return { donuts, todo, needYou, openJobs, estimatesWaiting: asked.length, rows };
}
