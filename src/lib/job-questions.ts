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
  // QB-E002: mostly quick types (Yes/No, Pick One, Number) with sensible options; at most one text question.
  const ask = () => callExtractionModel({
    timeoutMs: 60_000,
    system: "You help a buyer screen contractors in writing before an interview. Write 3 to 5 short, specific questions that test real experience with this job's work, tools and dates. Make them QUICK to answer: mostly YES_NO, PICK_ONE (3–5 sensible options, e.g. \"Full Oracle Fusion P2P implementations led\": 0 · 1–2 · 3–5 · 6+) or NUMBER; at most one SHORT_TEXT. Never ask for names, company names, email, phone or social profiles.",
    schema: { type: "object", properties: { questions: { type: "array", minItems: 3, maxItems: 5, items: { type: "object", properties: { text: { type: "string" }, type: { type: "string", enum: ["YES_NO", "PICK_ONE", "PICK_SEVERAL", "NUMBER", "SCALE", "SHORT_TEXT"] }, options: { type: "array", items: { type: "string" }, description: "Choices for PICK_ONE / PICK_SEVERAL; empty otherwise." } }, required: ["text", "type"] } } }, required: ["questions"] },
    schemaName: "record_questions",
    text,
    instruction: "Write the screening questions for this job.",
    tag: "job",
    toolDescription: "Record 3 to 5 quick screening questions.",
    maxOutputTokens: 3_000,
  });
  // One retry on a transient failure; the reason goes to the server log so a failure can be traced.
  let call = await ask();
  if (!call.ok && (call.reason === "error" || call.reason === "truncated")) call = await ask();
  if (!call.ok) { console.error(`[draftQuestions] ${call.reason}: ${call.message}`); throw new SourcingError(call.reason === "no_key" ? "AI isn't set up on this server." : "We couldn't draft questions right now — write your own or try again.", "AI"); }
  const raw = ((call.value as { questions?: { text?: string; type?: string; options?: string[] }[] }).questions ?? []).map((q) => ({ text: q.text ?? "", type: q.type, options: (q.options ?? []).map((label) => ({ label })) }));
  let texts = 0;
  return normalizeQuestions(raw).filter((q) => !(q.type === "SHORT_TEXT" || q.type === "LONG_TEXT") || texts++ < 1).filter((q) => !(q.type === "PICK_ONE" || q.type === "PICK_SEVERAL") || (q.options?.length ?? 0) >= 2).slice(0, 5);
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

/** QB-E003: Fill From My Profile — the provider's profile, work history, projects, certifications and skills draft every answer.
 *  Nothing is saved: the provider reviews, edits and Sends (each answer marked prefilled). */
export async function prefillAnswers(viewer: Viewer, answerId: string): Promise<Answer[]> {
  const p = await me(viewer);
  const row = await prisma.questionAnswer.findUnique({ where: { id: answerId }, select: { provider_person_id: true, questionSet: { select: { questions: true } } } });
  if (!row || row.provider_person_id !== p.id) throw new SourcingError("Those questions aren't yours.", "NOT_FOUND");
  const qs = normalizeQuestions(row.questionSet.questions);
  const prof = await prisma.providerProfile.findUnique({ where: { person_id: p.id }, select: { id: true, overview: true, oracle_cloud_years: true, implementations_count: true, person: { select: { title: true } },
    employers: { select: { role_title: true, description: true, start_date: true, end_date: true, is_current: true, software_suite: true }, take: 12 },
    projects: { select: { name: true, description: true, start_date: true, end_date: true, is_current: true, software_suite: true }, take: 20 },
    credentials: { select: { name: true, kind: true }, take: 20 }, skills: { select: { skill: { select: { name: true } } }, take: 40 } } });
  if (!prof) throw new SourcingError("Add your profile first — there's nothing to fill from.", "INVALID");
  const { recruiterNumbers } = await import("@/lib/recruiter-numbers");
  const nums = (await recruiterNumbers([prof.id])).get(prof.id);
  const yr = (d: Date | null) => d?.getFullYear() ?? "?";
  const profile = [
    `Title: ${prof.person.title ?? ""}`, prof.overview ? `Overview: ${prof.overview}` : null,
    nums?.years ? `Oracle Cloud years: ${nums.years}` : null, nums?.implementations ? `Implementations: ${nums.implementations}` : null,
    ...prof.employers.map((e) => `Role: ${e.role_title ?? ""} (${yr(e.start_date)}–${e.is_current ? "now" : yr(e.end_date)}${e.software_suite ? `, ${e.software_suite}` : ""}) ${e.description ?? ""}`),
    ...prof.projects.map((x) => `Project: ${x.name} (${yr(x.start_date)}–${x.is_current ? "now" : yr(x.end_date)}${x.software_suite ? `, ${x.software_suite}` : ""}) ${x.description ?? ""}`),
    prof.credentials.length ? `Credentials: ${prof.credentials.map((c) => c.name).join("; ")}` : null,
    prof.skills.length ? `Skills: ${prof.skills.map((s) => s.skill.name).join(", ")}` : null,
  ].filter(Boolean).join("\n").slice(0, 14_000);
  const questions = qs.map((q, i) => `${i + 1}. [${q.type}${q.options?.length ? `: ${q.options.map((o) => o.label).join(" | ")}` : ""}] ${q.text}`).join("\n");
  const { callExtractionModel } = await import("@/lib/resume/ai-provider");
  const call = await callExtractionModel({
    timeoutMs: 60_000,
    system: "You draft a contractor's answers to a buyer's screening questions from their own profile. Answer each question in order. For YES_NO / PICK_ONE give exactly one of the listed options; PICK_SEVERAL a list of listed options; SCALE a number 1–5; NUMBER a number; text questions 1–3 honest sentences. Use only what the profile supports; when unsure pick the most conservative option. Never include names of people or companies, emails, phones or links.",
    schema: { type: "object", properties: { answers: { type: "array", items: { type: "object", properties: { text: { type: ["string", "null"] }, number: { type: ["number", "null"] }, choices: { type: "array", items: { type: "string" } } } } } }, required: ["answers"] },
    schemaName: "record_answers",
    text: `QUESTIONS\n${questions}\n\nPROFILE\n${profile}`,
    instruction: "Draft the answers.",
    tag: "answers",
    toolDescription: "Record one drafted answer per question, in order.",
    maxOutputTokens: 2_000,
  });
  if (!call.ok) throw new SourcingError("We couldn't fill from your profile right now — answer directly or try again.", "AI");
  const raw = ((call.value as { answers?: { text?: string | null; number?: number | null; choices?: string[] }[] }).answers ?? []);
  const { stripContacts } = await import("@/lib/work-request/job-import");
  return qs.map((q, i) => {
    const r = raw[i] ?? {};
    const value = q.type === "PICK_SEVERAL" ? r.choices ?? [] : q.type === "YES_NO" || q.type === "PICK_ONE" ? r.choices?.[0] ?? r.text ?? null : q.type === "SCALE" || q.type === "NUMBER" ? r.number ?? (r.text ? Number(r.text) : null) : r.text ?? "";
    return { ...cleanAnswer(q, { value }, stripContacts), prefilled: true, edited: false };
  });
}
