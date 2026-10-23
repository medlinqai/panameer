import { prisma } from "@/lib/prisma";
import type { Viewer } from "@/lib/access";
import { SourcingError } from "@/lib/sourcing";
import { notify, resolveNotifications } from "@/lib/notifications";
import { cleanAnswer, isAnswered, normalizeAnswers, normalizeQuestions, scoreAnswers, type Answer, type Question } from "@/lib/question-types";

// AQ: written questions to the shortlist — "Interview & Ask". Same identity rule as interviews (no names, companies or contacts).

async function me(viewer: Viewer) {
  const p = await prisma.person.findUnique({ where: { user_id: viewer.userId }, select: { id: true, first_name: true, last_name: true } });
  if (!p) throw new SourcingError("No person for this account.", "NOT_FOUND");
  return p;
}
async function ownJob(viewer: Viewer, jobId: string) {
  const p = await me(viewer);
  const job = await prisma.job.findUnique({ where: { id: jobId }, select: { id: true, title: true, buyer_person_id: true, description: true, start_date: true, end_date: true, required: true, skills: { take: 12, select: { skill: { select: { name: true } } } } } });
  if (!job || job.buyer_person_id !== p.id) throw new SourcingError("Only the buyer can do that.", "NOT_BUYER");
  return { p, job };
}

/** AQ-E002: Draft With AI — 3 to 5 questions from the job's description, skills and dates (the buyer edits before sending). */
export async function draftQuestions(viewer: Viewer, jobId: string): Promise<Question[]> {
  const { job } = await ownJob(viewer, jobId);
  const { callExtractionModel } = await import("@/lib/resume/ai-provider");
  const text = [`Title: ${job.title}`, job.description ? `Description: ${job.description}` : null, job.required ? `Required: ${job.required}` : null,
    job.skills.length ? `Skills: ${job.skills.map((s) => s.skill.name).join(", ")}` : null,
    job.start_date ? `Dates: ${job.start_date.toISOString().slice(0, 10)} to ${job.end_date?.toISOString().slice(0, 10) ?? "open"}` : null].filter(Boolean).join("\n");
  const call = await callExtractionModel({
    timeoutMs: 60_000,
    system: "You help a buyer screen contractors in writing before an interview. Write 3 to 5 short, specific questions (one sentence each) that test real experience with this job's work, tools and dates. Never ask for names, company names, email, phone or social profiles.",
    schema: { type: "object", properties: { questions: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 5 } }, required: ["questions"] },
    schemaName: "record_questions",
    text,
    instruction: "Write the screening questions for this job.",
    tag: "job",
    toolDescription: "Record 3 to 5 screening questions.",
    maxOutputTokens: 1_200,
  });
  if (!call.ok) throw new SourcingError("We couldn't draft questions right now — write your own or try again.", "AI");
  return normalizeQuestions((call.value as { questions?: unknown }).questions);
}

/** AQ-E002: Send to {n} — one QuestionAnswer per provider, a notice and an email each. */
export async function sendQuestions(viewer: Viewer, input: { jobId: string; providerPersonIds: string[]; questions: unknown; dueAt?: string | null }) {
  const { p, job } = await ownJob(viewer, input.jobId);
  const questions = normalizeQuestions(input.questions).map((q) => ({ ...q, text: q.text.trim().slice(0, 500) }));
  if (!questions.length) throw new SourcingError("Write at least one question.", "INVALID");
  const ids = [...new Set(input.providerPersonIds)].filter(Boolean).slice(0, 50);
  if (!ids.length) throw new SourcingError("Pick at least one provider.", "INVALID");
  const ev = await prisma.sourcingEvent.findFirst({ where: { job_id: job.id, status: { not: "DRAFT" } }, orderBy: { created_at: "desc" }, select: { deadline_at: true } });
  const due = input.dueAt && Date.parse(input.dueAt) > Date.now() ? new Date(input.dueAt) : ev && ev.deadline_at > new Date() ? ev.deadline_at : new Date(Date.now() + 48 * 3_600_000);
  const set = await prisma.questionSet.create({ data: { job_id: job.id, created_by_person_id: p.id, questions, due_at: due }, select: { id: true } });
  const buyerName = `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || "A Buyer";
  const dueText = due.toLocaleDateString("en-US", { timeZone: "America/New_York", month: "short", day: "numeric" });
  for (const providerPersonId of ids) {
    const a = await prisma.questionAnswer.create({ data: { question_set_id: set.id, provider_person_id: providerPersonId }, select: { id: true } });
    await notify({ event: "work.questions_asked", personId: providerPersonId, entityType: "question_answer", entityId: a.id, dedupeKey: `work.questions_asked:${a.id}`, vars: { buyerName, count: String(questions.length), workTitle: job.title, due: dueText, jobId: job.id } });
  }
  return { sent: ids.length };
}

export type ProviderQuestions = { answerId: string; questions: Question[]; answers: Answer[]; dueAt: string | null; submittedAt: string | null };
/** AQ-E003: this provider's question sets on a job (newest first). */
export async function providerQuestions(personId: string, jobId: string): Promise<ProviderQuestions[]> {
  const rows = await prisma.questionAnswer.findMany({ where: { provider_person_id: personId, questionSet: { job_id: jobId } }, orderBy: { created_at: "desc" }, select: { id: true, answers: true, submitted_at: true, questionSet: { select: { questions: true, due_at: true } } } });
  return rows.map((r) => { const questions = normalizeQuestions(r.questionSet.questions); return { answerId: r.id, questions, answers: normalizeAnswers(r.answers, questions.length), dueAt: r.questionSet.due_at?.toISOString() ?? null, submittedAt: r.submitted_at?.toISOString() ?? null }; });
}

/** AQ-E003: Save Draft or Send Answers (contacts stripped; 1,000 characters each). */
export async function saveAnswers(viewer: Viewer, answerId: string, answers: unknown, send: boolean) {
  const p = await me(viewer);
  const row = await prisma.questionAnswer.findUnique({ where: { id: answerId }, select: { id: true, provider_person_id: true, submitted_at: true, questionSet: { select: { job_id: true, created_by_person_id: true, questions: true } } } });
  if (!row || row.provider_person_id !== p.id) throw new SourcingError("Those questions aren't yours.", "NOT_FOUND");
  if (row.submitted_at) throw new SourcingError("You've already sent these answers.", "INVALID");
  const { stripContacts } = await import("@/lib/work-request/job-import");
  const qs = normalizeQuestions(row.questionSet.questions);
  const clean = normalizeAnswers(answers, qs.length).map((a, i) => cleanAnswer(qs[i], a, stripContacts));
  if (send && clean.some((a, i) => !isAnswered(qs[i], a))) throw new SourcingError("Answer every question before sending.", "INVALID");
  await prisma.questionAnswer.update({ where: { id: row.id }, data: { answers: clean, ...(send ? { submitted_at: new Date() } : {}) } });
  if (!send) return;
  await resolveNotifications({ dedupe_key: `work.questions_asked:${row.id}` });
  const { providerNameForBuyer } = await import("@/lib/provider-number");
  const job = await prisma.job.findUnique({ where: { id: row.questionSet.job_id }, select: { title: true } });
  const who = await providerNameForBuyer(row.questionSet.created_by_person_id, p.id, `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim());
  await notify({ event: "work.questions_answered", personId: row.questionSet.created_by_person_id, entityType: "question_answer", entityId: row.id, dedupeKey: `work.questions_answered:${row.id}`, vars: { who: who.replace(/^Provider /, ""), workTitle: job?.title ?? "", jobId: row.questionSet.job_id } });
}

export type BuyerQA = { status: "sent" | "in"; questions: Question[]; answers: Answer[]; score: { score: number; max: number; knockedOut: string | null } | null };
/** AQ-E004: per provider on a job — Answers In (with the Q&A) or Questions Sent. Latest set wins. */
export async function buyerAnswers(jobId: string): Promise<Map<string, BuyerQA>> {
  const rows = await prisma.questionAnswer.findMany({ where: { questionSet: { job_id: jobId } }, orderBy: { created_at: "asc" }, select: { provider_person_id: true, answers: true, submitted_at: true, questionSet: { select: { questions: true } } } });
  const out = new Map<string, BuyerQA>();
  for (const r of rows) {
    const qs = normalizeQuestions(r.questionSet.questions), as = normalizeAnswers(r.answers, qs.length);
    out.set(r.provider_person_id, r.submitted_at ? { status: "in", questions: qs, answers: as, score: scoreAnswers(qs, as) } : { status: "sent", questions: qs, answers: qs.map(() => ({ value: null })), score: null });
  }
  return out;
}
