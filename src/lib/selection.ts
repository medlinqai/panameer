import { assertCanSign } from "@/lib/your-path";
import { prisma } from "@/lib/prisma";
import { SourcingError } from "@/lib/sourcing";
import type { Viewer } from "@/lib/access";

export const HOURS_PER_DAY = 8;

export function businessDaysBetween(start: Date, end: Date): number {
  if (end.getTime() < start.getTime()) return 0;
  let days = 0;
  const cursor = new Date(
    Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate())
  );
  const last = Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate());
  while (cursor.getTime() <= last) {
    const dow = cursor.getUTCDay();
    if (dow !== 0 && dow !== 6) days += 1;
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return days;
}

/** Every input and every step, so a reader can check the total by hand. */
export type TalentLineMath = {
  startDate: Date;
  endDate: Date;
  businessDays: number;
  hoursPerDay: number;
  positions: number;
  hours: number;
  unitPriceCents: number;
  amountCents: number;
  formula: string;
};

const money = (cents: number) =>
  `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** THE ONE PLACE THE TOTAL IS COMPUTED, AND IT RETURNS ITS WORKING. */
export function talentLineMath(input: {
  startDate: Date;
  endDate: Date;
  positions: number;
  unitPriceCents: number;
}): TalentLineMath {
  const businessDays = businessDaysBetween(input.startDate, input.endDate);
  const positions = Math.max(1, Math.trunc(input.positions));
  const hours = businessDays * HOURS_PER_DAY * positions;
  const amountCents = hours * input.unitPriceCents;
  const posPart = positions === 1 ? "" : ` × ${positions} positions`;
  return {
    startDate: input.startDate,
    endDate: input.endDate,
    businessDays,
    hoursPerDay: HOURS_PER_DAY,
    positions,
    hours,
    unitPriceCents: input.unitPriceCents,
    amountCents,
    formula:
      `${businessDays} business days × ${HOURS_PER_DAY} h/day${posPart} = ${hours} h` +
      ` × ${money(input.unitPriceCents)}/h = ${money(amountCents)}`,
  };
}

// THE WRITER — ONE REQUISITION SHAPE, TWO DOORS (item 3)

async function ownPerson(viewer: Viewer) {
  const person = await prisma.person.findUnique({
    where: { user_id: viewer.userId },
    select: { id: true },
  });
  if (!person) throw new SourcingError("No person for this account.", "NOT_FOUND");
  return person;
}

async function buyerRequest(workRequestId: string, personId: string) {
  const wr = await prisma.workRequest.findUnique({
    where: { id: workRequestId },
    select: {
      id: true,
      buyer_person_id: true,
      status: true,
      title: true,
      start_date: true,
      end_date: true,
      currency: true,
    },
  });
  if (!wr) throw new SourcingError("That work request isn't available.", "NOT_FOUND");
  if (wr.buyer_person_id !== personId) {
    throw new SourcingError("Only the buyer can do that.", "NOT_BUYER");
  }
  return wr;
}

export type Selection = {
  workRequestId: string;
  workRequestLineId: string;
  providerPersonId: string;
  /** Null on Route B — there was no proposal to award. */
  proposalId: string | null;
  math: TalentLineMath;
  /** How many other proposals were marked `NOT_SELECTED`. */
  notSelected: number;
  route: "PROPOSAL" | "DIRECT";
};

/** THE SHARED BODY. BOTH ROUTES END HERE AND NOTHING DOWNSTREAM CAN TELL */
async function writeRequisitionLine(args: {
  workRequest: { id: string; title: string; start_date: Date | null; end_date: Date | null };
  providerPersonId: string;
  proposalId: string | null;
  unitPriceCents: number;
  uom: string | null;
  recruiterPersonId: string | null;
  route: "PROPOSAL" | "DIRECT";
}): Promise<{ lineId: string; math: TalentLineMath }> {
  const { workRequest: wr } = args;
  // THE BUYER'S DATES ARE REQUIRED, AND THEIR ABSENCE IS A REFUSAL RATHER
  if (!wr.start_date || !wr.end_date) {
    throw new SourcingError(
      "Add a start and end date to this work request before selecting somebody — the hours are worked out from them.",
      "NO_DATES"
    );
  }

  /* `positions` lives on the line, and on a new line it is the default 1. */
  const math = talentLineMath({
    startDate: wr.start_date,
    endDate: wr.end_date,
    positions: 1,
    unitPriceCents: args.unitPriceCents,
  });
  if (math.hours <= 0) {
    throw new SourcingError(
      "Those dates contain no working days.",
      "NO_WORKING_DAYS"
    );
  }

  // ONE TALENT LINE PER SELECTION, REPLACED RATHER THAN APPENDED. Selecting
  const line = await prisma.workRequestLine.upsert({
    where: { work_request_id_line_number: { work_request_id: wr.id, line_number: 1 } },
    create: {
      work_request_id: wr.id,
      line_number: 1,
      // SERVICE BY QUANTITY — HOURS AT A RATE. Ruling 44 deleted the
      transaction_type: "SERVICE_BY_QTY",
      description: wr.title || "Professional services",
      uom: args.uom ?? "HOUR",
      quantity: math.hours,
      unit_price_cents: math.unitPriceCents,
      // NO `amount_cents` ON A RATE LINE
      amount_cents: null,
      provider_person_id: args.providerPersonId,
      recruiter_person_id: args.recruiterPersonId,
      /* NO `supplier_part_id` — a person's time is not an item. */
      service_start: wr.start_date,
      service_end: wr.end_date,
      /* Scott's *"Created"* — `SOURCED` is WS-D's, when the order is built. */
      status: "ASSIGNED",
    },
    update: {
      transaction_type: "SERVICE_BY_QTY",
      description: wr.title || "Professional services",
      uom: args.uom ?? "HOUR",
      quantity: math.hours,
      unit_price_cents: math.unitPriceCents,
      // THE SAME ON THE UPDATE HALF — and it has to be NULL rather than
      amount_cents: null,
      provider_person_id: args.providerPersonId,
      recruiter_person_id: args.recruiterPersonId,
      service_start: wr.start_date,
      service_end: wr.end_date,
      status: "ASSIGNED",
    },
    select: { id: true },
  });

  return { lineId: line.id, math };
}

/** ROUTE A — the buyer picks a winner from the proposals. */
export async function selectProvider(
  viewer: Viewer,
  input: { workRequestId: string; providerPersonId: string }
): Promise<Selection> {
  const me = await ownPerson(viewer);
  const wr = await buyerRequest(input.workRequestId, me.id);

  // RULING 17, THE FORWARD HALF: once the order exists the selection is
  if (wr.status === "ORDERED") {
    throw new SourcingError(
      "This work request already has a work order — the selection can't be changed.",
      "ALREADY_ORDERED"
    );
  }
  if (wr.status === "CANCELLED") {
    throw new SourcingError("This work request was cancelled.", "CANCELLED");
  }
  await assertCanSign(me.id, me.id, input.providerPersonId);

  const winner = await prisma.proposal.findUnique({
    where: {
      work_request_id_provider_person_id: {
        work_request_id: wr.id,
        provider_person_id: input.providerPersonId,
      },
    },
    select: {
      id: true,
      status: true,
      lines: {
        select: { unit_price_cents: true, uom: true, basis: true },
        orderBy: { line_number: "asc" },
        take: 1,
      },
    },
  });
  if (!winner) {
    throw new SourcingError("That provider hasn't proposed on this work request.", "NO_PROPOSAL");
  }
  if (winner.status === "WITHDRAWN" || winner.status === "DECLINED") {
    throw new SourcingError("That proposal is no longer open.", "PROPOSAL_CLOSED");
  }
  const proposalLine = winner.lines[0];
  if (!proposalLine || proposalLine.unit_price_cents == null) {
    // A REFUSAL, NOT A FALLBACK. Without their rate there is nothing to
    throw new SourcingError(
      "That proposal doesn't state a rate, so the hours can't be priced.",
      "PROPOSAL_HAS_NO_RATE"
    );
  }

  const { lineId, math } = await writeRequisitionLine({
    workRequest: wr,
    providerPersonId: input.providerPersonId,
    proposalId: winner.id,
    unitPriceCents: proposalLine.unit_price_cents,
    uom: proposalLine.uom ?? null,
    recruiterPersonId: null,
    route: "PROPOSAL",
  });

  // THE LOSERS (item 2)
  const losers = await prisma.proposal.updateMany({
    where: {
      work_request_id: wr.id,
      id: { not: winner.id },
      status: { in: ["DRAFT", "SUBMITTED", "SHORTLISTED"] },
    },
    data: { status: "NOT_SELECTED" },
  });

  await prisma.$transaction([
    prisma.proposal.update({ where: { id: winner.id }, data: { status: "AWARDED" } }),
    // RULING 17: creating the ORDER moves the status to `ORDERED`; selecting
    // WS-D). The column's `@default(false)` means *"nobody
    prisma.workRequest.update({
      where: { id: wr.id },
      data: { status: "ASSIGNED", sole_sourced: false },
    }),
  ]);

  // THE BUYER'S WORKLIST ITEMS ARE CLEARED — they no longer owe a response
  const allProposals = await prisma.proposal.findMany({
    where: { work_request_id: wr.id },
    select: { id: true },
  });
  await prisma.notification
    .updateMany({
      where: {
        dedupe_key: { in: allProposals.map((b) => `work.proposal_received:${b.id}`) },
        resolved_at: null,
      },
      data: { resolved_at: new Date() },
    })
    .catch(() => {});

  return {
    workRequestId: wr.id,
    workRequestLineId: lineId,
    providerPersonId: input.providerPersonId,
    proposalId: winner.id,
    math,
    notSelected: losers.count,
    route: "PROPOSAL",
  };
}

/** ROUTE B — DIRECT ASSIGNMENT. A FIRST-CLASS PATH, NOT A FALLBACK */
export async function assignProviderDirectly(
  viewer: Viewer,
  input: {
    workRequestId: string;
    providerPersonId: string;
    unitPriceCents: number;
    uom?: string | null;
    /** Scott's WR_LINE *Recruiter ID* — set when a recruiter placed them. */
    recruiterPersonId?: string | null;
  }
): Promise<Selection> {
  const me = await ownPerson(viewer);
  const wr = await buyerRequest(input.workRequestId, me.id);
  if (wr.status === "ORDERED") {
    throw new SourcingError(
      "This work request already has a work order — the selection can't be changed.",
      "ALREADY_ORDERED"
    );
  }
  if (wr.status === "CANCELLED") {
    throw new SourcingError("This work request was cancelled.", "CANCELLED");
  }
  if (!Number.isInteger(input.unitPriceCents) || input.unitPriceCents <= 0) {
    throw new SourcingError("Enter the rate for this engagement.", "NO_RATE");
  }
  await assertCanSign(me.id, me.id, input.providerPersonId);

  // The provider must be a real person with an account — a direct assignment
  const person = await prisma.person.findFirst({
    where: { id: input.providerPersonId, NOT: { user_id: null } },
    select: { id: true },
  });
  if (!person) {
    throw new SourcingError("That provider isn't available.", "NOT_FOUND");
  }

  const { lineId, math } = await writeRequisitionLine({
    workRequest: wr,
    providerPersonId: input.providerPersonId,
    proposalId: null,
    unitPriceCents: input.unitPriceCents,
    uom: input.uom ?? null,
    recruiterPersonId: input.recruiterPersonId ?? null,
    route: "DIRECT",
  });

  // WS-D, ruling `97d`. AN HOUR AGO IT WAS A CONVENIENCE SO A
  await prisma.workRequest.update({
    where: { id: wr.id },
    data: { status: "ASSIGNED", sole_sourced: true },
  });

  return {
    workRequestId: wr.id,
    workRequestLineId: lineId,
    providerPersonId: input.providerPersonId,
    proposalId: null,
    math,
    notSelected: 0,
    route: "DIRECT",
  };
}

/** RULING 17 — SELECTION IS REVERSIBLE UNTIL THE WORK ORDER IS CREATED. */
export async function reverseSelection(
  viewer: Viewer,
  workRequestId: string
): Promise<{ reopened: number }> {
  const me = await ownPerson(viewer);
  const wr = await buyerRequest(workRequestId, me.id);

  // THE FENCE, READ FROM THE LINE RATHER THAN FROM THE HEADER'S STATUS.
  const ordered = await prisma.workRequestLine.findFirst({
    where: { work_request_id: wr.id, work_order_id: { not: null } },
    select: { id: true },
  });
  if (ordered || wr.status === "ORDERED") {
    throw new SourcingError(
      "A work order has already been created from this selection, so it can't be reversed.",
      "ALREADY_ORDERED"
    );
  }

  // Back to the state before the choice: the award returns to `SUBMITTED` and
  const reopened = await prisma.proposal.updateMany({
    where: {
      work_request_id: wr.id,
      status: { in: ["AWARDED", "NOT_SELECTED"] },
    },
    data: { status: "SUBMITTED" },
  });

  await prisma.$transaction([
    prisma.workRequestLine.updateMany({
      where: { work_request_id: wr.id, line_number: 1 },
      data: { provider_person_id: null, status: "SOURCING" },
    }),
    prisma.workRequest.update({ where: { id: wr.id }, data: { status: "POSTED" } }),
  ]);

  return { reopened: reopened.count };
}
