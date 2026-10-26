import { prisma } from "@/lib/prisma";
import { jobPath } from "@/lib/work-request-path";
import { REQUEST_STATUS_LABEL, requestStatus } from "@/lib/request-status";

// OJ-E001: the Job page's one process strip — Create · Matches · Ask · Interview · Hire · Approve · Work Order · Release.
// done = ink bar + green "✓ fact", current = magenta, later = grey; Hire Directly jobs skip Ask and Interview.
export type StripKey = "create" | "matches" | "ask" | "questions" | "interview" | "hire" | "approve" | "wo" | "release";
export type StripStep = { key: StripKey; label: string; state: "done" | "current" | "later" | "skipped"; top: string; /** Scott 10-23: what was done, in two or three words ("Used AI", "Compare + Published"). */ note?: string };
export type JobTab = "matches" | "responses" | "questions" | "interviews" | "tests" | "work-order" | "details";

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
  const [answered, completed, qSent] = await Promise.all([
    prisma.questionAnswer.count({ where: { questionSet: { job_id: jobId }, submitted_at: { not: null } } }),
    prisma.interviewRequest.count({ where: { job_id: jobId, status: "COMPLETED" } }),
    prisma.questionAnswer.count({ where: { questionSet: { job_id: jobId } } }),
  ]);
  const asked = event?.proposalRequests.length ?? 0;
  const inN = event?.proposalRequests.filter((r) => r.bid && !["DRAFT", "WITHDRAWN"].includes(r.bid.status)).length ?? 0;
  const direct = awarded && !event;
  const approvedAt = wrs.map((w) => w.approved_at).find(Boolean) ?? null;
  const accepted = !!wo?.buyer_accepted_at && !!wo?.provider_accepted_at;
  const released = !!wo && REVEALED.has(wo.status);
  // Scott 10-23: 1 Create Job · 2 Choose Provider(s) · 3 Request Availability · 4 Ask Questions · 5 Interview Provider(s) · 6 Hire Provider.
  // 4 and 5 are optional: they never block Hire; they are current only while something is waiting in them.
  const qPending = qSent > answered;
  const ivPending = invited > completed;
  const done: Record<StripKey, boolean> = {
    create: true,
    // A door is chosen: providers asked, someone hired, or the job published. Stars alone are still choosing.
    matches: !!event || awarded || (job.status === "OPEN" && !!job.posted_at),
    ask: !!event && (inN >= asked || event.deadline_at < new Date() || awarded) && inN > 0,
    questions: qSent > 0 && !qPending,
    interview: invited > 0 && !ivPending,
    hire: awarded,
    approve: !!approvedAt,
    wo: accepted,
    release: released,
  };
  const optional = (k: StripKey) => k === "questions" || k === "interview";
  const skipped = (k: StripKey) => (direct && (k === "ask" || k === "questions" || k === "interview")) || (awarded && optional(k) && !done[k] && !(k === "questions" ? qSent : invited));
  const order: [StripKey, string][] = [["create", "Create Job"], ["matches", "Choose Provider(s)"], ["ask", "Request Availability"], ["questions", "Ask Questions"], ["interview", "Interview Provider(s)"], ["hire", "Request to Hire"]];
  const busyOptional: StripKey | null = !awarded && qPending ? "questions" : !awarded && ivPending ? "interview" : null;
  const current: StripKey | null = busyOptional ?? order.find(([k]) => !done[k] && !skipped(k) && !optional(k))?.[0] ?? null;
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
    ask: event ? `${asked} Asked · ${inN} Available` : "",
    questions: qSent ? `${answered} of ${qSent} Answered` : "",
    interview: invited ? [booked ? `${booked} Booked` : `${invited} Invited`, completed ? `${completed} Done` : null].filter(Boolean).join(" · ") : "",
    // JR-E003: step 6 notes the Request number and its status.
    hire: awarded && wrs[0] ? [wrs[0].wr_number, (() => { const s = requestStatus(wrs[0]); return s ? REQUEST_STATUS_LABEL[s] : null; })()].filter(Boolean).join(" · ") || hiredWho : "",
  };
  const top: Record<StripKey, string> = {
    create: `✓ ${day(job.created_at)}`,
    matches: done.matches ? `✓ ${day(event?.created_at ?? job.posted_at ?? job.created_at)}` : "Now",
    ask: done.ask ? `✓ ${inN} of ${asked} in` : event ? `${inN} of ${asked} in` : "",
    questions: "",
    interview: "",
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
    questions: "✓",
    interview: "✓",
    hire: `✓ ${day(wrs[0]?.submitted_at ?? wrs[0]?.created_at)}`,
    approve: "", wo: "", release: "",
  };
  const steps: StripStep[] = order.map(([key, label]) => ({
    key, label,
    state: skipped(key) ? "skipped" : done[key] && key !== current ? "done" : key === current ? "current" : "later",
    top: skipped(key) ? "Skipped" : done[key] && key !== current ? dateOf[key] : key === current ? (note[key] ? "" : "Now") : optional(key) && !note[key] ? "Optional" : "",
    note: skipped(key) ? "" : note[key] ?? "",
  }));
  const tab: JobTab = !current ? "work-order" : current === "interview" ? "interviews" : current === "questions" ? "questions" : current === "ask" || current === "hire" ? (direct ? "work-order" : "responses") : "matches";
  return { steps, current, defaultTab: tab, event, direct, wo, path, approvedAt, accepted, released };
}
