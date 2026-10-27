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
    { key: "jobs", title: "Jobs for You", sub: "Matched to your skills", total: `${openJobs.toLocaleString("en-US")} open`, href: jobsHref(), seeAllLabel: "Open Jobs for You", lead: { text: `${openJobs.toLocaleString("en-US")} open jobs on Panameer`, href: "/find-work?tab=best", label: "Browse" },
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
  return { donuts, openJobs, estimatesWaiting: asked.length, rows };
}

/** WK-E008: Work's own Things You Need to Do lines (estimates to send, tests to take, matched jobs to apply for) — appCounts writes them into the Worklist. */
export async function workLines(personId: string, profileId: string | null): Promise<AttentionItem[]> {
  const [asked, testsReq] = await Promise.all([
    prisma.estimateRequest.findMany({ where: { provider_person_id: personId, status: "OPEN" }, orderBy: { created_at: "asc" }, take: 50, select: { id: true, description: true, start_by: true, requester_person_id: true } }),
    prisma.testRequest.findMany({ where: { provider_person_id: personId, status: { in: ["ISSUED", "IN_PROGRESS"] } }, select: { id: true, request_number: true, job_id: true, responds_by: true } }),
  ]);
  const [requesters, jobs] = await Promise.all([
    prisma.person.findMany({ where: { id: { in: asked.map((r) => r.requester_person_id) } }, select: { id: true, first_name: true, last_name: true, company: { select: { name: true } } } }),
    prisma.job.findMany({ where: { id: { in: testsReq.map((t) => t.job_id) } }, select: { id: true, title: true } }),
  ]);
  const who = (pid: string) => { const p = requesters.find((x) => x.id === pid); return p ? p.company?.name ?? `${p.first_name} ${p.last_name}`.trim() : "A buyer"; };
  const touched = new Set((await prisma.proposalRequest.findMany({ where: { provider_person_id: personId }, select: { job_id: true } })).map((r) => r.job_id).concat((await prisma.proposal.findMany({ where: { provider_person_id: personId }, select: { job_id: true } })).map((p) => p.job_id)));
  const { getWorkFeed } = await import("@/lib/work-feed");
  const feed = profileId ? (await getWorkFeed({ tab: "best", profileId }).catch(() => [])).filter((c) => c.matched > 0 && !touched.has(c.id)).sort((a, b) => (b.postedAt ?? "").localeCompare(a.postedAt ?? "")).slice(0, 3) : [];
  const group = (title: string, app: "request" | "estimate", lines: AttentionLine[], href: string): AttentionItem[] => (lines.length ? [{ id: `work:${title}`, title, n: lines.length, what: title, app, appLabel: "Work", due: null, dueAt: null, href, action: "Open", lines }] : []);
  return [
    ...group("Estimates", "estimate", asked.map((r) => ({ key: r.id, what: `Send Estimate · ${who(r.requester_person_id)} · ${r.description.slice(0, 50)}`, detail: "", dueAt: r.start_by?.toISOString() ?? null, href: "/estimate", action: "Send" })), "/work/estimates"),
    ...group("Tests to Take", "request", testsReq.map((t) => ({ key: t.id, what: ["Take the Requested Test", jobs.find((j) => j.id === t.job_id)?.title].filter(Boolean).join(" · "), detail: "", dueAt: t.responds_by?.toISOString() ?? null, href: "/work/interviews?stage=tests", action: "Start" })), "/work/interviews?stage=tests"),
    ...group("Jobs for You", "request", feed.map((c) => ({ key: c.id, what: ["Apply", c.title, c.budgetLabel].filter(Boolean).join(" · "), detail: "", dueAt: null, href: `/find-work/${c.id}`, action: "Apply" })), jobsHref("You Matched")),
  ];
}
