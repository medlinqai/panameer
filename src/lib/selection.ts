import { prisma } from "@/lib/prisma";
import { SourcingError } from "@/lib/sourcing";
import type { Viewer } from "@/lib/access";

/**
 * ── ⚠⚠⚠ THE BUYER SELECTS, AND THE REQUISITION IS CREATED (`E621` WS-C) ──
 *
 * ⚠⚠⚠ **THE PREMISE CORRECTION THIS WORKSTREAM TURNS ON — THERE IS NO
 * `Requisition` TABLE TO BUILD, AND THERE MUST NOT BE ONE.**
 *
 * ⚠ The brief says *"create the requisition, per `requisition_model_2026-09-21.md`"*,
 * and that document's own mapping table answers what it is:
 *
 * | Oracle | Panameer |
 * |---|---|
 * | Requisition header | **WR_HEADER (the cart)** |
 * | Requisition line | **WR_LINE**; line type = Transaction Type |
 *
 * ⚠⚠ And its title is *"The cart **IS** the work request"*. **So WR_HEADER is
 * `WorkRequest` and WR_LINE is `WorkRequestLine`.** ⚠⚠⚠ MEASURED 2026-09-25:
 * `grep "^model Requisition"` returns **nothing** — and that is correct rather
 * than missing. A second header table would be two carts for one purchase.
 *
 * ⚠ SO THIS WORKSTREAM NEEDED **NO SCHEMA EDIT.** Every field in Scott's WR_LINE
 * list already has a column, three of them added by WS-A:
 *
 * | Scott's WR_LINE field | column |
 * |---|---|
 * | Requisition ID · Line Number | `work_request_id` · `line_number` |
 * | Line Status (Created, Sourced) | `status` — `DRAFT` … `ORDERED` |
 * | **Transaction Type** | `transaction_type` ⚠ added by WS-A |
 * | Description · Category | `description` · `unspsc_code` |
 * | Quantity · Unit Price · Line Amount | `quantity` · `unit_price_cents` · `amount_cents` |
 * | Provider ID | `provider_person_id` |
 * | **Recruiter ID** · **Work Order** | `recruiter_person_id` · `work_order_id` ⚠ added by WS-A |
 * | Item ID | `supplier_part_id` |
 * | Requested Date | `service_start` |
 *
 * ⚠⚠ **TWO WR_HEADER FIELDS HAVE NO COLUMN AND ARE REPORTED, NOT ADDED:**
 * *Entered By* (Oracle distinguishes it from *Created By* when somebody enters a
 * requisition on another person's behalf — Panameer has only `buyer_person_id`)
 * and *Requisition Comments*. ⚠ Neither has a writer and nothing in this
 * workstream needs one; a column nobody writes is the debt `basis` already is.
 *
 * ── ⚠⚠ NO MONEY MOVES HERE (item 5, ruling 25) ──────────────────────────
 * ⚠ The line STATES an amount. Nothing collects it, nothing is billed, and no
 * cut is computed. `check:selection` asserts this file cannot reach `Payment`.
 */

/* ═══════════════════════════════════════════════════════════════════════════
   THE ARITHMETIC — ⚠⚠⚠ PRINTED, NEVER A HARD-CODED TOTAL (item 1)
   ═════════════════════════════════════════════════════════════════════════ */

/**
 * ⚠⚠⚠ **A NUMBER SCOTT HAS NOT SUPPLIED, NAMED SO IT CAN BE ARGUED WITH.**
 *
 * ⚠ WS-C item 1 requires *"the hours that follow from"* the buyer's dates, so a
 * derivation is unavoidable — but **how many hours a working day contains is a
 * product decision nobody has made.** ⚠⚠ It is a named constant, printed inside
 * every quotation this module produces, and **reported as owed** rather than
 * buried in a multiplication. ⚠⚠⚠ The alternative — quietly writing `× 8` in
 * the middle of the sum — is how a total nobody agreed to becomes the total
 * everybody quotes.
 */
export const HOURS_PER_DAY = 8;

/**
 * ⚠⚠ MONDAY TO FRIDAY, BOTH ENDS INCLUSIVE.
 *
 * ⚠ Inclusive because a one-day engagement starting and ending on the same
 * Tuesday is **one day of work, not zero** — an exclusive count would quote it
 * as free. ⚠⚠ **Public holidays are NOT deducted, and that is stated rather than
 * hidden:** they differ by country and `WorkRequest.location_country` is
 * nullable, so deducting them would be a guess dressed as a fact.
 */
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
  /** ⚠ The sum in words, for the dialog and for the gate's output. */
  formula: string;
};

const money = (cents: number) =>
  `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/**
 * ⚠⚠⚠ THE ONE PLACE THE TOTAL IS COMPUTED, AND IT RETURNS ITS WORKING.
 *
 * ⚠ *"Print the arithmetic; never hard-code a total."* — so the caller is handed
 * the inputs AND the steps, and the dialog renders what this returned rather
 * than re-multiplying anything. ⚠⚠ A second multiplication on the screen is two
 * definitions of one number, which is `E585` with a price attached.
 */
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

/* ═══════════════════════════════════════════════════════════════════════════
   THE WRITER — ⚠⚠ ONE REQUISITION SHAPE, TWO DOORS (item 3)
   ═════════════════════════════════════════════════════════════════════════ */

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
  /** ⚠ Null on Route B — there was no proposal to award. */
  providerBidId: string | null;
  math: TalentLineMath;
  /** How many other proposals were marked `NOT_SELECTED`. */
  notSelected: number;
  route: "PROPOSAL" | "DIRECT";
};

/**
 * ⚠⚠⚠ THE SHARED BODY. **BOTH ROUTES END HERE AND NOTHING DOWNSTREAM CAN TELL
 * WHICH DOOR OPENED** — the same discipline WS-D's two doors need, applied one
 * step earlier. ⚠ WS-C item 3: *"One requisition shape, whichever route produced
 * it."* If Route B had its own line-writing code the two shapes would drift, and
 * the drift would show up as a work order that is missing a field.
 *
 * ⚠⚠ THE LINE IS **ONE TALENT LINE**: a provider, a rate and a quantity, with
 * **no `supplier_part_id`.** ⚠⚠⚠ Ruling, `requisition_model_2026-09-21.md`:
 * *"the fact that Scott has a rate and can be bought for hours DOES NOT create
 * an item… Buying a person's time is NOT an item."* A talent line carrying an
 * Item ID would be that retired design coming back.
 */
async function writeRequisitionLine(args: {
  workRequest: { id: string; title: string; start_date: Date | null; end_date: Date | null };
  providerPersonId: string;
  providerBidId: string | null;
  unitPriceCents: number;
  uom: string | null;
  recruiterPersonId: string | null;
  route: "PROPOSAL" | "DIRECT";
}): Promise<{ lineId: string; math: TalentLineMath }> {
  const { workRequest: wr } = args;
  /*
    ⚠⚠⚠ THE BUYER'S DATES ARE REQUIRED, AND THEIR ABSENCE IS A REFUSAL RATHER
    THAN A GUESS. ⚠ `WorkRequest.start_date` and `end_date` are both nullable, so
    a request can reach selection with neither — and **hours cannot follow from
    dates that do not exist.** ⚠⚠ Defaulting to "a month" would put a number
    nobody chose onto a line somebody is going to be paid against.
  */
  if (!wr.start_date || !wr.end_date) {
    throw new SourcingError(
      "Add a start and end date to this work request before selecting somebody — the hours are worked out from them.",
      "NO_DATES"
    );
  }

  /* ⚠ `positions` lives on the line, and on a new line it is the default 1. */
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

  /*
    ⚠⚠ ONE TALENT LINE PER SELECTION, REPLACED RATHER THAN APPENDED. Selecting,
    reversing and selecting again must leave ONE line — `line_number` 1 with a
    `@@unique([work_request_id, line_number])` behind it, so the database
    refuses a second rather than this function remembering to look.
  */
  const line = await prisma.workRequestLine.upsert({
    where: { work_request_id_line_number: { work_request_id: wr.id, line_number: 1 } },
    create: {
      work_request_id: wr.id,
      line_number: 1,
      /*
        ⚠⚠⚠ SERVICE BY QUANTITY — HOURS AT A RATE. ⚠ Ruling 44 deleted the
        `LineBasis` ⇄ `TransactionType` BRIDGE, so this is stated directly
        rather than translated from a basis. **A translation is where a rate
        silently changes between what was bid and what was ordered.**
      */
      transaction_type: "SERVICE_BY_QTY",
      description: wr.title || "Professional services",
      uom: args.uom ?? "HOUR",
      quantity: math.hours,
      unit_price_cents: math.unitPriceCents,
      amount_cents: math.amountCents,
      provider_person_id: args.providerPersonId,
      recruiter_person_id: args.recruiterPersonId,
      /* ⚠⚠ NO `supplier_part_id` — a person's time is not an item. */
      service_start: wr.start_date,
      service_end: wr.end_date,
      /* ⚠ Scott's *"Created"* — `SOURCED` is WS-D's, when the order is built. */
      status: "ASSIGNED",
    },
    update: {
      transaction_type: "SERVICE_BY_QTY",
      description: wr.title || "Professional services",
      uom: args.uom ?? "HOUR",
      quantity: math.hours,
      unit_price_cents: math.unitPriceCents,
      amount_cents: math.amountCents,
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

/**
 * ⚠⚠ ROUTE A — the buyer picks a winner from the proposals.
 *
 * ⚠⚠⚠ THE RATE IS **THE PROVIDER'S OWN**, READ FROM THEIR PROPOSAL LINE, NEVER
 * TYPED BY THE BUYER. ⚠ The same argument that makes a test score uncopyable:
 * the moment the buyer can enter the number, there are two rates for one
 * engagement and the provider's is the one that loses.
 */
export async function selectProvider(
  viewer: Viewer,
  input: { workRequestId: string; providerPersonId: string }
): Promise<Selection> {
  const me = await ownPerson(viewer);
  const wr = await buyerRequest(input.workRequestId, me.id);

  /* ⚠⚠ RULING 17, THE FORWARD HALF: once the order exists the selection is
     fixed, so a request already `ORDERED` cannot be re-selected. */
  if (wr.status === "ORDERED") {
    throw new SourcingError(
      "This work request already has a work order — the selection can't be changed.",
      "ALREADY_ORDERED"
    );
  }
  if (wr.status === "CANCELLED") {
    throw new SourcingError("This work request was cancelled.", "CANCELLED");
  }

  const winner = await prisma.providerBid.findUnique({
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
  const bidLine = winner.lines[0];
  if (!bidLine || bidLine.unit_price_cents == null) {
    /* ⚠⚠⚠ A REFUSAL, NOT A FALLBACK. Without their rate there is nothing to
       multiply, and the provider's listed profile rate is what they advertise —
       not what they proposed for this work. */
    throw new SourcingError(
      "That proposal doesn't state a rate, so the hours can't be priced.",
      "PROPOSAL_HAS_NO_RATE"
    );
  }

  const { lineId, math } = await writeRequisitionLine({
    workRequest: wr,
    providerPersonId: input.providerPersonId,
    providerBidId: winner.id,
    unitPriceCents: bidLine.unit_price_cents,
    uom: bidLine.uom ?? null,
    recruiterPersonId: null,
    route: "PROPOSAL",
  });

  /*
    ── ⚠⚠ THE LOSERS (item 2) ──────────────────────────────────────────────
    ⚠⚠⚠ THEIR PROPOSALS STAY ON THE RECORD. `NOT_SELECTED` is a status, not a
    deletion — the same rule withdrawal and a declined interview both hold.
    ⚠ Only OPEN ones move: a proposal already `WITHDRAWN` or `DECLINED` reached
    its own end and overwriting that would rewrite what happened.
  */
  const losers = await prisma.providerBid.updateMany({
    where: {
      work_request_id: wr.id,
      id: { not: winner.id },
      status: { in: ["DRAFT", "SUBMITTED", "SHORTLISTED"] },
    },
    data: { status: "NOT_SELECTED" },
  });

  await prisma.$transaction([
    prisma.providerBid.update({ where: { id: winner.id }, data: { status: "AWARDED" } }),
    /* ⚠⚠ RULING 17: creating the ORDER moves the status to `ORDERED`; selecting
       moves it to `ASSIGNED`, which is the state a reversal can still leave. */
    prisma.workRequest.update({ where: { id: wr.id }, data: { status: "ASSIGNED" } }),
  ]);

  /*
    ⚠⚠⚠ THE BUYER'S WORKLIST ITEMS ARE CLEARED — they no longer owe a response
    to any proposal on this request, because they have answered all of them by
    choosing. ⚠ Resolved, never deleted: the notification is the record that the
    proposal arrived.
    ⚠⚠ AND THE LOSERS ARE NOT MAILED, WHICH IS MEASURED RATHER THAN FORGOTTEN:
    **no `work.*` event for "you were not selected" is registered** — the four
    that exist are `proposal_received`, `interview_requested`, `order_offered`
    and `settlement_approval`. ⚠ Ruling 37: *call the event that exists; do not
    invent a second.* So a provider learns it from their own proposal's status,
    and the missing event is REPORTED AS OWED.
  */
  const allBids = await prisma.providerBid.findMany({
    where: { work_request_id: wr.id },
    select: { id: true },
  });
  await prisma.notification
    .updateMany({
      where: {
        dedupe_key: { in: allBids.map((b) => `work.proposal_received:${b.id}`) },
        resolved_at: null,
      },
      data: { resolved_at: new Date() },
    })
    .catch(() => {});

  return {
    workRequestId: wr.id,
    workRequestLineId: lineId,
    providerPersonId: input.providerPersonId,
    providerBidId: winner.id,
    math,
    notSelected: losers.count,
    route: "PROPOSAL",
  };
}

/**
 * ⚠⚠⚠ ROUTE B — DIRECT ASSIGNMENT. **A FIRST-CLASS PATH, NOT A FALLBACK**
 * (item 3). No proposal, no invite, no interview, no test.
 *
 * ⚠⚠ THE BUYER SUPPLIES THE RATE HERE, AND THAT IS THE DIFFERENCE BETWEEN THE
 * TWO ROUTES RATHER THAN A HOLE IN THIS ONE: nobody proposed, so there is no
 * provider-stated rate to read. ⚠ On Route A the buyer typing a rate would
 * overwrite the provider's own; on Route B it is the only number that exists,
 * and the provider still has to ACCEPT the work order it produces (WS-D).
 *
 * ⚠⚠⚠ MEASURED AT THE PREMISE CHECK, AND IT IS WHY THIS FUNCTION EXISTS:
 * **no code path attached a provider to a work request directly.** This is it.
 */
export async function assignProviderDirectly(
  viewer: Viewer,
  input: {
    workRequestId: string;
    providerPersonId: string;
    unitPriceCents: number;
    uom?: string | null;
    /** ⚠ Scott's WR_LINE *Recruiter ID* — set when a recruiter placed them. */
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

  /* ⚠ The provider must be a real person with an account — a direct assignment
     to a row nobody can sign in as is a work order that can never be accepted. */
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
    providerBidId: null,
    unitPriceCents: input.unitPriceCents,
    uom: input.uom ?? null,
    recruiterPersonId: input.recruiterPersonId ?? null,
    route: "DIRECT",
  });

  await prisma.workRequest.update({ where: { id: wr.id }, data: { status: "ASSIGNED" } });

  return {
    workRequestId: wr.id,
    workRequestLineId: lineId,
    providerPersonId: input.providerPersonId,
    providerBidId: null,
    math,
    notSelected: 0,
    route: "DIRECT",
  };
}

/**
 * ⚠⚠⚠ RULING 17 — **SELECTION IS REVERSIBLE UNTIL THE WORK ORDER IS CREATED.**
 *
 * ⚠ SCOTT, 2026-09-24: *"selection is reversible until the work order is
 * created, and creating it moves the work request's status."*
 *
 * ⚠⚠ MEASURED BEFORE BUILDING IT, AS WS-C ITEM 4 REQUIRES — **the models CAN
 * express this, and here is exactly how:** `WorkRequestLine.work_order_id` is
 * nullable, so "has an order" is a readable fact rather than an inference;
 * `ProviderBidStatus` carries both `AWARDED` and `NOT_SELECTED`, so an award can
 * be walked back to `SUBMITTED`; and `WorkRequestStatus` has `POSTED` to return
 * to. ⚠⚠⚠ **NOTHING HERE IS INVENTED — no reversal column was added.**
 *
 * ⚠ The line is kept and re-pointed rather than deleted, for the reason every
 * other writer in this chain keeps its row: a line that vanishes reads as though
 * the buyer never chose anybody.
 */
export async function reverseSelection(
  viewer: Viewer,
  workRequestId: string
): Promise<{ reopened: number }> {
  const me = await ownPerson(viewer);
  const wr = await buyerRequest(workRequestId, me.id);

  /* ⚠⚠⚠ THE FENCE, READ FROM THE LINE RATHER THAN FROM THE HEADER'S STATUS.
     The status is a summary; `work_order_id` is the fact. */
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

  /* ⚠ Back to the state before the choice: the award returns to `SUBMITTED` and
     so does every proposal the choice closed. ⚠⚠ A `WITHDRAWN` or `DECLINED`
     one is NOT revived — the provider ended those, not the buyer. */
  const reopened = await prisma.providerBid.updateMany({
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
