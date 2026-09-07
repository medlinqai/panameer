import { LineBasis, WorkRequestLineStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { Viewer } from "@/lib/access";
import {
  assertLineShape,
  basisForPricingType,
  workRequestIsComplete,
} from "@/lib/transaction-spine";
import { loadOwned, resolveBuyer, WorkRequestError } from "@/lib/work-request";

/**
 * WORK-REQUEST LINES, AND THE COMPLETE GATE (`P1-J4-E392`).
 *
 * ── ⚠⚠ WHY LINES LIVE HERE AND NOT IN THE WIZARD ────────────────────────────
 *
 * **The nine-step wizard is a GUIDED FIRST REQUEST and it works.** Rebuilding it
 * into a line-oriented editor would be a 1,000-line rewrite of something that is
 * not broken, and it would make the common case — one role, one provider —
 * strictly worse: a person hiring one DBA would be asked to think in line items
 * before they have thought about the DBA.
 *
 * ⚠ SO THE WIZARD PRODUCES LINE 1 AND THIS FILE PRODUCES LINES 2..n.
 * `components/work/CreateWorkRequest.tsx` is untouched by this brief — its
 * `STEPS` array still reads role · domain · skills · specializations · dates ·
 * location · budget · description · review.
 *
 * ⚠⚠ AND LINE 1 IS MATERIALISED FROM THE HEADER, NOT TYPED AGAIN. The wizard
 * already collected the basis (`budget_type`), the price, the dates and the
 * description; asking for them a second time on the detail page would be the
 * same question twice with two possible answers. `ensureFirstLine` is idempotent
 * and the `@@unique([work_request_id, line_number])` is what makes it safe under
 * a race — the second writer loses on the constraint rather than creating a
 * duplicate line 1.
 */

/* ═══════════════════════════════════════════════════════════════════════════
   THE COMPLETE GATE — ONE FUNCTION, READ BY THE PAGE **AND** THE API
   ═════════════════════════════════════════════════════════════════════════ */

export type LineForCompleteness = {
  line_number: number;
  description: string;
  provider_person_id?: string | null;
  basis: LineBasis;
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
  /** ⚠ ONLY the lines that are short of something, in line order. */
  gaps: LineGap[];
  /** Why it is not complete, for a UI that has room for one sentence. */
  reason: "COMPLETE" | "NO_LINES" | "LINES_INCOMPLETE";
};

/**
 * ⚠⚠ THE ONE FUNCTION. THE DETAIL PAGE AND THE API BOTH READ THIS, AND NEITHER
 * RE-DERIVES IT.
 *
 * **A disabled button with no reason is a defect this codebase already fixed
 * once.** `create-work/page.tsx` reads `missingIdentityForPerson` — the same
 * function `postWorkRequest` enforces with — precisely so the page and the route
 * cannot disagree about the rule OR about the words. This is that pattern again,
 * for a different gate.
 *
 * ⚠ SO IT RETURNS THE REASONS, NOT A BOOLEAN. A boolean can only produce a grey
 * button; `gaps` names the LINE and says whether it wants a provider, a price or
 * both, which is the difference between "Complete is disabled" and "line 2 has
 * no provider and line 3 has no price."
 *
 * ⚠⚠ AND IT AGREES WITH `E388`'s `workRequestIsComplete` BY CONSTRUCTION. That
 * function is the spine's rule and stays the authority on WHAT complete means —
 * every line assigned and priced, and never zero lines. This adds the reasons and
 * nothing else, and `check:hire` asserts the two agree across a truth table so a
 * later edit to either cannot drift them apart.
 */
export function completenessFor(lines: LineForCompleteness[]): Completeness {
  const gaps: LineGap[] = [];
  for (const l of [...lines].sort((a, b) => a.line_number - b.line_number)) {
    const missing: ("provider" | "price")[] = [];
    if (!l.provider_person_id) missing.push("provider");
    /* ⚠ THE PRICE A LINE NEEDS DEPENDS ON ITS BASIS — a RATE line is priced by
       `unit_price_cents` and an AMOUNT line by `amount_cents`. Checking only one
       column would mark every line of the other kind unpriced forever. */
    const priced = l.basis === "RATE" ? l.unit_price_cents != null : l.amount_cents != null;
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
  basis: true,
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
  basis: LineBasis;
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
  /** ⚠ Invited-to-bid count for THIS line. A count, never the bids themselves. */
  invitedCount: number;
};

/**
 * ⚠ THE PROVIDER'S NAME IS RESOLVED IN ONE BATCH, NOT PER LINE. Four lines
 * naming four providers is four queries the obvious way; this is one.
 */
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
  status: string;
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

/**
 * The detail page's whole payload, owner-scoped.
 *
 * ⚠ IT CALLS `ensureFirstLine` FIRST. A request created before this brief — or
 * by the wizard, which writes the header and not a line — would otherwise open on
 * an empty table with a Complete button that can never go green, and the reason
 * would be invisible. The call is idempotent; see the file header.
 */
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

  /* ⚠ A COUNT OF INVITES PER LINE — NOT THE BIDS. `E395`'s fence: this brief
     creates invitations and renders none of what comes back. */
  const inviteRows = await prisma.bidRequestLine.findMany({
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
    basis: r.basis,
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
    roleName: role?.display ?? role?.name ?? null,
    skillNames: wr.skills.map((s) => s.skill.name),
    lines,
    completeness: completenessFor(lines.map((l) => ({
      line_number: l.lineNumber,
      description: l.description,
      provider_person_id: l.providerPersonId,
      basis: l.basis,
      unit_price_cents: l.unitPriceCents,
      amount_cents: l.amountCents,
    }))),
  };
}

/* ═══════════════════════════════════════════════════════════════════════════
   WRITE — every one owner-scoped through `loadOwned`
   ═════════════════════════════════════════════════════════════════════════ */

/**
 * ⚠⚠ LINE 1, MATERIALISED FROM THE HEADER THE WIZARD ALREADY FILLED. Idempotent:
 * if the request has any line at all this does nothing and returns.
 *
 * ⚠ THE BASIS COMES FROM `basisForPricingType`, THE SPINE'S OWN MAPPING —
 * HOURLY → RATE, FIXED → AMOUNT. Re-deriving it here with a ternary would be a
 * second answer to a question `E388` already settled.
 *
 * ⚠ IT DOES NOT INVENT A PRICE. A header with `budget_type = HOURLY` and a range
 * (`budget_min_cents`..`budget_max_cents`) has NO single rate, and picking the
 * midpoint would put a number on the line that the requester never typed. The
 * line comes through UNPRICED, the COMPLETE gate says so by name, and the
 * requester fills it in. **A budget is what you are willing to pay; a line price
 * is what you agreed to pay, and they are not the same fact.**
 */
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

  const basis: LineBasis = wr.budget_type ? basisForPricingType(wr.budget_type) : "AMOUNT";
  const description = wr.title.trim() || "Line 1";

  try {
    await prisma.workRequestLine.create({
      data: {
        work_request_id: workRequestId,
        line_number: 1,
        basis,
        description,
        currency: wr.currency,
        /* ⚠ A FIXED budget IS a line amount; an HOURLY one is not a unit price —
           see the docblock. Only the unambiguous half is carried across. */
        amount_cents: basis === "AMOUNT" ? wr.budget_amount_cents : null,
        uom: basis === "RATE" ? "HOUR" : null,
        role_type_id: wr.role_type_id,
        service_start: wr.start_date,
        service_end: wr.end_date,
      },
    });
  } catch {
    /* ⚠ THE RACE LOSES ON THE UNIQUE CONSTRAINT AND THAT IS THE DESIGN. Two
       concurrent loads of the detail page both see zero lines; the second
       `create` violates `@@unique([work_request_id, line_number])` and lands
       here. The outcome — exactly one line 1 — is what was wanted either way. */
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
  basis: LineBasis;
  description: string;
  uom?: string | null;
  quantity?: number | null;
  unitPriceCents?: number | null;
  amountCents?: number | null;
  serviceStart?: string | null;
  serviceEnd?: string | null;
  noteToSupplier?: string | null;
};

/**
 * ⚠ A NEW LINE MAY BE UNPRICED, AND THAT IS THE POINT OF THE COMPLETE GATE.
 * `assertLineShape` — the spine's rule — refuses a line that carries BOTH a rate
 * and an amount, which is the shape that can be settled twice. It is only run
 * once a line actually carries a price, because a line with nothing in it yet is
 * a line the requester has not finished, not a malformed one.
 */
function validateDraft(d: LineDraft): void {
  if (!d.description || d.description.trim().length < 2)
    throw new WorkRequestError("A line needs a description", "INVALID");
  if (d.basis !== "RATE" && d.basis !== "AMOUNT")
    throw new WorkRequestError("A line is priced by RATE or by AMOUNT", "INVALID");
  if (d.unitPriceCents != null && d.amountCents != null)
    throw new WorkRequestError(
      "A line carries a rate or an amount, never both — it could be settled twice",
      "INVALID"
    );
  const priced =
    d.basis === "RATE" ? d.unitPriceCents != null : d.amountCents != null;
  if (priced) {
    assertLineShape({
      basis: d.basis,
      uom: d.basis === "RATE" ? d.uom ?? "HOUR" : null,
      quantity: d.basis === "RATE" ? d.quantity ?? 1 : null,
      unit_price_cents: d.unitPriceCents ?? null,
      amount_cents: d.amountCents ?? null,
    });
  }
  if (d.serviceStart && d.serviceEnd && d.serviceEnd < d.serviceStart)
    throw new WorkRequestError("The end date is before the start date", "INVALID");
}

function draftToData(d: LineDraft) {
  return {
    basis: d.basis,
    description: d.description.trim(),
    uom: d.basis === "RATE" ? d.uom?.trim() || "HOUR" : null,
    quantity: d.basis === "RATE" ? d.quantity ?? null : null,
    unit_price_cents: d.basis === "RATE" ? d.unitPriceCents ?? null : null,
    amount_cents: d.basis === "AMOUNT" ? d.amountCents ?? null : null,
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

/**
 * Edit a line.
 *
 * ⚠⚠ THE `lineId` IS CHECKED AGAINST THE REQUEST THE VIEWER OWNS, NOT TRUSTED.
 * `updateMany` scoped to `{ id, work_request_id }` is what makes a line id from
 * another tenant's request update ZERO rows instead of theirs. Ownership comes
 * from the session via `loadOwned`; the client supplies only which line of
 * something it already proved it owns.
 */
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

/**
 * Remove a line.
 *
 * ⚠ LINE 1 IS NOT REMOVABLE while it is the only line: a work request with no
 * lines is a request for nothing, and the COMPLETE gate would report `NO_LINES`
 * on something the requester thinks they just tidied.
 * ⚠ AND A LINE SOMEBODY HAS BEEN INVITED TO BID ON IS NOT REMOVABLE EITHER —
 * the ITB names this line, and deleting it would leave a provider holding an
 * invitation to price something that no longer exists.
 */
export async function removeLine(viewer: Viewer, id: string, lineId: string) {
  const { pAccountId } = await resolveBuyer(viewer);
  const wr = await loadOwned(viewer, id, pAccountId);

  const count = await prisma.workRequestLine.count({ where: { work_request_id: wr.id } });
  if (count <= 1)
    throw new WorkRequestError(
      "A work request needs at least one line — edit this one instead of removing it",
      "INVALID"
    );

  const invited = await prisma.bidRequestLine.count({
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

/**
 * Assign (or clear) the provider on a line.
 *
 * ⚠ THE PROVIDER IS A `Person` WHO CAN ACTUALLY PROVIDE SERVICES, checked here
 * rather than assumed from the picker. The picker is a convenience; this is the
 * boundary, and a `provider_person_id` pointing at a buyer would produce a work
 * order nobody can accept.
 */
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
      /* ⚠ THE LINE'S STATUS FOLLOWS THE ASSIGNMENT, and it is the only thing
         that writes it here. `ORDERED` is the Work Order's to set, not this. */
      status: providerPersonId ? "ASSIGNED" : "DRAFT",
    },
  });
  if (res.count === 0) throw new WorkRequestError("Line not found", "NOT_FOUND");
  return getWorkRequestDetail(viewer, id);
}

/**
 * ⚠⚠ THE COMPLETE ACTION — AND IT READS `completenessFor`, THE SAME FUNCTION THE
 * PAGE DISABLES ITS BUTTON WITH.
 *
 * ⚠ THIS IS THE BOUNDARY, NOT THE BUTTON. The route is reachable without ever
 * loading the page, so the refusal has to live here; the page's grey button is
 * the courtesy. And because both read one function, the refusal the API sends
 * back is WORD FOR WORD what the page was already showing.
 *
 * ⚠ WHAT "COMPLETE" DOES NOT DO: it does not create a Work Order. `E388` built
 * that model and awarding is `E392`/`E393` territory once a bid exists to award.
 * Marking the lines ASSIGNED is the whole of it.
 */
export async function completeWorkRequest(viewer: Viewer, id: string) {
  const { pAccountId } = await resolveBuyer(viewer);
  const wr = await loadOwned(viewer, id, pAccountId);

  const rows = await prisma.workRequestLine.findMany({
    where: { work_request_id: wr.id },
    select: {
      line_number: true,
      description: true,
      provider_person_id: true,
      basis: true,
      unit_price_cents: true,
      amount_cents: true,
    },
  });
  const completeness = completenessFor(rows);
  if (!completeness.complete)
    throw new WorkRequestError(completenessMessage(completeness), "INCOMPLETE");

  /* ⚠ BELT AND BRACES: the spine's own rule, asserted at the boundary. If these
     two ever disagree the request is refused rather than let through. */
  if (!workRequestIsComplete(rows))
    throw new WorkRequestError("Every line needs a provider and a price", "INCOMPLETE");

  await prisma.workRequestLine.updateMany({
    where: { work_request_id: wr.id, status: { in: ["DRAFT", "SOURCING"] } },
    data: { status: "ASSIGNED" },
  });
  return getWorkRequestDetail(viewer, id);
}
