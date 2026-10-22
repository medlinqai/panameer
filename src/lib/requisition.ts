import { nextNumber, PREFIX } from "@/lib/numbering";
import { prisma } from "@/lib/prisma";

// JW-E003/E004: the Work Request is the requisition header (Oracle POR_REQUISITION_HEADERS_ALL). A Job's hires, the Shop
// cart, an accepted estimate or offer each live on one. Submit (complete) → APPROVED (auto, R1) → one Work Order per seller → ORDERED.

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
      id, wr_number: await nextNumber(PREFIX.WORK_REQUEST, { pAccountId: job.p_account_id }), job_id: jobId, source: "JOB_HIRE", status: "INCOMPLETE",
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

export const SOURCE_LABEL: Record<string, string> = { JOB_HIRE: "Job Hire", SHOP: "Shop", ESTIMATE: "Estimate", OFFER: "Offer", EXTERNALLY_SOURCED: "Externally Sourced", PUNCHOUT: "Punchout" };

/** JW-E008: My Work Requests — the buyer's own (owner-scoped from the session person). */
export async function myWorkRequests(personId: string, status?: string) {
  const rows = await prisma.workRequest.findMany({
    where: { buyer_person_id: personId, ...(status ? { status: status as never } : {}), OR: [{ lines: { some: {} } }, { workOrders: { some: {} } }] },
    orderBy: { created_at: "desc" },
    take: 200,
    select: {
      id: true, wr_number: true, description: true, title: true, source: true, status: true, currency: true, job_id: true, created_at: true,
      lines: { select: { provider_person_id: true, quantity: true, unit_price_cents: true, amount_cents: true, transaction_type: true } },
      workOrders: { select: { id: true, order_number: true } },
    },
  });
  const ids = [...new Set(rows.flatMap((r) => r.lines.map((l) => l.provider_person_id)).filter((x): x is string => !!x))];
  const people = new Map((await prisma.person.findMany({ where: { id: { in: ids } }, select: { id: true, first_name: true, last_name: true } })).map((p) => [p.id, `${p.first_name} ${p.last_name}`.trim()]));
  return rows.map((r) => ({
    id: r.id, wrNumber: r.wr_number, description: r.description || r.title || "", source: r.source, status: r.status, currency: r.currency, jobId: r.job_id, createdAt: r.created_at.toISOString().slice(0, 10),
    sellers: [...new Set(r.lines.map((l) => l.provider_person_id).filter((x): x is string => !!x))].map((id) => people.get(id) ?? "A provider"),
    totalCents: r.lines.reduce((n, l) => n + (l.transaction_type === "SERVICE_BY_AMT" ? l.amount_cents ?? 0 : Math.round(Number(l.quantity ?? 0) * (l.unit_price_cents ?? 0))), 0),
    orders: r.workOrders.map((o) => ({ id: o.id, number: o.order_number })),
  }));
}
