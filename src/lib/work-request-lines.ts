import { roleLong } from "@/lib/role-labels";
import { TransactionType, WorkRequestLineStatus } from "@prisma/client";
import type { WorkRequestStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { Viewer } from "@/lib/access";
import {
  assertTransactionLineShape,
  pricedByQuantity,
  transactionTypeForPricingType,
  workRequestIsComplete,
} from "@/lib/transaction-spine";
import { loadOwned, resolveBuyer, WorkRequestError } from "@/lib/work-request";

export type LineForCompleteness = {
  line_number: number;
  description: string;
  provider_person_id?: string | null;
  transaction_type: TransactionType;
  unit_price_cents?: number | null;
  amount_cents?: number | null;
};

/** What ONE line still needs. Empty `missing` means that line is ready. */
export type LineGap = {
  lineNumber: number;
  description: string;
  missing: ("provider" | "price")[];
};

export type Completeness = {
  complete: boolean;
  lineCount: number;
  gaps: LineGap[];
  /** Why it is not complete, for a UI that has room for one sentence. */
  reason: "COMPLETE" | "NO_LINES" | "LINES_INCOMPLETE";
};

export function completenessFor(lines: LineForCompleteness[]): Completeness {
  const gaps: LineGap[] = [];
  for (const l of [...lines].sort((a, b) => a.line_number - b.line_number)) {
    const missing: ("provider" | "price")[] = [];
    if (!l.provider_person_id) missing.push("provider");
    const priced = pricedByQuantity(l.transaction_type)
      ? l.unit_price_cents != null
      : l.amount_cents != null;
    if (!priced) missing.push("price");
    if (missing.length) gaps.push({ lineNumber: l.line_number, description: l.description, missing });
  }
  if (lines.length === 0)
    return { complete: false, lineCount: 0, gaps: [], reason: "NO_LINES" };
  return {
    complete: gaps.length === 0,
    lineCount: lines.length,
    gaps,
    reason: gaps.length === 0 ? "COMPLETE" : "LINES_INCOMPLETE",
  };
}

/** One sentence naming what is outstanding — the button's tooltip and the API's refusal. */
export function completenessMessage(c: Completeness): string {
  if (c.reason === "COMPLETE") return "Every line has a provider and a price.";
  if (c.reason === "NO_LINES") return "Add at least one line before completing this request.";
  return c.gaps
    .map((g) => `Line ${g.lineNumber} needs ${g.missing.join(" and ")}`)
    .join("; ");
}

/* ═══════════════════════════════════════════════════════════════════════════
   READ
   ═════════════════════════════════════════════════════════════════════════ */

const LINE_SELECT = {
  id: true,
  line_number: true,
  transaction_type: true,
  description: true,
  uom: true,
  quantity: true,
  unit_price_cents: true,
  amount_cents: true,
  currency: true,
  provider_person_id: true,
  service_start: true,
  service_end: true,
  note_to_supplier: true,
  status: true,
} as const;

export type SerializedLine = {
  id: string;
  lineNumber: number;
  transaction_type: TransactionType;
  description: string;
  uom: string | null;
  quantity: number | null;
  unitPriceCents: number | null;
  amountCents: number | null;
  currency: string;
  providerPersonId: string | null;
  providerName: string | null;
  serviceStart: string | null;
  serviceEnd: string | null;
  noteToSupplier: string | null;
  status: WorkRequestLineStatus;
  /** Invited-to-bid count for THIS line. A count, never the bids themselves. */
  invitedCount: number;
};

/** THE PROVIDER'S NAME IS RESOLVED IN ONE BATCH, NOT PER LINE. Four lines */
async function namesFor(personIds: string[]): Promise<Map<string, string>> {
  const ids = [...new Set(personIds)];
  if (ids.length === 0) return new Map();
  const people = await prisma.person.findMany({
    where: { id: { in: ids } },
    select: { id: true, first_name: true, last_name: true },
  });
  return new Map(
    people.map((p) => [p.id, [p.first_name, p.last_name].filter(Boolean).join(" ").trim()])
  );
}

export type WorkRequestDetail = {
  id: string;
  title: string;
  description: string;
  // THE ENUM, NOT `string` — same reason as `hire.ts`
  status: WorkRequestStatus;
  // THE KIND, AND IT DECIDES WHETHER SOURCING EXISTS WS-B)
  soleSourced: boolean;
  postedAt: string | null;
  currency: string;
  startDate: string | null;
  endDate: string | null;
  budgetType: string | null;
  budgetAmountCents: number | null;
  budgetMinCents: number | null;
  budgetMaxCents: number | null;
  worksite: string | null;
  experienceLevel: string | null;
  duration: string | null;
  roleName: string | null;
  skillNames: string[];
  lines: SerializedLine[];
  completeness: Completeness;
};

/** The detail page's whole payload, owner-scoped. */
export async function getWorkRequestDetail(
  viewer: Viewer,
  id: string
): Promise<WorkRequestDetail> {
  const { pAccountId } = await resolveBuyer(viewer);
  const wr = await loadOwned(viewer, id, pAccountId);
  await ensureFirstLine(wr.id);

  const rows = await prisma.workRequestLine.findMany({
    where: { work_request_id: wr.id },
    select: LINE_SELECT,
    orderBy: { line_number: "asc" },
  });

  const names = await namesFor(
    rows.map((r) => r.provider_person_id).filter((x): x is string => !!x)
  );

  // A COUNT OF INVITES PER LINE — NOT THE BIDS. 's fence: this brief
  const inviteRows = await prisma.proposalRequestLine.findMany({
    where: { work_request_line_id: { in: rows.map((r) => r.id) } },
    select: { work_request_line_id: true },
  });
  const invited = new Map<string, number>();
  for (const r of inviteRows)
    invited.set(r.work_request_line_id, (invited.get(r.work_request_line_id) ?? 0) + 1);

  const role = wr.role_type_id
    ? await prisma.roleType.findUnique({
        where: { id: wr.role_type_id },
        select: { display: true, name: true },
      })
    : null;

  const lines: SerializedLine[] = rows.map((r) => ({
    id: r.id,
    lineNumber: r.line_number,
    transaction_type: r.transaction_type,
    description: r.description,
    uom: r.uom,
    quantity: r.quantity == null ? null : Number(r.quantity),
    unitPriceCents: r.unit_price_cents,
    amountCents: r.amount_cents,
    currency: r.currency,
    providerPersonId: r.provider_person_id,
    providerName: r.provider_person_id ? names.get(r.provider_person_id) ?? null : null,
    serviceStart: r.service_start ? r.service_start.toISOString().slice(0, 10) : null,
    serviceEnd: r.service_end ? r.service_end.toISOString().slice(0, 10) : null,
    noteToSupplier: r.note_to_supplier,
    status: r.status,
    invitedCount: invited.get(r.id) ?? 0,
  }));

  return {
    id: wr.id,
    title: wr.title,
    description: wr.description ?? "",
    status: wr.status,
    /* `P2-A8-E712` WS-B — the branch above the sourcing chain. See the type. */
    soleSourced: wr.sole_sourced,
    postedAt: wr.posted_at ? wr.posted_at.toISOString() : null,
    currency: wr.currency,
    startDate: wr.start_date ? wr.start_date.toISOString().slice(0, 10) : null,
    endDate: wr.end_date ? wr.end_date.toISOString().slice(0, 10) : null,
    budgetType: wr.budget_type,
    budgetAmountCents: wr.budget_amount_cents,
    budgetMinCents: wr.budget_min_cents,
    budgetMaxCents: wr.budget_max_cents,
    worksite: wr.worksite,
    experienceLevel: wr.experience_level,
    duration: wr.duration,
    roleName: roleLong(role?.display ?? role?.name ?? null),
    skillNames: wr.skills.map((s) => s.skill.name),
    lines,
    completeness: completenessFor(lines.map((l) => ({
      line_number: l.lineNumber,
      description: l.description,
      provider_person_id: l.providerPersonId,
      transaction_type: l.transaction_type,
      unit_price_cents: l.unitPriceCents,
      amount_cents: l.amountCents,
    }))),
  };
}

/* ═══════════════════════════════════════════════════════════════════════════
   WRITE — every one owner-scoped through `loadOwned`
   ═════════════════════════════════════════════════════════════════════════ */

/** LINE 1, MATERIALISED FROM THE HEADER THE WIZARD ALREADY FILLED. Idempotent */
export async function ensureFirstLine(workRequestId: string): Promise<void> {
  const existing = await prisma.workRequestLine.count({
    where: { work_request_id: workRequestId },
  });
  if (existing > 0) return;

  const wr = await prisma.workRequest.findUnique({
    where: { id: workRequestId },
    select: {
      title: true,
      description: true,
      currency: true,
      budget_type: true,
      budget_amount_cents: true,
      role_type_id: true,
      start_date: true,
      end_date: true,
    },
  });
  if (!wr) return;

  // THE TYPE COMES FROM THE SPINE'S MAPPING, NOT A LOCAL TERNARY .
  const transactionType: TransactionType = wr.budget_type
    ? transactionTypeForPricingType(wr.budget_type)
    : "SERVICE_BY_AMT";
  const description = wr.title.trim() || "Line 1";

  try {
    await prisma.workRequestLine.create({
      data: {
        work_request_id: workRequestId,
        line_number: 1,
        transaction_type: transactionType,
        description,
        currency: wr.currency,
        // A FIXED budget IS a line amount; an HOURLY one is not a unit price —
        amount_cents: pricedByQuantity(transactionType) ? null : wr.budget_amount_cents,
        uom: pricedByQuantity(transactionType) ? "HOUR" : null,
        role_type_id: wr.role_type_id,
        service_start: wr.start_date,
        service_end: wr.end_date,
      },
    });
  } catch {
    // THE RACE LOSES ON THE UNIQUE CONSTRAINT AND THAT IS THE DESIGN. Two
  }
}

/** The next free line number for a request. */
async function nextLineNumber(workRequestId: string): Promise<number> {
  const last = await prisma.workRequestLine.findFirst({
    where: { work_request_id: workRequestId },
    orderBy: { line_number: "desc" },
    select: { line_number: true },
  });
  return (last?.line_number ?? 0) + 1;
}

export type LineDraft = {
  /** SUPERSEDED, quoted not deleted (`E164`): `basis: LineBasis;` */
  transaction_type: TransactionType;
  description: string;
  uom?: string | null;
  quantity?: number | null;
  unitPriceCents?: number | null;
  amountCents?: number | null;
  serviceStart?: string | null;
  serviceEnd?: string | null;
  noteToSupplier?: string | null;
};

/** A NEW LINE MAY BE UNPRICED, AND THAT IS THE POINT OF THE COMPLETE GATE. */
function validateDraft(d: LineDraft): void {
  if (!d.description || d.description.trim().length < 2)
    throw new WorkRequestError("A line needs a description", "INVALID");
  const TYPES: TransactionType[] = ["PRODUCT_BY_QTY", "SERVICE_BY_QTY", "SERVICE_BY_AMT"];
  if (!TYPES.includes(d.transaction_type))
    throw new WorkRequestError("A line needs a transaction type", "INVALID");
  if (d.unitPriceCents != null && d.amountCents != null)
    throw new WorkRequestError(
      "A line carries a rate or an amount, never both — it could be settled twice",
      "INVALID"
    );
  const priced =
    pricedByQuantity(d.transaction_type) ? d.unitPriceCents != null : d.amountCents != null;
  if (priced) {
    // NO TRANSLATION ANY MORE (ruling 44). The spine's rule now has a
    assertTransactionLineShape({
      transaction_type: d.transaction_type,
      uom: pricedByQuantity(d.transaction_type) ? d.uom ?? "HOUR" : null,
      quantity: pricedByQuantity(d.transaction_type) ? d.quantity ?? 1 : null,
      unit_price_cents: d.unitPriceCents ?? null,
      amount_cents: d.amountCents ?? null,
    });
  }
  if (d.serviceStart && d.serviceEnd && d.serviceEnd < d.serviceStart)
    throw new WorkRequestError("The end date is before the start date", "INVALID");
}

function draftToData(d: LineDraft) {
  return {
    // trunk's readers keep working (ruling 37b); a new line carries only the
    transaction_type: d.transaction_type,
    description: d.description.trim(),
    uom: pricedByQuantity(d.transaction_type) ? d.uom?.trim() || "HOUR" : null,
    quantity: pricedByQuantity(d.transaction_type) ? d.quantity ?? null : null,
    unit_price_cents: pricedByQuantity(d.transaction_type) ? d.unitPriceCents ?? null : null,
    amount_cents: pricedByQuantity(d.transaction_type) ? null : d.amountCents ?? null,
    service_start: d.serviceStart ? new Date(d.serviceStart) : null,
    service_end: d.serviceEnd ? new Date(d.serviceEnd) : null,
    note_to_supplier: d.noteToSupplier?.trim() || null,
  };
}

/** Add line n+1. Owner-scoped through `loadOwned`. */
export async function addLine(viewer: Viewer, id: string, draft: LineDraft) {
  const { pAccountId } = await resolveBuyer(viewer);
  const wr = await loadOwned(viewer, id, pAccountId);
  validateDraft(draft);
  await prisma.workRequestLine.create({
    data: {
      work_request_id: wr.id,
      line_number: await nextLineNumber(wr.id),
      currency: wr.currency,
      ...draftToData(draft),
    },
  });
  return getWorkRequestDetail(viewer, id);
}

/** Edit a line. */
export async function updateLine(
  viewer: Viewer,
  id: string,
  lineId: string,
  draft: LineDraft
) {
  const { pAccountId } = await resolveBuyer(viewer);
  const wr = await loadOwned(viewer, id, pAccountId);
  validateDraft(draft);
  const res = await prisma.workRequestLine.updateMany({
    where: { id: lineId, work_request_id: wr.id },
    data: draftToData(draft),
  });
  if (res.count === 0) throw new WorkRequestError("Line not found", "NOT_FOUND");
  return getWorkRequestDetail(viewer, id);
}

/** Remove a line. */
export async function removeLine(viewer: Viewer, id: string, lineId: string) {
  const { pAccountId } = await resolveBuyer(viewer);
  const wr = await loadOwned(viewer, id, pAccountId);

  const count = await prisma.workRequestLine.count({ where: { work_request_id: wr.id } });
  if (count <= 1)
    throw new WorkRequestError(
      "A work request needs at least one line — edit this one instead of removing it",
      "INVALID"
    );

  const invited = await prisma.proposalRequestLine.count({
    where: { work_request_line_id: lineId },
  });
  if (invited > 0)
    throw new WorkRequestError(
      "Providers have been invited to bid on this line — it can no longer be removed",
      "INVALID"
    );

  const res = await prisma.workRequestLine.deleteMany({
    where: { id: lineId, work_request_id: wr.id },
  });
  if (res.count === 0) throw new WorkRequestError("Line not found", "NOT_FOUND");
  return getWorkRequestDetail(viewer, id);
}

/** Assign (or clear) the provider on a line. */
export async function assignProvider(
  viewer: Viewer,
  id: string,
  lineId: string,
  providerPersonId: string | null
) {
  const { pAccountId } = await resolveBuyer(viewer);
  const wr = await loadOwned(viewer, id, pAccountId);

  if (providerPersonId) {
    const person = await prisma.person.findFirst({
      where: { id: providerPersonId, is_service_provider: true },
      select: { id: true },
    });
    if (!person)
      throw new WorkRequestError("That person is not a service provider", "INVALID");
  }

  const res = await prisma.workRequestLine.updateMany({
    where: { id: lineId, work_request_id: wr.id },
    data: {
      provider_person_id: providerPersonId,
      // THE LINE'S STATUS FOLLOWS THE ASSIGNMENT, and it is the only thing
      status: providerPersonId ? "ASSIGNED" : "DRAFT",
    },
  });
  if (res.count === 0) throw new WorkRequestError("Line not found", "NOT_FOUND");
  return getWorkRequestDetail(viewer, id);
}

/** THE COMPLETE ACTION — AND IT READS `completenessFor`, THE SAME FUNCTION THE */
export async function completeWorkRequest(viewer: Viewer, id: string) {
  const { pAccountId } = await resolveBuyer(viewer);
  const wr = await loadOwned(viewer, id, pAccountId);

  const rows = await prisma.workRequestLine.findMany({
    where: { work_request_id: wr.id },
    select: {
      line_number: true,
      description: true,
      provider_person_id: true,
      transaction_type: true,
      unit_price_cents: true,
      amount_cents: true,
    },
  });
  const completeness = completenessFor(rows);
  if (!completeness.complete)
    throw new WorkRequestError(completenessMessage(completeness), "INCOMPLETE");

  // BELT AND BRACES: the spine's own rule, asserted at the boundary. If these
  if (!workRequestIsComplete(rows))
    throw new WorkRequestError("Every line needs a provider and a price", "INCOMPLETE");

  await prisma.workRequestLine.updateMany({
    where: { work_request_id: wr.id, status: { in: ["DRAFT", "SOURCING"] } },
    data: { status: "ASSIGNED" },
  });
  // The request follows its lines, so the buyer sees Create Order (Chain C cart, R1 audit).
  await prisma.workRequest.updateMany({ where: { id: wr.id, status: { in: ["DRAFT", "POSTED"] } }, data: { status: "ASSIGNED" } });
  return getWorkRequestDetail(viewer, id);
}
