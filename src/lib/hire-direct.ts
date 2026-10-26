import { prisma } from "@/lib/prisma";
import type { Viewer } from "@/lib/access";
import { notify } from "@/lib/notifications";
import { buyerCanSeeIdentity, ensureProviderNumber, providerLabel } from "@/lib/provider-number";

// HS: the Hire (sole-source) journey — job posted (step 4), Hire on a match (8–9b), Terms (10–11), Work Order (12–13).

/** HS-E001: the buyer hears once that their job is saved and matched. */
export async function jobPosted(viewer: Viewer, jobId: string, title: string) {
  const me = await prisma.person.findUnique({ where: { user_id: viewer.userId }, select: { id: true } });
  if (!me) return;
  // JR-E002: every job is published — it goes on the Job Board as soon as it is created (unless the company admin hasn't approved the buyer yet).
  const { pendingJoin } = await import("@/lib/pending-join");
  if (!(await pendingJoin(me.id))) await prisma.job.updateMany({ where: { id: jobId, buyer_person_id: me.id, status: "DRAFT" }, data: { status: "OPEN", posted_at: new Date() } });
  await notify({ event: "work.job_posted", personId: me.id, entityType: "job", entityId: jobId, dedupeKey: `work.job_posted:${jobId}`, vars: { title: title.trim(), jobId } });
}

// ── HS-E004: Hire = route B (direct assignment) at the provider's listed rate, which the buyer may edit ───────────
export type HireDefaults = {
  jobId: string; jobTitle: string; description: string; location: string;
  providerPersonId: string; providerName: string; providerCompany: string | null;
  /** AN-E004: blurred until the Work Order exists. */
  providerPhotoUrl: string | null; identityShown: boolean;
  unitPriceCents: number | null; uom: string; billingCycle: "WEEKLY" | "BIWEEKLY" | "MONTHLY" | "EVERY_90_DAYS";
  start: string; end: string; duration: string | null;
  paymentEvent: string; overtimeAllowed: boolean; overtimeMultiplier: number; expensesAllowed: boolean; expensesCapCents: number | null;
  erpOrigin: boolean;
};

const MONTHS: Record<string, number> = { LT_1_MONTH: 1, ONE_TO_3_MONTHS: 3, THREE_TO_6_MONTHS: 6, GT_6_MONTHS: 12 };
const day = (d: Date) => d.toISOString().slice(0, 10);

/** What the Terms page starts from: the Job (work, dates, location) and the provider's listing (rate, unit, terms). */
export async function hireDefaults(viewer: Viewer, jobId: string, providerPersonId: string): Promise<HireDefaults | null> {
  const me = await prisma.person.findUnique({ where: { user_id: viewer.userId }, select: { id: true } });
  const job = await prisma.job.findUnique({ where: { id: jobId }, select: { id: true, buyer_person_id: true, title: true, description: true, worksite: true, city: true, state: true, location_country: true, start_date: true, end_date: true, duration: true, budget_max_cents: true } });
  if (!me || !job || job.buyer_person_id !== me.id) return null;
  const provider = await prisma.person.findUnique({ where: { id: providerPersonId }, select: { first_name: true, last_name: true, photo_url: true, company: { select: { name: true } }, providerProfile: { select: { id: true } } } });
  if (!provider?.providerProfile) return null;
  const services = await prisma.providerService.findMany({ where: { provider_profile_id: provider.providerProfile.id, active: true, published_at: { not: null }, rate_cents: { not: null } }, orderBy: { rate_cents: "asc" }, select: { rate_cents: true, uom: true, billing_cycle: true, payment_event: true } });
  const listed = services.find((s) => s.uom === "HOUR") ?? services[0] ?? null;
  const req = await prisma.workRequest.findFirst({ where: { job_id: jobId }, orderBy: { created_at: "desc" }, select: { erp_connection_id: true, description: true, lines: { where: { line_number: 1 }, select: { provider_person_id: true, unit_price_cents: true, uom: true, payment_event: true, billing_cycle: true, overtime_allowed: true, overtime_multiplier: true, expenses_allowed: true, expenses_cap_cents: true, service_start: true, service_end: true } } } });
  const prior = req?.lines[0]?.provider_person_id === providerPersonId ? req.lines[0] : null;
  // CA-E005: Hire uses the job's dates (editable) and the provider's response rate, else their rate card, else the top of the range.
  const { proposedRateFor, rateCardFor } = await import("@/lib/sourcing-events");
  const [proposed, card] = await Promise.all([proposedRateFor(jobId, providerPersonId), rateCardFor(providerPersonId, jobId)]);
  const start = prior?.service_start ?? job.start_date ?? proposed?.available_from ?? new Date(Date.now() + 7 * 86_400_000);
  const end = prior?.service_end ?? job.end_date ?? new Date(start.getTime() + (MONTHS[job.duration ?? ""] ?? 3) * 30 * 86_400_000);
  const company = provider.company?.name && !provider.company.name.includes(provider.last_name) ? provider.company.name : null;
  // AN-E004: the Work Request still shows the Provider number — the name arrives with the Work Order.
  const shown = await buyerCanSeeIdentity(viewer, providerPersonId);
  const label = shown ? null : providerLabel(await ensureProviderNumber(provider.providerProfile.id));
  return {
    jobId, jobTitle: job.title, description: req?.description ?? job.title,
    location: [job.worksite ? job.worksite[0] + job.worksite.slice(1).toLowerCase() : null, [job.city, job.state, job.location_country].filter(Boolean).join(", ")].filter(Boolean).join(" · "),
    providerPersonId, providerName: label ?? `${provider.first_name} ${provider.last_name}`.trim(), providerCompany: shown ? company : null,
    providerPhotoUrl: shown ? provider.photo_url : null, identityShown: shown,
    unitPriceCents: proposed?.unit_price_cents ?? prior?.unit_price_cents ?? card ?? listed?.rate_cents ?? job.budget_max_cents ?? null,
    uom: prior?.uom ?? listed?.uom ?? "HOUR",
    billingCycle: prior?.billing_cycle ?? listed?.billing_cycle ?? "MONTHLY",
    start: day(start), end: day(end), duration: job.duration,
    paymentEvent: prior?.payment_event ?? listed?.payment_event ?? "TIMESHEET",
    overtimeAllowed: prior?.overtime_allowed ?? false, overtimeMultiplier: prior?.overtime_multiplier ? Number(prior.overtime_multiplier) : 1.5,
    expensesAllowed: prior?.expenses_allowed ?? false, expensesCapCents: prior?.expenses_cap_cents ?? null,
    erpOrigin: !!req?.erp_connection_id,
  };
}

/** Route B with the buyer's rate: the Job gets its dates, then the requisition line is assigned to this provider. */
export async function hireAssign(viewer: Viewer, input: { jobId: string; providerPersonId: string; unitPriceCents: number; uom: string; start: string; end: string }) {
  // JS-E005: after an Amendment, Hire waits until this provider re-confirms.
  const pending = await prisma.proposal.findFirst({ where: { job_id: input.jobId, provider_person_id: input.providerPersonId, reconfirm_needed_at: { not: null }, reconfirmed_at: null }, select: { id: true } });
  if (pending) throw new HireTermsError("This provider hasn't re-confirmed since the last Amendment.");
  const { assignProviderDirectly } = await import("@/lib/selection");
  const start = new Date(input.start), end = new Date(input.end);
  if (!(start.getTime() > 0) || !(end.getTime() > start.getTime())) throw new HireTermsError("Pick a start date and an end date after it.");
  await prisma.job.update({ where: { id: input.jobId }, data: { start_date: start, end_date: end } });
  return assignProviderDirectly(viewer, { workRequestId: input.jobId, providerPersonId: input.providerPersonId, unitPriceCents: input.unitPriceCents, uom: input.uom });
}

export class HireTermsError extends Error {}

// ── HS-E005: the Terms the buyer confirms, written on the Work Request line, then Create Work Order ─────────────────
export type HireTerms = {
  jobId: string; providerPersonId: string; description: string;
  unitPriceCents: number; uom: string; billingCycle: "WEEKLY" | "BIWEEKLY" | "MONTHLY" | "EVERY_90_DAYS";
  start: string; end: string;
  paymentEvent: "TIMESHEET" | "PAYMENT_REQUEST" | "INVOICE" | "ACCEPTANCE" | "ORDER_ACCEPTED";
  overtimeAllowed: boolean; overtimeMultiplier: number | null; expensesAllowed: boolean; expensesCapCents: number | null;
};

export async function confirmTerms(viewer: Viewer, t: HireTerms): Promise<{ orderId: string | null; orderNumber: string | null; wrNumber?: string | null; approvalNote?: string | null; erp: boolean }> {
  if (!Number.isInteger(t.unitPriceCents) || t.unitPriceCents <= 0) throw new HireTermsError("Enter the rate.");
  if (t.overtimeAllowed && !(t.overtimeMultiplier && t.overtimeMultiplier >= 1 && t.overtimeMultiplier <= 3)) throw new HireTermsError("Overtime rate: between 1× and 3×.");
  if (t.expensesAllowed && t.expensesCapCents != null && t.expensesCapCents < 0) throw new HireTermsError("The expenses cap can't be negative.");
  const sel = await hireAssign(viewer, { jobId: t.jobId, providerPersonId: t.providerPersonId, unitPriceCents: t.unitPriceCents, uom: t.uom, start: t.start, end: t.end });
  await prisma.workRequestLine.update({
    where: { id: sel.workRequestLineId },
    data: {
      description: t.description.trim().slice(0, 500) || undefined,
      payment_event: t.paymentEvent, billing_cycle: t.billingCycle,
      overtime_allowed: t.overtimeAllowed, overtime_multiplier: t.overtimeAllowed ? t.overtimeMultiplier : null,
      expenses_allowed: t.expensesAllowed, expenses_cap_cents: t.expensesAllowed ? t.expensesCapCents : null,
    },
  });
  const req = await prisma.workRequest.findFirst({ where: { job_id: t.jobId }, orderBy: { created_at: "desc" }, select: { id: true, erp_connection_id: true } });
  // ERP-origin requests go back through the punchout cart (the ERP raises the PO), not straight to a Work Order.
  if (req?.erp_connection_id) return { orderId: null, orderNumber: null, erp: true };
  const { hire } = await import("@/lib/work-orders");
  const order = await hire(viewer, { jobId: t.jobId, description: t.description.trim().slice(0, 500) || undefined });
  await (await import("@/lib/sourcing-events")).markAwarded(t.jobId, t.providerPersonId, order.id);
  const wr = await prisma.workOrder.findUnique({ where: { id: order.id }, select: { workRequest: { select: { wr_number: true, approval_note: true } } } });
  return { orderId: order.id, orderNumber: order.orderNumber, wrNumber: wr?.workRequest?.wr_number ?? null, approvalNote: wr?.workRequest?.approval_note ?? null, erp: false };
}
