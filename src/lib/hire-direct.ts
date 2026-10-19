import { prisma } from "@/lib/prisma";
import type { Viewer } from "@/lib/access";
import { notify } from "@/lib/notifications";

// HS: the Hire (sole-source) journey — job posted (step 4), Hire on a match (8–9b), Terms (10–11), Work Order (12–13).

/** HS-E001: the buyer hears once that their job is saved and matched. */
export async function jobPosted(viewer: Viewer, jobId: string, title: string) {
  const me = await prisma.person.findUnique({ where: { user_id: viewer.userId }, select: { id: true } });
  if (!me) return;
  await notify({ event: "work.job_posted", personId: me.id, entityType: "job", entityId: jobId, dedupeKey: `work.job_posted:${jobId}`, vars: { title: title.trim(), jobId } });
}

// ── HS-E004: Hire = route B (direct assignment) at the provider's listed rate, which the buyer may edit ───────────
export type HireDefaults = {
  jobId: string; jobTitle: string; description: string; location: string;
  providerPersonId: string; providerName: string; providerCompany: string | null;
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
  const provider = await prisma.person.findUnique({ where: { id: providerPersonId }, select: { first_name: true, last_name: true, company: { select: { name: true } }, providerProfile: { select: { id: true } } } });
  if (!provider?.providerProfile) return null;
  const services = await prisma.providerService.findMany({ where: { provider_profile_id: provider.providerProfile.id, active: true, published_at: { not: null }, rate_cents: { not: null } }, orderBy: { rate_cents: "asc" }, select: { rate_cents: true, uom: true, billing_cycle: true, payment_event: true } });
  const listed = services.find((s) => s.uom === "HOUR") ?? services[0] ?? null;
  const req = await prisma.workRequest.findFirst({ where: { job_id: jobId }, orderBy: { created_at: "desc" }, select: { erp_connection_id: true, description: true, lines: { where: { line_number: 1 }, select: { provider_person_id: true, unit_price_cents: true, uom: true, payment_event: true, billing_cycle: true, overtime_allowed: true, overtime_multiplier: true, expenses_allowed: true, expenses_cap_cents: true, service_start: true, service_end: true } } } });
  const prior = req?.lines[0]?.provider_person_id === providerPersonId ? req.lines[0] : null;
  const start = prior?.service_start ?? job.start_date ?? new Date(Date.now() + 7 * 86_400_000);
  const end = prior?.service_end ?? job.end_date ?? new Date(start.getTime() + (MONTHS[job.duration ?? ""] ?? 3) * 30 * 86_400_000);
  const company = provider.company?.name && !provider.company.name.includes(provider.last_name) ? provider.company.name : null;
  return {
    jobId, jobTitle: job.title, description: req?.description ?? job.title,
    location: [job.worksite ? job.worksite[0] + job.worksite.slice(1).toLowerCase() : null, [job.city, job.state, job.location_country].filter(Boolean).join(", ")].filter(Boolean).join(" · "),
    providerPersonId, providerName: `${provider.first_name} ${provider.last_name}`.trim(), providerCompany: company,
    unitPriceCents: prior?.unit_price_cents ?? listed?.rate_cents ?? job.budget_max_cents ?? null,
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
  const { assignProviderDirectly } = await import("@/lib/selection");
  const start = new Date(input.start), end = new Date(input.end);
  if (!(start.getTime() > 0) || !(end.getTime() > start.getTime())) throw new HireTermsError("Pick a start date and an end date after it.");
  await prisma.job.update({ where: { id: input.jobId }, data: { start_date: start, end_date: end } });
  return assignProviderDirectly(viewer, { workRequestId: input.jobId, providerPersonId: input.providerPersonId, unitPriceCents: input.unitPriceCents, uom: input.uom });
}

export class HireTermsError extends Error {}
