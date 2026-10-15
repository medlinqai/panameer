import { prisma } from "@/lib/prisma";

// JW-E003/E004: the Work Request is the requisition header (Oracle POR_REQUISITION_HEADERS_ALL). A Job's hires, the Shop
// cart, an accepted estimate or offer each live on one. Submit (complete) → APPROVED (auto, R1) → one Work Order per seller → ORDERED.
export const wrNumber = (id: string) => `WR-${id.replace(/-/g, "").slice(0, 8).toUpperCase()}`;

/** The Job's current requisition (source JOB_HIRE; latest not cancelled/withdrawn/rejected) — created when first needed. */
export async function requisitionForJob(jobId: string): Promise<{ id: string; status: string }> {
  const open = await prisma.workRequest.findFirst({
    where: { job_id: jobId, status: { notIn: ["CANCELLED", "WITHDRAWN", "REJECTED"] } },
    orderBy: { created_at: "desc" },
    select: { id: true, status: true },
  });
  if (open) return open;
  const job = await prisma.job.findUniqueOrThrow({ where: { id: jobId }, select: { buyer_person_id: true, p_account_id: true, title: true, description: true, currency: true, proposal_access: true, start_date: true, end_date: true } });
  const id = crypto.randomUUID();
  return prisma.workRequest.create({
    data: {
      id, wr_number: wrNumber(id), job_id: jobId, source: "JOB_HIRE", status: "INCOMPLETE",
      buyer_person_id: job.buyer_person_id, p_account_id: job.p_account_id, currency: job.currency, proposal_access: job.proposal_access,
      // JW-E007: pre-filled from the Job title (editable before Submit).
      description: job.title || job.description?.split("\n")[0] || null, start_date: job.start_date, end_date: job.end_date,
    },
    select: { id: true, status: true },
  });
}

/** Every requisition of a Job (newest first) — for the job page. */
export async function requisitionsOfJob(jobId: string) {
  return prisma.workRequest.findMany({ where: { job_id: jobId }, orderBy: { created_at: "desc" }, select: { id: true, wr_number: true, status: true, description: true } });
}

/** JW-E007: is a description required before Submit (the buyer company's setting, default on)? */
export async function descriptionRequired(pAccountId: string): Promise<boolean> {
  const c = await prisma.company.findFirst({ where: { p_account_id: pAccountId }, select: { require_wr_description: true } });
  return c?.require_wr_description ?? true;
}
