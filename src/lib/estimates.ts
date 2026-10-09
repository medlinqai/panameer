import { randomBytes } from "node:crypto";
import { Prisma, type BillingCycle, type CostEstimateLineKind, type PaymentTerms } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notifications";
import { sendEmail } from "@/lib/resend";
import { emailShell, escapeHtml, paragraph, primaryButton } from "@/lib/email/shell";
import { resolveCommissionBps } from "@/lib/application-commissions";
import { formatCents } from "@/lib/display";
import type { Viewer } from "@/lib/access";
import { snapshotMilestones } from "@/lib/order-milestones";

// CAT-E006: cost estimates — one provider, one customer, private to them. Accept → work order; Ask for Changes → revision n+1.
export class EstimateError extends Error {
  constructor(message: string, public code: "NOT_FOUND" | "FORBIDDEN" | "INVALID") {
    super(message);
  }
}

export type EstimateLineInput = { kind: CostEstimateLineKind; description: string; providerServiceId?: string | null; uom?: string | null; quantity?: number | null; rateCents?: number | null; amountCents?: number | null };
export type EstimateInput = {
  customerPersonId?: string | null;
  customerEmail?: string | null;
  workRequestId?: string | null;
  title: string;
  validUntil?: string | null;
  scope?: string | null;
  assumptions?: string | null;
  exclusions?: string | null;
  message?: string | null;
  paymentTerms?: PaymentTerms;
  billingCycle?: BillingCycle;
  lines: EstimateLineInput[];
};

const ALPHA = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const number = () => `EST-${[...randomBytes(5)].map((b) => ALPHA[b % ALPHA.length]).join("")}`;
const appUrl = () => (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3100").replace(/\/$/, "");
const clean = (s?: string | null, max = 4000) => s?.trim().slice(0, max) || null;

export function lineAmount(l: { kind: CostEstimateLineKind; quantity?: number | Prisma.Decimal | null; rate_cents?: number | null; rateCents?: number | null; amount_cents?: number | null; amountCents?: number | null }): number {
  if (l.kind === "SERVICE") return Math.round(Number(l.quantity ?? 0) * Number(l.rate_cents ?? l.rateCents ?? 0));
  return Number(l.amount_cents ?? l.amountCents ?? 0);
}

async function me(viewer: Viewer) {
  const p = await prisma.person.findUnique({ where: { user_id: viewer.userId }, select: { id: true, first_name: true, last_name: true, user: { select: { email: true } } } });
  if (!p) throw new EstimateError("No person for this account", "NOT_FOUND");
  return p;
}
const nameOf = (p: { first_name: string | null; last_name: string | null } | null) => [p?.first_name, p?.last_name].filter(Boolean).join(" ").trim() || "Someone";

function linesData(lines: EstimateLineInput[]) {
  const rows = lines
    .filter((l) => l.description?.trim())
    .slice(0, 50)
    .map((l, i) => {
      if (l.kind === "SERVICE" && (!(Number(l.quantity) > 0) || !(Number(l.rateCents) > 0))) throw new EstimateError(`Line ${i + 1}: a service line needs a quantity and a rate`, "INVALID");
      if (l.kind !== "SERVICE" && !(Number(l.amountCents) > 0)) throw new EstimateError(`Line ${i + 1}: enter an amount`, "INVALID");
      return {
        line_number: i + 1,
        kind: l.kind,
        description: l.description.trim().slice(0, 300),
        provider_service_id: l.providerServiceId || null,
        uom: l.kind === "SERVICE" ? (l.uom || "HOUR").toUpperCase() : null,
        quantity: l.kind === "SERVICE" ? new Prisma.Decimal(Number(l.quantity)) : null,
        rate_cents: l.kind === "SERVICE" ? Math.round(Number(l.rateCents)) : null,
        amount_cents: l.kind === "SERVICE" ? null : Math.round(Number(l.amountCents)),
      };
    });
  return { rows, total: rows.reduce((n, r) => n + lineAmount(r), 0) };
}

/** Create or edit the draft. An estimate that came back with changes requested starts revision n+1. */
export async function saveEstimate(viewer: Viewer, id: string | null, input: EstimateInput): Promise<string> {
  const p = await me(viewer);
  const title = clean(input.title, 200);
  if (!title) throw new EstimateError("Give the estimate a title", "INVALID");
  const email = clean(input.customerEmail, 200)?.toLowerCase() ?? null;
  if (!input.customerPersonId && !email) throw new EstimateError("Pick a customer or enter their email", "INVALID");
  if (input.customerPersonId === p.id) throw new EstimateError("You can't send an estimate to yourself", "INVALID");
  const { rows, total } = linesData(input.lines ?? []);
  const validUntil = input.validUntil ? new Date(input.validUntil) : new Date(Date.now() + 30 * 86_400_000);
  const rev = {
    scope: clean(input.scope), assumptions: clean(input.assumptions), exclusions: clean(input.exclusions), message: clean(input.message, 2000),
    payment_terms: input.paymentTerms ?? "NET30", billing_cycle: input.billingCycle ?? "MONTHLY", total_cents: total,
  };
  const head = { customer_person_id: input.customerPersonId || null, customer_email: input.customerPersonId ? null : email, work_request_id: input.workRequestId || null, title, valid_until: validUntil };

  if (!id) {
    const e = await prisma.costEstimate.create({ data: { estimate_number: number(), provider_person_id: p.id, ...head, revisions: { create: { revision_number: 1, ...rev, lines: { create: rows } } } }, select: { id: true } });
    return e.id;
  }
  const e = await prisma.costEstimate.findFirst({ where: { id, provider_person_id: p.id } });
  if (!e) throw new EstimateError("Estimate not found", "NOT_FOUND");
  if (!["DRAFT", "CHANGES_REQUESTED"].includes(e.status)) throw new EstimateError("This estimate can't be edited now", "INVALID");
  const current = await prisma.costEstimateRevision.findUnique({ where: { estimate_id_revision_number: { estimate_id: e.id, revision_number: e.current_revision } } });
  await prisma.$transaction(async (tx) => {
    await tx.costEstimate.update({ where: { id: e.id }, data: head });
    if (current && !current.sent_at) {
      await tx.costEstimateLine.deleteMany({ where: { revision_id: current.id } });
      await tx.costEstimateRevision.update({ where: { id: current.id }, data: { ...rev, lines: { create: rows } } });
    } else {
      const n = e.current_revision + 1;
      await tx.costEstimateRevision.create({ data: { estimate_id: e.id, revision_number: n, ...rev, lines: { create: rows } } });
      await tx.costEstimate.update({ where: { id: e.id }, data: { current_revision: n } });
    }
  });
  return e.id;
}

/** Send (or resubmit) the current revision. Members get bell + worklist + email; a non-member gets an email to sign up. */
export async function sendEstimate(viewer: Viewer, id: string) {
  const p = await me(viewer);
  const e = await prisma.costEstimate.findFirst({ where: { id, provider_person_id: p.id } });
  if (!e) throw new EstimateError("Estimate not found", "NOT_FOUND");
  if (!["DRAFT", "CHANGES_REQUESTED"].includes(e.status)) throw new EstimateError("This estimate has already been sent", "INVALID");
  const rev = await prisma.costEstimateRevision.findUnique({ where: { estimate_id_revision_number: { estimate_id: e.id, revision_number: e.current_revision } }, include: { lines: true } });
  if (!rev || rev.sent_at) throw new EstimateError("Revise the estimate before sending it again", "INVALID");
  if (!rev.lines.length) throw new EstimateError("Add at least one line", "INVALID");
  let customerId = e.customer_person_id;
  if (!customerId && e.customer_email) customerId = (await prisma.person.findFirst({ where: { user: { email: { equals: e.customer_email, mode: "insensitive" } } }, select: { id: true } }))?.id ?? null;
  const now = new Date();
  await prisma.$transaction([
    prisma.costEstimateRevision.update({ where: { id: rev.id }, data: { sent_at: now } }),
    prisma.costEstimate.update({ where: { id: e.id }, data: { status: "SENT", sent_at: now, customer_person_id: customerId } }),
  ]);
  // The provider's "changes requested" item is answered by resubmitting.
  await prisma.notification.updateMany({ where: { person_id: p.id, dedupe_key: { startsWith: `estimate.changes_requested:${e.id}:` }, resolved_at: null }, data: { resolved_at: now } });
  const vars = { estimateId: e.id, estimateNumber: e.estimate_number, title: e.title, providerName: nameOf(p), total: formatCents(rev.total_cents, e.currency), revision: rev.revision_number };
  if (customerId) {
    await notify({ event: "estimate.received", personId: customerId, entityType: "cost_estimate", entityId: e.id, dedupeKey: `estimate.received:${e.id}:${rev.revision_number}`, vars });
  } else if (e.customer_email) {
    const url = `${appUrl()}/estimates/${e.id}`;
    const body = [
      paragraph(`${escapeHtml(nameOf(p))} sent you a cost estimate on Panameer: <b>${escapeHtml(e.title)}</b> — ${escapeHtml(vars.total)}.`),
      paragraph("Join Panameer with your name and company to open it, then accept it, ask for changes or decline. It's free."),
      primaryButton(url, "Open the Estimate"),
    ].join("");
    await sendEmail({ to: e.customer_email, subject: `${nameOf(p)} sent you an estimate: ${e.title}`, html: emailShell({ bodyHtml: body }), text: `${nameOf(p)} sent you a cost estimate: ${e.title} (${vars.total}). Open it: ${url}`, template: "cost-estimate", subjectType: "CostEstimate", subjectId: e.id }).catch(() => {});
  }
}

/** Who may open it: the provider, the customer, or a member signed in with the emailed address (who then becomes the customer). */
export async function estimateFor(viewer: Viewer, id: string) {
  const p = await me(viewer);
  let e = await prisma.costEstimate.findUnique({ where: { id }, include: { revisions: { orderBy: { revision_number: "desc" }, include: { lines: { orderBy: { line_number: "asc" } } } } } });
  if (!e) throw new EstimateError("Estimate not found", "NOT_FOUND");
  const email = p.user?.email?.toLowerCase();
  if (e.provider_person_id !== p.id && e.customer_person_id !== p.id) {
    if (!e.customer_person_id && e.customer_email && email && e.customer_email === email && e.status !== "DRAFT") {
      await prisma.costEstimate.update({ where: { id }, data: { customer_person_id: p.id } });
      e = { ...e, customer_person_id: p.id };
    } else throw new EstimateError("Estimate not found", "NOT_FOUND");
  }
  if ((e.status === "SENT" || e.status === "CHANGES_REQUESTED") && e.valid_until < new Date()) {
    await prisma.costEstimate.update({ where: { id }, data: { status: "EXPIRED" } });
    e = { ...e, status: "EXPIRED" };
  }
  if (e.status === "DRAFT" && e.provider_person_id !== p.id) throw new EstimateError("Estimate not found", "NOT_FOUND");
  const people = await prisma.person.findMany({ where: { id: { in: [e.provider_person_id, e.customer_person_id].filter((x): x is string => !!x) } }, select: { id: true, first_name: true, last_name: true, user_id: true, company: { select: { name: true } } } });
  const prov = people.find((x) => x.id === e!.provider_person_id) ?? null;
  const cust = people.find((x) => x.id === e!.customer_person_id) ?? null;
  return { e, party: e.provider_person_id === p.id ? ("PROVIDER" as const) : ("CUSTOMER" as const), providerName: nameOf(prov), customerName: cust ? `${nameOf(cust)}${cust.company?.name ? ` · ${cust.company.name}` : ""}` : e.customer_email ?? "Customer", providerUserId: prov?.user_id ?? null };
}

/** The customer's answer: Accept (→ work order), Ask for Changes (comment required), Decline. */
export async function decideEstimate(viewer: Viewer, id: string, decision: "ACCEPT" | "CHANGES" | "DECLINE", comment?: string | null) {
  const { e, party } = await estimateFor(viewer, id);
  if (party !== "CUSTOMER") throw new EstimateError("Only the customer can answer this estimate", "FORBIDDEN");
  if (e.status !== "SENT") throw new EstimateError(e.status === "EXPIRED" ? "This estimate has expired. Ask the provider to send a new one." : "This estimate isn't waiting on you", "INVALID");
  const note = clean(comment, 2000);
  if (decision === "CHANGES" && (!note || note.length < 3)) throw new EstimateError("Say what you'd like changed", "INVALID");
  const rev = e.revisions[0];
  const now = new Date();
  const status = decision === "ACCEPT" ? "ACCEPTED" : decision === "CHANGES" ? "CHANGES_REQUESTED" : "DECLINED";
  const moved = await prisma.costEstimate.updateMany({ where: { id: e.id, status: "SENT" }, data: { status, decided_at: now } });
  if (!moved.count) throw new EstimateError("This estimate changed while you were looking at it", "INVALID");
  await prisma.costEstimateRevision.update({ where: { id: rev.id }, data: { decision: status, customer_comment: note, decided_at: now } });
  await prisma.notification.updateMany({ where: { dedupe_key: { startsWith: `estimate.received:${e.id}:` }, resolved_at: null }, data: { resolved_at: now } });
  let orderId: string | null = null;
  if (decision === "ACCEPT") orderId = await orderFromEstimate(e.id);
  const cust = await prisma.person.findUnique({ where: { id: e.customer_person_id! }, select: { first_name: true, last_name: true } });
  const event = decision === "ACCEPT" ? "estimate.accepted" : decision === "CHANGES" ? "estimate.changes_requested" : "estimate.declined";
  await notify({ event, personId: e.provider_person_id, entityType: "cost_estimate", entityId: e.id, dedupeKey: `${event}:${e.id}:${rev.revision_number}`, vars: { estimateId: e.id, estimateNumber: e.estimate_number, title: e.title, customerName: nameOf(cust), comment: note, orderId } });
  return { status, orderId };
}

/** Accept → a work order from the accepted revision, customer acceptance set; the provider accepts the terms as today. */
async function orderFromEstimate(estimateId: string): Promise<string> {
  const e = await prisma.costEstimate.findUniqueOrThrow({ where: { id: estimateId }, include: { revisions: { orderBy: { revision_number: "desc" }, take: 1, include: { lines: { orderBy: { line_number: "asc" } } } } } });
  const rev = e.revisions[0];
  const buyer = await prisma.person.findUniqueOrThrow({ where: { id: e.customer_person_id! }, select: { id: true, company: { select: { p_account_id: true } } } });
  if (!buyer.company?.p_account_id) throw new EstimateError("Add your company before accepting", "INVALID");
  const fees = new Map<string, number>();
  for (const l of rev.lines) fees.set(l.id, (await resolveCommissionBps("SOLE_SOURCED", l.kind === "SERVICE" ? "SERVICE_BY_QTY" : "SERVICE_BY_AMT")).bps);
  const distinct = [...new Set(fees.values())];
  const now = new Date();
  const order = await prisma.$transaction(async (tx) => {
    const o = await tx.workOrder.create({
      data: {
        order_number: `WO-${Date.now().toString(36).toUpperCase()}-${e.id.slice(0, 4)}`,
        origin: "INDIRECT", work_request_id: e.work_request_id, buyer_person_id: buyer.id, p_account_id: buyer.company!.p_account_id, provider_person_id: e.provider_person_id,
        currency: e.currency, status: "ISSUED", buyer_accepted_at: now, fee_bps: distinct.length === 1 ? distinct[0] : null, not_to_exceed_cents: rev.total_cents,
        external_ref: e.estimate_number, sow_text: [rev.scope, rev.assumptions && `Assumptions: ${rev.assumptions}`, rev.exclusions && `Not included: ${rev.exclusions}`].filter(Boolean).join("\n\n") || null,
        lines: {
          create: rev.lines.map((l) => ({
            line_number: l.line_number, transaction_type: l.kind === "SERVICE" ? "SERVICE_BY_QTY" : "SERVICE_BY_AMT", fee_bps: fees.get(l.id)!, description: l.description,
            uom: l.uom, quantity: l.quantity, unit_price_cents: l.rate_cents, amount_cents: l.amount_cents, provider_service_id: l.provider_service_id,
            billing_cycle: l.kind === "SERVICE" ? rev.billing_cycle : null, payment_terms: rev.payment_terms,
            payment_trigger: l.kind === "SERVICE" ? "TIMESHEET" : l.kind === "FIXED" ? "ACCEPTANCE" : "PAYMENT_REQUEST",
          })),
        },
      },
      select: { id: true },
    });
    await tx.costEstimate.update({ where: { id: e.id }, data: { work_order_id: o.id } });
    return o;
  });
  await snapshotMilestones(order.id);
  await notify({ event: "work.order_offered", personId: e.provider_person_id, entityType: "work_order", entityId: order.id, dedupeKey: `work.order_offered:${order.id}`, vars: { orderId: order.id, requestTitle: `From estimate ${e.estimate_number}` } });
  return order.id;
}

export type EstimateRow = { id: string; number: string; title: string; status: string; totalCents: number; currency: string; counterpart: string; validUntil: string; revision: number };

/** My Cost Estimates (owner-only) — the estimates you've written. */
export async function myEstimates(viewer: Viewer): Promise<EstimateRow[]> {
  const p = await me(viewer);
  const rows = await prisma.costEstimate.findMany({ where: { provider_person_id: p.id }, orderBy: { updated_at: "desc" }, take: 100, include: { revisions: { orderBy: { revision_number: "desc" }, take: 1, select: { total_cents: true } } } });
  const custs = new Map((await prisma.person.findMany({ where: { id: { in: rows.map((r) => r.customer_person_id).filter((x): x is string => !!x) } }, select: { id: true, first_name: true, last_name: true } })).map((c) => [c.id, nameOf(c)]));
  return rows.map((r) => ({ id: r.id, number: r.estimate_number, title: r.title, status: r.status, totalCents: r.revisions[0]?.total_cents ?? 0, currency: r.currency, counterpart: (r.customer_person_id && custs.get(r.customer_person_id)) || r.customer_email || "—", validUntil: r.valid_until.toISOString().slice(0, 10), revision: r.current_revision }));
}
