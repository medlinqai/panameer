import { prisma } from "@/lib/prisma";
import { jobPath, PATH_STEPS, type PathKey } from "@/lib/work-request-path";
import { listInterviews, type InterviewRow } from "@/lib/interviews";

// DB-E002–E005: the login dashboard's live work — attention tiles, today's interviews, the process strip with counts.
// Buyer and provider are twins. The buyer sees provider numbers only (listInterviews / jobPath already mask).
export type Tile = { id: string; label: string; count: number; href: string };
export type StripStep = { key: string; label: string; count: number };
export type WorkRow = { id: string; step: string; title: string; ref: string | null; who: string | null; posted: string | null; days: number; due: string | null; action: { label: string; href: string } | null; old: boolean };

const TZ = "America/New_York";
const DAY = 86_400_000;
/** Midnight in New York for the day containing `at`, plus `addDays`. */
export function nyDayStart(at = new Date(), addDays = 0): Date {
  const ymd = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(at);
  const guess = new Date(`${ymd}T00:00:00Z`);
  const off = new Date(guess.toLocaleString("en-US", { timeZone: TZ })).getTime() - new Date(guess.toLocaleString("en-US", { timeZone: "UTC" })).getTime();
  return new Date(guess.getTime() - off + addDays * DAY);
}
const short = (d: Date) => d.toLocaleString("en-US", { timeZone: TZ, month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
const daysSince = (d: Date | null) => (d ? Math.max(0, Math.floor((Date.now() - d.getTime()) / DAY)) : 0);

// ── Buyer ──────────────────────────────────────────────────────────────────────────────────────────────────
const BUYER_ACTION: Partial<Record<PathKey, string>> = { shortlist: "Shortlist", request: "Request Proposals", proposals: "Review proposals", award: "Award", approval: "Open", wo: "Open Work Order" };

export async function buyerLiveWork(personId: string) {
  const now = new Date();
  const soon = new Date(now.getTime() + DAY);
  const jobs = await prisma.job.findMany({
    where: { buyer_person_id: personId, kind: "JOB", status: { in: ["DRAFT", "OPEN", "FILLED"] }, updated_at: { gte: new Date(now.getTime() - 60 * DAY) } },
    orderBy: { created_at: "desc" }, take: 40, select: { id: true },
  });
  const paths = (await Promise.all(jobs.map((j) => jobPath(j.id)))).filter((p): p is NonNullable<typeof p> => !!p);

  const rows: WorkRow[] = [];
  for (const p of paths) {
    const postedAt = p.job.posted_at ?? p.job.created_at;
    if (!p.awarded) {
      const step = p.current ?? "shortlist";
      const lastDone = [...p.shown].reverse().find((s) => s.done)?.date ?? postedAt;
      const href = step === "proposals" && p.event ? `/hire/sourcing/${p.event.id}` : step === "shortlist" || step === "request" ? `/work-requests/${p.job.id}#matches` : `/work-requests/${p.job.id}`;
      rows.push({
        id: p.job.id, step, title: p.job.title || "Untitled job", ref: p.job.job_number, who: null, posted: postedAt.toISOString(), days: daysSince(lastDone),
        due: p.event && step === "proposals" ? short(p.event.deadline_at) : null,
        action: { label: BUYER_ACTION[step] ?? "Open", href }, old: daysSince(postedAt) > 5,
      });
      continue;
    }
    for (const w of p.wrs) for (const l of w.lines) {
      const wo = p.orders.find((o) => o.id === l.work_order_id);
      const step: PathKey = wo ? "wo" : w.approved_at ? "approval" : "award";
      if (wo && daysSince(wo.created_at) > 14) continue;
      rows.push({
        id: `${w.id}:${l.provider_person_id}`, step, title: p.job.title || "Untitled job", ref: w.wr_number ?? p.job.job_number, who: p.numberOf(l.provider_person_id!), posted: postedAt.toISOString(),
        days: daysSince(wo?.created_at ?? w.approved_at ?? w.submitted_at ?? w.created_at), due: null,
        action: wo ? { label: "Open Work Order", href: `/orders/${wo.id}` } : { label: "Open", href: `/work-requests/${p.job.id}` }, old: false,
      });
    }
  }
  const strip: StripStep[] = PATH_STEPS.map((s) => ({ key: s.key, label: s.label, count: rows.filter((r) => r.step === s.key).length }));

  const [proposalsToReview, closing, expired, testsIn, toAccept, approvals, todays, openJobs, monthOrders] = await Promise.all([
    prisma.proposal.count({ where: { status: "SUBMITTED", job: { buyer_person_id: personId }, proposalRequest: { sourcingEvent: { status: { in: ["OPEN", "CLOSED"] } } } } }),
    prisma.sourcingEvent.count({ where: { created_by_person_id: personId, status: "OPEN", deadline_at: { gt: now, lte: soon } } }),
    prisma.sourcingEvent.count({ where: { created_by_person_id: personId, status: "OPEN", deadline_at: { lte: now } } }),
    prisma.testRequest.count({ where: { requested_by_person_id: personId, status: "COMPLETED", updated_at: { gte: new Date(now.getTime() - 7 * DAY) } } }),
    prisma.workOrder.count({ where: { buyer_person_id: personId, status: "ISSUED", buyer_accepted_at: null } }),
    prisma.workRequest.count({ where: { job: { buyer_person_id: personId }, status: "PENDING_APPROVAL" } }),
    listInterviews({ buyerPersonId: personId, from: nyDayStart(now), to: nyDayStart(now, 1) }),
    prisma.job.count({ where: { buyer_person_id: personId, status: "OPEN" } }),
    prisma.workOrder.count({ where: { buyer_person_id: personId, created_at: { gte: nyDayStart(new Date(now.getFullYear(), now.getMonth(), 1)) } } }),
  ]);
  const tiles: Tile[] = [
    { id: "proposals", label: "Proposals to review", count: proposalsToReview, href: "/dashboard?step=proposals#live-work" },
    { id: "closing", label: "Sourcing Events closing < 24 h", count: closing, href: "/dashboard?step=proposals#live-work" },
    { id: "expired", label: "Sourcing Events expired, no award", count: expired, href: "/dashboard?step=proposals#live-work" },
    { id: "interviews", label: "Interviews today", count: todays.length, href: "#todays-interviews" },
    { id: "tests", label: "Test results in", count: testsIn, href: "/dashboard?step=test#live-work" },
    { id: "accept", label: "Work Orders to accept", count: toAccept, href: "/orders" },
    { id: "approvals", label: "Approvals waiting", count: approvals, href: "/orders/work-requests" },
  ].filter((t) => t.count > 0);
  return { tiles, todays, strip, rows, footer: { openJobs, monthOrders } };
}

// ── Provider ───────────────────────────────────────────────────────────────────────────────────────────────
export const PROVIDER_STRIP = [
  { key: "requested", label: "Requested" }, { key: "submitted", label: "Submitted" }, { key: "shortlisted", label: "Shortlisted" },
  { key: "interview", label: "Interview" }, { key: "awarded", label: "Awarded" }, { key: "accept", label: "Work Order to Accept" },
] as const;

export async function providerLiveWork(personId: string) {
  const now = new Date();
  const soon = new Date(now.getTime() + DAY);
  const [requests, proposals, interviews, toAccept, testReqs, notSelected, todays] = await Promise.all([
    prisma.proposalRequest.findMany({ where: { provider_person_id: personId, status: { in: ["ISSUED", "VIEWED", "RESPONDED"] }, created_at: { gte: new Date(now.getTime() - 60 * DAY) } }, select: { job_id: true, responds_by: true, created_at: true } }),
    prisma.proposal.findMany({ where: { provider_person_id: personId, status: { in: ["SUBMITTED", "SHORTLISTED", "AWARDED"] }, updated_at: { gte: new Date(now.getTime() - 60 * DAY) } }, select: { job_id: true, status: true, submitted_at: true, updated_at: true } }),
    prisma.interviewRequest.findMany({ where: { provider_person_id: personId, status: { in: ["REQUESTED", "SLOTS_OFFERED", "SCHEDULED"] } }, select: { job_id: true, created_at: true } }),
    prisma.workOrder.findMany({ where: { provider_person_id: personId, status: "ISSUED", provider_accepted_at: null }, select: { id: true, order_number: true, created_at: true, workRequest: { select: { job_id: true } } } }),
    prisma.testRequest.count({ where: { provider_person_id: personId, status: { in: ["ISSUED", "IN_PROGRESS"] } } }),
    prisma.proposal.count({ where: { provider_person_id: personId, status: "NOT_SELECTED", updated_at: { gte: new Date(now.getTime() - 14 * DAY) } } }),
    listInterviews({ providerPersonId: personId, from: nyDayStart(now), to: nyDayStart(now, 1) }),
  ]);
  const jobIds = [...new Set([...requests.map((r) => r.job_id), ...proposals.map((p) => p.job_id), ...interviews.map((i) => i.job_id), ...toAccept.map((o) => o.workRequest.job_id).filter((x): x is string => !!x)])];
  const jobs = new Map((await prisma.job.findMany({ where: { id: { in: jobIds } }, select: { id: true, title: true, job_number: true, posted_at: true, created_at: true } })).map((j) => [j.id, j]));
  const rows: WorkRow[] = [];
  const seen = new Set<string>();
  const push = (jobId: string, step: string, since: Date | null, due: Date | null, action: WorkRow["action"], ref?: string | null) => {
    if (seen.has(jobId)) return;
    seen.add(jobId);
    const j = jobs.get(jobId);
    rows.push({ id: jobId, step, title: j?.title ?? "Job", ref: ref ?? j?.job_number ?? null, who: null, posted: (j?.posted_at ?? j?.created_at)?.toISOString() ?? null, days: daysSince(since), due: due ? short(due) : null, action, old: false });
  };
  for (const o of toAccept) if (o.workRequest.job_id) push(o.workRequest.job_id, "accept", o.created_at, null, { label: "Accept", href: `/orders/${o.id}` }, o.order_number);
  for (const p of proposals.filter((x) => x.status === "AWARDED")) push(p.job_id, "awarded", p.updated_at, null, { label: "Open", href: `/find-work/${p.job_id}` });
  for (const i of interviews) push(i.job_id, "interview", i.created_at, null, { label: "Interview", href: `/find-work/${i.job_id}#interview` });
  for (const p of proposals.filter((x) => x.status === "SHORTLISTED")) push(p.job_id, "shortlisted", p.updated_at, null, { label: "Open", href: `/find-work/${p.job_id}` });
  for (const p of proposals.filter((x) => x.status === "SUBMITTED")) push(p.job_id, "submitted", p.submitted_at, requests.find((r) => r.job_id === p.job_id)?.responds_by ?? null, { label: "Update", href: `/find-work/${p.job_id}` });
  for (const r of requests) push(r.job_id, "requested", r.created_at, r.responds_by, { label: "Propose", href: `/find-work/${r.job_id}` });

  const strip: StripStep[] = PROVIDER_STRIP.map((s) => ({ key: s.key, label: s.label, count: rows.filter((r) => r.step === s.key).length }));
  const dueSoon = requests.filter((r) => r.responds_by && r.responds_by > now && r.responds_by <= soon && !proposals.some((p) => p.job_id === r.job_id)).length;
  const tiles: Tile[] = [
    { id: "due", label: "Requests to Propose due < 24 h", count: dueSoon, href: "/dashboard?step=requested#live-work" },
    { id: "interviews", label: "Interviews today", count: todays.length, href: "#todays-interviews" },
    { id: "tests", label: "Test requests", count: testReqs, href: "/find-work?tab=invitations" },
    { id: "accept", label: "Work Orders to accept", count: toAccept.length, href: "/dashboard?step=accept#live-work" },
    { id: "not-selected", label: "Not selected (recent)", count: notSelected, href: "/find-work?tab=proposals" },
  ].filter((t) => t.count > 0);
  return { tiles, todays, strip, rows };
}

/** DB-E003: the week's interviews (Mon–Sun, New York). */
export async function weekInterviews(side: "buyer" | "provider", personId: string): Promise<{ start: Date; rows: InterviewRow[] }> {
  const today = nyDayStart();
  const dow = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(new Intl.DateTimeFormat("en-US", { timeZone: TZ, weekday: "short" }).format(new Date())) + 1;
  const start = new Date(today.getTime() - (dow - 1) * DAY);
  const rows = await listInterviews({ ...(side === "buyer" ? { buyerPersonId: personId } : { providerPersonId: personId }), from: start, to: new Date(start.getTime() + 7 * DAY) });
  return { start, rows };
}

// ── RA-E005: the HIRE app's Jobs / Requests / Tests tabs ──────────────────────────────────────────────────────
export type ProposalLine = { personId: string; who: string; summary: string; rate: string | null; start: string | null; inRange: boolean | null };
export type JobTabRow = WorkRow & { category: string | null; origin: string | null; facts: string; inRange: boolean | null; wo: { id: string; number: string; provider: string; waiting: string } | null; proposalLines: ProposalLine[]; asked: number; eventId: string | null; deadlineAt: string | null; completed: boolean; recurring: import("@/lib/slices").Recurring | null; proposals: string | null; rates: string | null; range: string | null; booked: string | null; needsAction: boolean };
const usd = (c: number) => `$${(c / 100).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;

export async function buyerHireTabs(personId: string) {
  const now = new Date();
  const jobs = await prisma.job.findMany({ where: { buyer_person_id: personId, kind: "JOB", status: { in: ["DRAFT", "OPEN", "FILLED", "CLOSED", "CANCELED"] }, updated_at: { gte: new Date(now.getTime() - 180 * DAY) } }, orderBy: { created_at: "desc" }, take: 80, select: { id: true, budget_min_cents: true, budget_max_cents: true, budget_type: true, worksite: true, city: true, state: true, contract_types: true, domains: true, commodity_group_id: true, skills: { select: { skill_id: true } } } });
  const groupNames = new Map((await prisma.commodityGroup.findMany({ where: { id: { in: jobs.map((j) => j.commodity_group_id).filter((x): x is string => !!x) } }, select: { id: true, name: true } })).map((g) => [g.id, g.name]));
  const paths = (await Promise.all(jobs.map((j) => jobPath(j.id)))).filter((p): p is NonNullable<typeof p> => !!p);
  // HL-E002: proposal lines (provider number · role · domain · years · skills matched · rate · start) and WO waiting-on.
  const { providerLabel, providerNumbers } = await import("@/lib/provider-number");
  const propRows = await prisma.proposal.findMany({ where: { job_id: { in: paths.map((p) => p.job.id) }, status: { in: ["SUBMITTED", "SHORTLISTED", "AWARDED"] } }, orderBy: { submitted_at: "asc" }, select: { job_id: true, provider_person_id: true, lines: { take: 1, select: { unit_price_cents: true, uom: true, available_from: true } } } });
  const provIds = [...new Set(propRows.map((r) => r.provider_person_id))];
  const profs = provIds.length ? await prisma.providerProfile.findMany({ where: { person_id: { in: provIds } }, select: { id: true, person_id: true, person: { select: { title: true } }, employers: { select: { start_date: true } }, skills: { select: { skill_id: true } } } }) : [];
  const nums = await providerNumbers(profs.map((p) => p.id));
  const woRows = await prisma.workOrder.findMany({ where: { id: { in: paths.flatMap((p) => p.orders.map((o) => o.id)) } }, select: { id: true, status: true, buyer_accepted_at: true, provider_accepted_at: true } });
  const ids = paths.map((p) => p.job.id);
  const [props, ivs, tests] = await Promise.all([
    prisma.proposal.findMany({ where: { job_id: { in: ids }, status: { notIn: ["DRAFT", "WITHDRAWN"] } }, select: { job_id: true, status: true, lines: { take: 1, select: { unit_price_cents: true } } } }),
    prisma.interviewRequest.groupBy({ by: ["job_id"], where: { job_id: { in: ids }, status: { in: ["REQUESTED", "SLOTS_OFFERED", "SCHEDULED", "COMPLETED"] } }, _count: { _all: true } }),
    prisma.testRequest.groupBy({ by: ["job_id"], where: { job_id: { in: ids } }, _count: { _all: true } }),
  ]);
  const { orderSlices } = await import("@/lib/slices");
  const slices = await orderSlices(paths.flatMap((p) => p.orders.map((o) => o.id)));
  const jobRows: JobTabRow[] = [];
  const requestRows: { completed: boolean; recurring: import("@/lib/slices").Recurring | null; providerPersonId: string; id: string; jobId: string; title: string; wr: string | null; who: string; step: string; approval: string; wo: { id: string; number: string } | null }[] = [];
  for (const p of paths) {
    const j = jobs.find((x) => x.id === p.job.id)!;
    const mine = props.filter((x) => x.job_id === p.job.id);
    const rates = mine.map((x) => x.lines[0]?.unit_price_cents).filter((c): c is number => c != null).sort((a, b) => a - b);
    const asked = p.event?.proposalRequests.length ?? 0;
    const per = j.budget_type === "FIXED" ? "" : "/hr";
    const step = (p.awarded ? (p.orders.length ? "wo" : p.wrs.some((w) => w.approved_at) ? "approval" : "award") : p.current ?? "shortlist") as PathKey;
    const postedAt = p.job.posted_at ?? p.job.created_at;
    const lastDone = [...p.shown].reverse().find((s) => s.done)?.date ?? postedAt;
    const submitted = mine.filter((x) => x.status === "SUBMITTED").length;
    const expired = !!p.event && p.event.deadline_at < now && !p.awarded;
    const action = step === "proposals" && p.event ? { label: "Review proposals", href: `/hire/sourcing/${p.event.id}` }
      : step === "shortlist" || step === "request" ? { label: "Request proposals", href: `/work-requests/${p.job.id}#matches` }
      : step === "award" || (step === "interview" || step === "test") ? { label: "Award", href: p.event ? `/hire/sourcing/${p.event.id}` : `/work-requests/${p.job.id}` }
      : p.orders[0] ? { label: "Open Work Order", href: `/orders/${p.orders[0].id}` } : { label: "Open", href: `/work-requests/${p.job.id}` };
    const iv = ivs.find((x) => x.job_id === p.job.id)?._count._all ?? 0;
    const ts = tests.find((x) => x.job_id === p.job.id)?._count._all ?? 0;
    const woSl = p.orders.map((o) => slices.get(o.id)).filter((x): x is NonNullable<typeof x> => !!x);
    const jobDone = ["CLOSED", "CANCELED"].includes(p.job.status) || (woSl.length > 0 && woSl.every((x) => x.completed));
    const pr = j.budget_min_cents ?? null, prMax = j.budget_max_cents ?? null;
    const within = (c: number | null) => (c == null || (pr == null && prMax == null) ? null : (pr == null || c >= pr) && (prMax == null || c <= prMax));
    const proposalLines: ProposalLine[] = propRows.filter((r) => r.job_id === p.job.id).map((r) => {
      const pf = profs.find((x) => x.person_id === r.provider_person_id);
      const starts = pf?.employers.map((e) => e.start_date?.getTime()).filter((t): t is number => !!t) ?? [];
      const years = starts.length ? Math.floor((Date.now() - Math.min(...starts)) / (365.25 * DAY)) : null;
      const jobSkills = new Set(j.skills.map((s) => s.skill_id));
      const hit = pf ? pf.skills.filter((s) => jobSkills.has(s.skill_id)).length : 0;
      const c = r.lines[0]?.unit_price_cents ?? null;
      return {
        personId: r.provider_person_id, who: providerLabel(pf ? nums.get(pf.id) : null).replace(/^Provider /, ""),
        summary: [pf?.person.title, j.domains[0], years ? `${years}+ years` : null, jobSkills.size ? `${hit} of ${jobSkills.size} skills` : null].filter(Boolean).join(" · "),
        rate: c != null ? `${usd(c)}${per}` : null, start: r.lines[0]?.available_from ? `Start ${short(r.lines[0].available_from).replace(/, \d.*$/, "")}` : null, inRange: within(c),
      };
    });
    const firstWo = p.orders[0] ? woRows.find((w) => w.id === p.orders[0].id) : null;
    const woLine = p.wrs.flatMap((w) => w.lines).find((l) => l.work_order_id === p.orders[0]?.id);
    const waiting = !firstWo ? "" : firstWo.status === "ISSUED" ? (!firstWo.buyer_accepted_at ? "You, then the provider" : "The provider") : firstWo.status === "ACCEPTED" ? "Release" : ["RELEASED", "ACTIVE"].includes(firstWo.status) ? "Delivery" : "Nobody";
    const contract = (j.contract_types as string[]).map((c) => (c === "ONE_099" ? "1099" : c)).join("/");
    jobRows.push({
      category: j.commodity_group_id ? groupNames.get(j.commodity_group_id) ?? null : null,
      origin: p.event ? "Sourcing Event" : p.wrs.length ? "Sole-Sourced" : null,
      facts: [p.job.job_number, `Posted ${short(postedAt).replace(/, \d.*$/, "")}`, j.worksite ? j.worksite[0] + j.worksite.slice(1).toLowerCase() : null, [j.city, j.state].filter(Boolean).join(", ") || null, contract || null, j.budget_min_cents != null || j.budget_max_cents != null ? `${j.budget_min_cents != null ? usd(j.budget_min_cents) : "…"}–${j.budget_max_cents != null ? usd(j.budget_max_cents) : "…"}${per}` : null].filter(Boolean).join(" · "),
      inRange: rates.length ? rates.every((c) => within(c) !== false) : null,
      wo: firstWo && p.orders[0] ? { id: firstWo.id, number: p.orders[0].order_number, provider: woLine ? p.numberOf(woLine.provider_person_id!).replace(/^Provider /, "") : "—", waiting } : null,
      proposalLines, asked, eventId: p.event?.id ?? null, deadlineAt: p.event?.deadline_at.toISOString() ?? null,
      completed: jobDone, recurring: woSl.find((x) => x.recurring)?.recurring ?? null,
      id: p.job.id, step, title: p.job.title || "Untitled job", ref: p.job.job_number, who: null, posted: postedAt.toISOString(), days: daysSince(lastDone),
      due: p.event ? short(p.event.deadline_at) : null, action, old: daysSince(postedAt) > 5 && !submitted,
      proposals: p.event ? `${p.event.proposalRequests.filter((r) => r.bid && !["DRAFT", "WITHDRAWN"].includes(r.bid.status)).length} of ${asked} in` : mine.length ? `${mine.length} in` : null,
      rates: rates.length ? (rates[0] === rates.at(-1) ? `${usd(rates[0])}${per}` : `${usd(rates[0])}–${usd(rates.at(-1)!)}${per}`) : null,
      range: j.budget_min_cents != null || j.budget_max_cents != null ? `${j.budget_min_cents != null ? usd(j.budget_min_cents) : "…"}–${j.budget_max_cents != null ? usd(j.budget_max_cents) : "…"}${per}` : null,
      booked: iv || ts ? [iv ? `${iv} interview${iv === 1 ? "" : "s"}` : null, ts ? `${ts} test${ts === 1 ? "" : "s"}` : null].filter(Boolean).join(" · ") : null,
      needsAction: submitted > 0 || expired || (!!firstWo && firstWo.status === "ISSUED" && !firstWo.buyer_accepted_at),
    });
    const last = jobRows[jobRows.length - 1];
    if (firstWo && firstWo.status === "ISSUED" && !firstWo.buyer_accepted_at) last.action = { label: "Review & Accept", href: `/orders/${firstWo.id}` };
    for (const w of p.wrs) for (const l of w.lines) {
      const wo = p.orders.find((o) => o.id === l.work_order_id);
      const sl = wo ? slices.get(wo.id) : null;
      requestRows.push({ completed: !!sl?.completed, recurring: sl?.recurring ?? null, providerPersonId: l.provider_person_id!, id: `${w.id}:${l.provider_person_id}`, jobId: p.job.id, title: p.job.title, wr: w.wr_number, who: p.numberOf(l.provider_person_id!), step: wo ? "Work Order Created" : w.approved_at ? "Approval" : "Award", approval: w.approved_at ? "Auto-approved" : w.status === "PENDING_APPROVAL" ? "Waiting" : "—", wo: wo ? { id: wo.id, number: wo.order_number } : null });
    }
  }
  return { jobRows, requestRows };
}

/** Tests the buyer sent (provider number, skill, sent, score, pass/fail). */
export async function buyerTests(personId: string) {
  const { providerLabel, providerNumbers } = await import("@/lib/provider-number");
  const rows = await prisma.testRequest.findMany({ where: { requested_by_person_id: personId }, orderBy: { created_at: "desc" }, take: 100, select: { id: true, job_id: true, provider_person_id: true, created_at: true, status: true, lines: { take: 1, select: { skill_id: true } }, response: { select: { lines: { take: 1, select: { score: true, passed: true } } } } } });
  const profiles = await prisma.providerProfile.findMany({ where: { person_id: { in: rows.map((r) => r.provider_person_id) } }, select: { id: true, person_id: true } });
  const nums = await providerNumbers(profiles.map((p) => p.id));
  const skills = await prisma.skill.findMany({ where: { id: { in: rows.map((r) => r.lines[0]?.skill_id).filter((x): x is string => !!x) } }, select: { id: true, name: true } });
  return rows.map((r) => {
    const res = r.response?.lines[0];
    const completed = res?.passed != null || ["COMPLETED", "DECLINED", "EXPIRED"].includes(r.status);
    return { completed, recurring: null, providerPersonId: r.provider_person_id, id: r.id, jobId: r.job_id, who: providerLabel(nums.get(profiles.find((p) => p.person_id === r.provider_person_id)?.id ?? "")), skill: skills.find((s) => s.id === r.lines[0]?.skill_id)?.name ?? "Certification test", sent: short(r.created_at), score: res?.score ?? null, result: res?.passed == null ? (r.status === "COMPLETED" ? "Completed" : r.status === "DECLINED" ? "Declined" : "Pending") : res.passed ? "Pass" : "Fail" };
  });
}

/** RA-E006: tests sent to this provider (job, skill, sent, status / result). */
export async function providerTests(personId: string) {
  const rows = await prisma.testRequest.findMany({ where: { provider_person_id: personId }, orderBy: { created_at: "desc" }, take: 100, select: { id: true, job_id: true, created_at: true, status: true, responds_by: true, lines: { take: 1, select: { skill_id: true } }, response: { select: { lines: { take: 1, select: { score: true, passed: true } } } } } });
  const [jobs, skills] = await Promise.all([
    prisma.job.findMany({ where: { id: { in: rows.map((r) => r.job_id) } }, select: { id: true, title: true } }),
    prisma.skill.findMany({ where: { id: { in: rows.map((r) => r.lines[0]?.skill_id).filter((x): x is string => !!x) } }, select: { id: true, name: true } }),
  ]);
  return rows.map((r) => {
    const res = r.response?.lines[0];
    return { id: r.id, jobId: r.job_id, job: jobs.find((j) => j.id === r.job_id)?.title ?? "Job", skill: skills.find((s) => s.id === r.lines[0]?.skill_id)?.name ?? "Certification test", sent: short(r.created_at), due: r.responds_by ? short(r.responds_by) : null, open: r.status === "ISSUED" || r.status === "IN_PROGRESS", score: res?.score ?? null, result: res?.passed == null ? (r.status === "COMPLETED" ? "Completed" : r.status === "DECLINED" ? "Declined" : r.status === "EXPIRED" ? "Expired" : "To take") : res.passed ? "Pass" : "Fail" };
  });
}

// ── HL-E001: "{n} things need you today" — one row per thing, with a plain sentence ─────────────────────────────
export type TodayItem = { id: string; kind: "proposals" | "accept" | "closing" | "expired" | "confirm" | "interview" | "tests" | "approval"; what: string; detail: string; href: string; action: string };
export async function hireToday(personId: string): Promise<{ items: TodayItem[]; sentence: string }> {
  const now = new Date();
  const items: TodayItem[] = [];
  const usd0 = (c: number) => `$${Math.round(c / 100).toLocaleString("en-US")}`;
  const [events, orders, ivConfirm, ivToday, testsIn, approvals] = await Promise.all([
    prisma.sourcingEvent.findMany({ where: { created_by_person_id: personId, type: "PROPOSALS", status: "OPEN" }, select: { id: true, event_number: true, deadline_at: true, job: { select: { title: true, budget_type: true } }, proposalRequests: { select: { bid: { select: { status: true, lines: { take: 1, select: { unit_price_cents: true } } } } } } } }),
    prisma.workOrder.findMany({ where: { buyer_person_id: personId, status: "ISSUED", buyer_accepted_at: null }, select: { id: true, order_number: true } }),
    prisma.interviewRequest.findMany({ where: { requested_by_person_id: personId, status: "SLOTS_OFFERED" }, select: { id: true, job_id: true } }),
    listInterviews({ buyerPersonId: personId, from: nyDayStart(now), to: nyDayStart(now, 1) }),
    prisma.testRequest.count({ where: { requested_by_person_id: personId, status: "COMPLETED", updated_at: { gte: new Date(now.getTime() - 7 * DAY) } } }),
    prisma.workRequest.findMany({ where: { job: { buyer_person_id: personId }, status: "PENDING_APPROVAL" }, select: { id: true, wr_number: true, job_id: true } }),
  ]);
  for (const ev of events) {
    const subs = ev.proposalRequests.filter((r) => r.bid?.status === "SUBMITTED");
    const per = ev.job.budget_type === "FIXED" ? "" : "/hr";
    const rates = subs.map((r) => r.bid!.lines[0]?.unit_price_cents).filter((c): c is number => c != null).sort((a, b) => a - b);
    if (subs.length) items.push({ id: `p-${ev.id}`, kind: "proposals", what: `Review ${subs.length} proposal${subs.length === 1 ? "" : "s"}`, detail: [ev.job.title, rates.length ? (rates[0] === rates.at(-1) ? `${usd0(rates[0])}${per}` : `${usd0(rates[0])}–${usd0(rates.at(-1)!)}${per}`) : null, `due ${short(ev.deadline_at)}`].filter(Boolean).join(" · "), href: `/hire/sourcing/${ev.id}`, action: "Review" });
    else if (ev.deadline_at <= now) items.push({ id: `x-${ev.id}`, kind: "expired", what: `${ev.event_number} closed with no proposals`, detail: `${ev.job.title} · extend the deadline or ask more providers`, href: `/hire/sourcing/${ev.id}`, action: "Open" });
    else if (ev.deadline_at.getTime() - now.getTime() < DAY) items.push({ id: `c-${ev.id}`, kind: "closing", what: `${ev.event_number} closes in under 24 hours`, detail: `${ev.job.title} · due ${short(ev.deadline_at)}`, href: `/hire/sourcing/${ev.id}`, action: "Open" });
  }
  for (const o of orders) items.push({ id: `a-${o.id}`, kind: "accept", what: `Accept Work Order ${o.order_number}`, detail: "The provider accepts once you have", href: `/orders/${o.id}`, action: "Review & Accept" });
  for (const iv of ivConfirm) items.push({ id: `i-${iv.id}`, kind: "confirm", what: "Confirm an interview time", detail: "The provider offered times", href: `/work-requests/${iv.job_id}#interviews`, action: "Confirm" });
  for (const iv of ivToday) items.push({ id: `t-${iv.id}`, kind: "interview", what: `Interview at ${iv.startsAt ? new Date(iv.startsAt).toLocaleTimeString("en-US", { timeZone: TZ, hour: "numeric", minute: "2-digit" }) : "today"}`, detail: `${iv.providerLabel} · ${iv.jobTitle}`, href: `/work-requests/${iv.jobId}#interviews`, action: iv.hasRoom ? "Join" : "Open" });
  if (testsIn) items.push({ id: "tests", kind: "tests", what: `${testsIn} test result${testsIn === 1 ? "" : "s"} in`, detail: "Scores and pass / fail are on the Tests tab", href: "/hire/overview?tab=tests", action: "See results" });
  for (const w of approvals) items.push({ id: `w-${w.id}`, kind: "approval", what: `Approve Work Request ${w.wr_number ?? ""}`.trim(), detail: "Approval creates the Work Order", href: w.job_id ? `/work-requests/${w.job_id}` : "/hire/overview?tab=requests", action: "Approve" });
  const count = (k: TodayItem["kind"]) => items.filter((i) => i.kind === k).length;
  const word = (n: number) => (n === 1 ? "One" : String(n));
  const parts: string[] = [];
  const pr = items.filter((i) => i.kind === "proposals").reduce((n, i) => n + Number(/\d+/.exec(i.what)?.[0] ?? 1), 0);
  if (pr) parts.push(`${word(pr)} proposal${pr === 1 ? " is" : "s are"} waiting for your review`);
  if (count("accept")) parts.push(`${word(count("accept")).toLowerCase()} Work Order${count("accept") === 1 ? " needs" : "s need"} your acceptance before the provider can accept`);
  if (count("confirm")) parts.push(`${word(count("confirm")).toLowerCase()} interview${count("confirm") === 1 ? " needs" : "s need"} a time confirmed`);
  if (count("interview")) parts.push(`you have ${count("interview")} interview${count("interview") === 1 ? "" : "s"} today`);
  if (count("closing") + count("expired")) parts.push(`${count("closing") + count("expired")} Sourcing Event${count("closing") + count("expired") === 1 ? " needs" : "s need"} a decision`);
  if (count("tests")) parts.push("test results are in");
  if (count("approval")) parts.push(`${count("approval")} Work Request${count("approval") === 1 ? " needs" : "s need"} approval`);
  const s = parts.length ? parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(", ")}, and ${parts.at(-1)}` : "Your jobs are moving on their own. Post a job or check on the ones below.";
  return { items, sentence: parts.length ? `${s[0].toUpperCase()}${s.slice(1)}.` : s };
}
