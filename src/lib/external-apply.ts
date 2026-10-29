import { prisma } from "@/lib/prisma";

// XA-E002: Apply on Panameer for External Jobs — availability, rate and a note; the consultant follows every stage here.
export const EXT_STAGES = ["APPLIED", "SENT_TO_EMPLOYER", "EMPLOYER_VIEWING", "INTERVIEW", "CHOSEN", "NOT_SELECTED", "CLOSED"] as const;
export type ExtStage = (typeof EXT_STAGES)[number];
export const EXT_STAGE_LABEL: Record<ExtStage, string> = { APPLIED: "Applied", SENT_TO_EMPLOYER: "Sent to Employer", EMPLOYER_VIEWING: "Employer Viewing", INTERVIEW: "Interview", CHOSEN: "Chosen", NOT_SELECTED: "Not Selected", CLOSED: "Closed" };
/** The pie's stages (Not Selected and Closed show in the list only). */
export const EXT_PIE = ["APPLIED", "SENT_TO_EMPLOYER", "EMPLOYER_VIEWING", "INTERVIEW", "CHOSEN"] as const;
export const NOTE_MAX = 500;
export const NOT_JOINED_LINE = "This employer hasn't joined Panameer yet. We'll present your application to them, and you'll see every update here.";

export async function applyExternal(personId: string, jobId: string, input: { start?: string | null; rateCents?: number | null; note?: string | null }) {
  const job = await prisma.externalJob.findFirst({ where: { id: jobId, status: "LISTED", expires_at: { gt: new Date() } }, select: { id: true } });
  if (!job) throw new Error("That job is no longer listed.");
  const start = input.start ? new Date(input.start) : null;
  if (!start || Number.isNaN(start.getTime())) throw new Error("Pick the date you can start.");
  const rate = Math.round(Number(input.rateCents));
  if (!Number.isFinite(rate) || rate <= 0) throw new Error("Enter your rate ($/hr).");
  const note = (input.note ?? "").trim();
  if (note.length > NOTE_MAX) throw new Error(`Keep the note to ${NOTE_MAX} characters.`);
  const data = { start_date: start, rate_cents: rate, note: note || null };
  return prisma.externalJobInterest.upsert({
    where: { external_job_id_person_id: { external_job_id: jobId, person_id: personId } },
    create: { external_job_id: jobId, person_id: personId, stage: "APPLIED", stage_at: new Date(), ...data },
    update: data,
  });
}

export async function withdrawExternal(personId: string, jobId: string) {
  await prisma.externalJobInterest.deleteMany({ where: { external_job_id: jobId, person_id: personId, stage: { in: ["APPLIED"] } } });
}

/** Move applicants on a job to a stage (never backwards) and tell each one — bell + email. */
export async function moveApplicants(jobId: string, stage: ExtStage, opts: { personIds?: string[]; title?: string; company?: string; href?: string } = {}) {
  const at = EXT_STAGES.indexOf(stage);
  const rows = await prisma.externalJobInterest.findMany({ where: { external_job_id: jobId, ...(opts.personIds ? { person_id: { in: opts.personIds } } : {}) }, select: { id: true, person_id: true, stage: true } });
  const moving = rows.filter((r) => { const i = EXT_STAGES.indexOf(r.stage as ExtStage); return i < at && !["NOT_SELECTED", "CLOSED", "CHOSEN"].includes(r.stage); });
  if (!moving.length) return 0;
  await prisma.externalJobInterest.updateMany({ where: { id: { in: moving.map((r) => r.id) } }, data: { stage, stage_at: new Date() } });
  const job = opts.title ? null : await prisma.externalJob.findUnique({ where: { id: jobId }, select: { title: true, company: { select: { name: true } } } });
  const { notify } = await import("@/lib/notifications");
  for (const r of moving) {
    await notify({ event: "work.external_stage", personId: r.person_id, entityType: "external_job", entityId: jobId, dedupeKey: `work.external_stage:${jobId}:${r.person_id}:${stage}`, vars: { stage: EXT_STAGE_LABEL[stage], title: opts.title ?? job?.title ?? "", company: opts.company ?? job?.company.name ?? "", href: opts.href ?? `/work/external/${jobId}` } }).catch(() => null);
  }
  return moving.length;
}
