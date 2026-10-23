import { prisma } from "@/lib/prisma";
import { jobPath } from "@/lib/work-request-path";

// OJ-E001: the Job page's one process strip — Create · Matches · Ask · Interview · Hire · Approve · Work Order · Release.
// done = ink bar + green "✓ fact", current = magenta, later = grey; Hire Directly jobs skip Ask and Interview.
export type StripKey = "create" | "matches" | "ask" | "interview" | "hire" | "approve" | "wo" | "release";
export type StripStep = { key: StripKey; label: string; state: "done" | "current" | "later" | "skipped"; top: string; /** Scott 10-23: what was done, in two or three words ("Used AI", "Compare + Published"). */ note?: string };
export type JobTab = "matches" | "responses" | "interviews" | "tests" | "work-order" | "details";

const day = (d: Date | null | undefined) => (d ? d.toLocaleDateString("en-US", { timeZone: "America/New_York", month: "short", day: "numeric" }) : "");
const REVEALED = new Set(["RELEASED", "ACTIVE", "ON_HOLD", "CLOSED", "FINALLY_CLOSED"]);

export async function jobStrip(jobId: string) {
  const path = await jobPath(jobId);
  if (!path) return null;
  const { job, event, wrs, orders, awarded } = path;
  const [booked, invited, wo, stars] = await Promise.all([
    prisma.interviewRequest.count({ where: { job_id: jobId, status: { in: ["SCHEDULED", "COMPLETED"] } } }),
    prisma.interviewRequest.count({ where: { job_id: jobId, status: { in: ["REQUESTED", "SLOTS_OFFERED", "SCHEDULED", "COMPLETED"] } } }),
    orders[0] ? prisma.workOrder.findUnique({ where: { id: orders[0].id }, select: { id: true, order_number: true, status: true, buyer_accepted_at: true, provider_accepted_at: true, created_at: true } }) : null,
    prisma.shortlistLine.count({ where: { shortlist: { job_id: jobId }, source: { in: ["SHORTLISTED", "ADDED"] } } }),
  ]);
  // AQ-E005: written answers count as the Interview step too.
  const [answered, completed] = await Promise.all([
    prisma.questionAnswer.count({ where: { questionSet: { job_id: jobId }, submitted_at: { not: null } } }),
    prisma.interviewRequest.count({ where: { job_id: jobId, status: "COMPLETED" } }),
  ]);
  const asked = event?.proposalRequests.length ?? 0;
  const inN = event?.proposalRequests.filter((r) => r.bid && !["DRAFT", "WITHDRAWN"].includes(r.bid.status)).length ?? 0;
  const direct = awarded && !event;
  const approvedAt = wrs.map((w) => w.approved_at).find(Boolean) ?? null;
  const accepted = !!wo?.buyer_accepted_at && !!wo?.provider_accepted_at;
  const released = !!wo && REVEALED.has(wo.status);
  const done: Record<StripKey, boolean> = {
    create: true,
    // A door is chosen: providers asked, someone hired, or the job published. Stars alone are still choosing.
    matches: !!event || awarded || (job.status === "OPEN" && !!job.posted_at),
    ask: !!event && (inN >= asked || event.deadline_at < new Date() || awarded) && inN > 0,
    interview: (!!event && awarded) || answered > 0 || completed > 0,
    hire: awarded,
    approve: !!approvedAt,
    wo: accepted,
    release: released,
  };
  const skipped = (k: StripKey) => direct && (k === "ask" || k === "interview");
  // Scott 10-23: the Job Timeline — numbered steps.
  // Scott 10-23: the Job Timeline is the buyer's own job and ends at Hire; the Request and the Order carry their own steps.
  const order: [StripKey, string][] = [["create", "Create Job"], ["matches", "Choose Provider"], ["ask", "Collect Responses"], ["interview", "Interview & Ask"], ["hire", "Hire Provider"]];
  // The current step: the first not done (and not skipped); while answers are in and nobody is hired, the job sits at Interview.
  const current = order.find(([k]) => !done[k] && !skipped(k))?.[0] ?? null;
  // Scott 10-23: each step says how it was done, above its date — where we are and how we got here.
  const [jobX, origin] = await Promise.all([
    prisma.job.findUnique({ where: { id: jobId }, select: { source_text: true, posted_at: true, status: true } }),
    import("@/lib/job-stage").then(({ jobStages }) => jobStages([jobId])).then((m) => m.get(jobId)?.origin ?? null).catch(() => null),
  ]);
  const published = !!jobX?.posted_at && jobX.status !== "DRAFT";
  const hiredWho = wrs[0]?.lines[0]?.provider_person_id ? path.numberOf(wrs[0].lines[0].provider_person_id).replace(/^Provider /, "") : "";
  const note: Partial<Record<StripKey, string>> = {
    create: String(origin ?? "").includes("ERP") ? "From ERP" : jobX?.source_text ? "Used AI" : "Manual",
    matches: [event ? "Compare" : null, direct ? "Hire Directly" : null, published ? "Published" : null].filter(Boolean).join(" + "),
    ask: event ? `${inN} of ${asked} In` : "",
    interview: [booked ? `${booked} Booked` : invited ? `${invited} Invited` : null, answered ? `${answered} Answered` : null].filter(Boolean).join(" · "),
    hire: awarded ? (hiredWho || "Hired") : "",
  };
  const top: Record<StripKey, string> = {
    create: `✓ ${day(job.created_at)}`,
    matches: done.matches ? `✓ ${day(event?.created_at ?? job.posted_at ?? job.created_at)}` : "Now",
    ask: done.ask ? `✓ ${inN} of ${asked} in` : event ? `${inN} of ${asked} in` : "",
    interview: [booked ? `${booked} booked` : invited ? `${invited} invited` : null, answered ? `${answered} answered` : null].filter(Boolean).join(" · ") || (current === "interview" ? "Optional" : ""),
    hire: awarded ? `✓ ${day(wrs[0]?.submitted_at ?? wrs[0]?.created_at)}` : "",
    approve: approvedAt ? "✓ Auto" : "",
    wo: accepted ? "✓ Accepted" : wo ? "Waiting" : "",
    release: released ? "✓ Released" : "",
  };
  void top;
  const dateOf: Record<StripKey, string> = {
    create: `✓ ${day(job.created_at)}`,
    matches: `✓ ${day(event?.created_at ?? jobX?.posted_at ?? wrs[0]?.created_at ?? job.created_at)}`,
    ask: `✓ ${day(event?.deadline_at && event.deadline_at < new Date() ? event.deadline_at : new Date())}`,
    interview: "✓",
    hire: `✓ ${day(wrs[0]?.submitted_at ?? wrs[0]?.created_at)}`,
    approve: "", wo: "", release: "",
  };
  const steps: StripStep[] = order.map(([key, label]) => ({
    key, label,
    state: skipped(key) ? "skipped" : done[key] && key !== current ? "done" : key === current ? "current" : "later",
    top: skipped(key) ? "Skipped" : done[key] && key !== current ? dateOf[key] : key === current ? (note[key] ? "" : "Now") : "",
    note: skipped(key) ? "" : note[key] ?? "",
  }));
  const tab: JobTab = !current ? "work-order" : current === "interview" ? "interviews" : current === "ask" || current === "hire" ? (direct ? "work-order" : "responses") : "matches";
  return { steps, current, defaultTab: tab, event, direct, wo, path, approvedAt, accepted, released };
}
