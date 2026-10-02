import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notifications";
import type { Viewer } from "@/lib/access";

/**
 * Support ticketing (`P2-J1.1-E032`).
 *
 * Ported from Medlinq, adapted to Panameer's backbone. The models are
 * scalar-UUID / no-FK / single-drop reversible — see the block above
 * `model SupportTicket` for why that property is kept.
 *
 * ⚠ EVERY WRITE HERE IS OWNER-SCOPED FROM THE SESSION. No route accepts a
 * reporter id, an author id or a person id from the client.
 */

export class SupportError extends Error {
  constructor(message: string, public code: "INVALID" | "NOT_FOUND" | "FORBIDDEN") {
    super(message);
    this.name = "SupportError";
  }
}

/** ⚠ Panameer's two sides, where Medlinq's were `'company' | 'medlinq'`. */
export type AuthorSide = "user" | "panameer";

export const TICKET_STATUSES = ["Open", "In Progress", "Waiting on Reporter", "Resolved", "Closed"] as const;
export const TICKET_PRIORITIES = ["Low", "Medium", "High", "Urgent"] as const;

/**
 * ── ⚠⚠⚠ WHICH TICKETS ARE PANAMEER'S WORK (ruling 80b) ────────────────────
 *
 * ⚠⚠ **RULING 80b, VERBATIM:** *"a list nobody opens is no better than a
 * notification everybody muted… The fix is not a notification. It is a COUNT,
 * somewhere an admin already is."* ⚠ The count needs a definition of what it
 * counts, and **this is that definition, in one place** (`E585`).
 *
 * ⚠⚠⚠ **THE FIVE STATUSES SPLIT THREE WAYS, NOT TWO, AND THE MIDDLE BUCKET IS
 * THE WHOLE POINT:** `Waiting on Reporter` is an OPEN ticket that is **not
 * Panameer's move**. ⚠ Counting it would inflate the figure with work an admin
 * cannot do, which is the opposite of a queue — the number would stop falling
 * when they worked it, so they would stop reading it.
 *
 * ⚠⚠ **SO THE TILE IS NOT LABELLED "Open Tickets", AND THAT IS DELIBERATE:**
 * `Open` is also one of the five STATUS VALUES, rendered as a pill on
 * `/admin/support`. ⚠⚠⚠ **A tile reading "Open Tickets: 2" beside a list
 * showing one pill that says `Open` is one word doing two jobs** — the same
 * collision that kept the Account menu from being called "the Settings menu".
 * The label names the ROLE's work instead.
 *
 * ── ⚠⚠⚠ EXHAUSTIVE BY THE TYPE, NOT BY A GATE ─────────────────────────────
 *
 * ⚠⚠ **`TICKET_OWNER` IS A `Record` KEYED BY EVERY STATUS, SO A SIXTH STATUS IS
 * A COMPILE ERROR UNTIL SOMEBODY SAYS WHOSE MOVE IT IS.** ⚠ Both sets are
 * DERIVED from it, so the buckets cannot drift apart or overlap.
 * ⚠⚠⚠ **THIS IS THE PATTERN SCOTT ASKED FOR REPEATED** — *"a forgetful sender
 * being a compile error rather than a silent gap is worth more than any check we
 * could write after the fact"* — and it is why there is no `check:support-count`.
 * ⚠ **I had written that gate's name into this docblock before building it.**
 * A stated rule that nothing enforces is the half the next person implements
 * (2026-09-23 rule 6), so the claim became a type rather than a promise.
 * ⚠ SUPERSEDED, quoted not deleted (`E164`) — the claim as written:
 * //   ⚠ EXHAUSTIVE BY CONSTRUCTION: AWAITING_PANAMEER + TICKETS_TERMINAL +
 * //   "Waiting on Reporter" is all five, and check:support-count asserts it.
 */
const TICKET_OWNER: Record<
  (typeof TICKET_STATUSES)[number],
  "panameer" | "reporter" | "done"
> = {
  Open: "panameer",
  "In Progress": "panameer",
  /* ⚠ OPEN, BUT NOT OURS — the ticket is live and the ball is with the member. */
  "Waiting on Reporter": "reporter",
  Resolved: "done",
  Closed: "done",
};

function statusesOwnedBy(owner: "panameer" | "reporter" | "done") {
  return (Object.keys(TICKET_OWNER) as (typeof TICKET_STATUSES)[number][]).filter(
    (s) => TICKET_OWNER[s] === owner,
  );
}

export const AWAITING_PANAMEER_STATUSES = statusesOwnedBy("panameer");

/**
 * ⚠ **CLOSED IS STATED ONCE NOW.** `updateTicket` read the pair inline —
 * `input.status === "Resolved" || input.status === "Closed"` — while its own
 * docblock stated the same rule in prose. ⚠⚠ One concept in three places
 * (`E585`); `date_solved` and a future status could have disagreed.
 * ⚠ SUPERSEDED, quoted not deleted (`E164`):
 * //   const closing = input.status === "Resolved" || input.status === "Closed";
 */
export const TICKETS_TERMINAL_STATUSES = statusesOwnedBy("done");

/**
 * ⚠ WHAT A PERSON QUOTES BACK. Crockford-ish alphabet with the characters that
 * get misread aloud removed (`I`, `O`, `0`, `1`), because the entire point of a
 * short code is that somebody can read it down a phone or paste it from a note.
 */
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function newTicketCode(): string {
  const bytes = randomBytes(6);
  let out = "";
  for (const b of bytes) out += CODE_ALPHABET[b % CODE_ALPHABET.length];
  return `PAN-${out}`;
}

/** Resolve the acting person from the SESSION. Never from input. */
async function actingPerson(viewer: Viewer) {
  const person = await prisma.person.findFirst({
    where: { user_id: viewer.userId },
    select: {
      id: true,
      first_name: true,
      last_name: true,
      company: { select: { p_account_id: true } },
      user: { select: { email: true } },
    },
  });
  if (!person) throw new SupportError("This account has no person record", "INVALID");
  return person;
}

export type CreateTicketInput = {
  application: string;
  title: string;
  description: string;
  howFound?: string | null;
  priority?: string | null;
};

/**
 * File a ticket. Returns the row so the caller can attach a screenshot to it —
 * the object path is foldered by ticket id, so the ticket must exist first.
 *
 * ⚠ A UNIQUE `ticket_code` COLLISION IS RETRIED RATHER THAN THROWN. 32^6 makes
 * it vanishingly unlikely, but "vanishingly unlikely" is not "impossible", and
 * losing a bug report to a code clash would be its own instance of the defect
 * this whole feature exists to fix.
 */
export async function createTicket(viewer: Viewer, input: CreateTicketInput) {
  const person = await actingPerson(viewer);

  const title = input.title.trim();
  const description = input.description.trim();
  if (title.length < 3) throw new SupportError("A title is required", "INVALID");
  if (description.length < 3) throw new SupportError("A description is required", "INVALID");

  const name = [person.first_name, person.last_name].filter(Boolean).join(" ").trim();

  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      /* ⚠⚠ `filed` IS WRITTEN WITH THE TICKET, IN ONE TRANSACTION (`E761`). A
         timeline whose first line can be missing is a timeline that starts at an
         arbitrary point. ⚠ The retry loop below re-runs the WHOLE transaction on a
         `ticket_code` clash, so a retried attempt cannot leave an orphan event. */
      return await prisma.$transaction(async (tx) => {
        const created = await tx.supportTicket.create({
        data: {
          ticket_code: newTicketCode(),
          p_account_id: person.company?.p_account_id ?? null,
          reporter_person_id: person.id,
          reporter_name: name || person.user?.email || "Unknown",
          reporter_email: person.user?.email ?? "",
          application: input.application,
          title,
          description,
          how_found: input.howFound?.trim() || null,
          priority: input.priority || "Medium",
          status: "Open",
          date_found: new Date(),
          last_message_at: new Date(),
        },
        select: { id: true, ticket_code: true },
        });
        await tx.ticketEvent.create({
          data: { ticket_id: created.id, actor_person_id: person.id, kind: "filed" },
        });
        return created;
      });
    } catch (e) {
      const code = (e as { code?: string }).code;
      if (code === "P2002" && attempt < 4) continue; // ticket_code clash — retry
      throw e;
    }
  }
  throw new SupportError("Could not file that ticket", "INVALID");
}

/** Attach a stored screenshot path to a ticket the caller just created. */
export async function setTicketScreenshot(ticketId: string, objectPath: string) {
  await prisma.supportTicket.update({
    where: { id: ticketId },
    data: { screenshot_path: objectPath },
  });
}

/**
 * Post a message on a ticket.
 *
 * ⚠⚠ `side` IS DECIDED BY THE CALLER'S CAPABILITY, NEVER BY THE REQUEST BODY.
 * A reporter cannot post as `panameer` and an admin replying is always
 * `panameer` — otherwise the thread's own record of who said what is
 * client-controlled, which makes it evidence of nothing.
 * ⚠ `last_message_at` IS BUMPED HERE so the admin list sorts by recency. That
 * is the column's whole reason to exist.
 */
export async function postMessage(
  viewer: Viewer,
  ticketId: string,
  body: string,
  side: AuthorSide
) {
  const person = await actingPerson(viewer);
  const text = body.trim();
  if (!text) throw new SupportError("A message is required", "INVALID");

  const ticket = await prisma.supportTicket.findUnique({
    where: { id: ticketId },
    select: { id: true, reporter_person_id: true },
  });
  if (!ticket) throw new SupportError("That ticket no longer exists", "NOT_FOUND");

  /* ⚠ A reporter may only post on their OWN ticket. The admin side is gated by
     `canAdminister` at the route; this is the other half. */
  if (side === "user" && ticket.reporter_person_id !== person.id) {
    throw new SupportError("That isn't your ticket", "FORBIDDEN");
  }

  const [message] = await prisma.$transaction([
    prisma.ticketMessage.create({
      data: { ticket_id: ticketId, author_person_id: person.id, author_side: side, body: text },
      select: { id: true },
    }),
    prisma.supportTicket.update({
      where: { id: ticketId },
      data: { last_message_at: new Date() },
    }),
    /* ⚠⚠ THE MESSAGE GETS AN EVENT TOO (`E761`), in the SAME transaction that was
       already here. ⚠ The timeline interleaves events and messages, so a message
       without an event would appear in the thread and vanish from the history —
       two views of one ticket that disagree. ⚠⚠ The body is NOT copied into the
       event: one definition lives in `TicketMessage`, and the timeline joins. */
    prisma.ticketEvent.create({
      data: { ticket_id: ticketId, actor_person_id: person.id, kind: "message" },
    }),
  ]);
  return message;
}

/**
 * ── ⚠⚠⚠ THE TIMELINE (`P2-ALL-E761`) ────────────────────────────────────────
 *
 * One list, oldest first, interleaving events and messages — because that is how
 * a person reads a ticket: *"filed … assigned … asked a question … resolved."*
 *
 * ⚠⚠ **THE REPORTER SEES LESS, AND IT IS ENFORCED HERE RATHER THAN IN THE
 * TEMPLATE.** `forReporter` filters at the QUERY, so a future page that forgets
 * to check cannot leak an assignee's name or a priority the reporter was never
 * shown. ⚠ Scott's rule: the reporter gets **status changes and messages only**.
 *
 * ⚠ **ACTOR NAMES ARE RESOLVED AT RENDER, FROM IDS.** A name stored at write time
 * would freeze somebody's old name into the record — and the same person's name
 * would then differ between two rows of one timeline.
 */
export type TimelineEntry = {
  id: string;
  at: Date;
  kind: string;
  actorPersonId: string | null;
  actorName: string;
  fromValue: string | null;
  toValue: string | null;
  /** ⚠ Present only for `message` rows; the body lives in `TicketMessage`. */
  body: string | null;
  authorSide: string | null;
};

/** ⚠ What the REPORTER may see. `assigned`/`unassigned`/`priority` are absent. */
const REPORTER_KINDS = ["filed", "status", "message"];

export async function ticketTimeline(
  ticketId: string,
  opts: { forReporter?: boolean } = {}
): Promise<TimelineEntry[]> {
  const where = opts.forReporter
    ? { ticket_id: ticketId, kind: { in: REPORTER_KINDS } }
    : { ticket_id: ticketId };

  const [events, messages] = await Promise.all([
    prisma.ticketEvent.findMany({ where, orderBy: { created_at: "asc" } }),
    prisma.ticketMessage.findMany({
      where: { ticket_id: ticketId },
      orderBy: { created_at: "asc" },
      select: { id: true, author_person_id: true, author_side: true, body: true, created_at: true },
    }),
  ]);

  /* ⚠⚠ A `message` EVENT CARRIES NO BODY — it is joined to its message by TIME
     AND AUTHOR, because the two rows are written in one transaction and share an
     instant. ⚠ Messages that predate `E761` have no event; they are rendered from
     the message list directly so nothing from before the change disappears. */
  const used = new Set<string>();
  const rows: TimelineEntry[] = [];

  for (const e of events) {
    if (e.kind === "message") {
      const m = messages.find(
        (x) =>
          !used.has(x.id) &&
          x.author_person_id === e.actor_person_id &&
          Math.abs(x.created_at.getTime() - e.created_at.getTime()) < 5000
      );
      if (m) used.add(m.id);
      rows.push({
        id: e.id,
        at: e.created_at,
        kind: "message",
        actorPersonId: e.actor_person_id,
        actorName: "",
        fromValue: null,
        toValue: null,
        body: m?.body ?? null,
        authorSide: m?.author_side ?? null,
      });
      continue;
    }
    rows.push({
      id: e.id,
      at: e.created_at,
      kind: e.kind,
      actorPersonId: e.actor_person_id,
      actorName: "",
      fromValue: e.from_value,
      toValue: e.to_value,
      body: null,
      authorSide: null,
    });
  }

  /* ⚠⚠⚠ MESSAGES WITH NO EVENT — everything posted BEFORE `E761` — still show.
     ⚠ Scott's rule: *"no backfill can be honest"*, and that cuts both ways. We do
     not invent events for the past, and we do not hide what we already have. */
  for (const m of messages) {
    if (used.has(m.id)) continue;
    rows.push({
      id: m.id,
      at: m.created_at,
      kind: "message",
      actorPersonId: m.author_person_id,
      actorName: "",
      fromValue: null,
      toValue: null,
      body: m.body,
      authorSide: m.author_side,
    });
  }

  rows.sort((a, b) => a.at.getTime() - b.at.getTime());

  /* ⚠ ONE QUERY FOR EVERY ACTOR, resolved at render as promised above. */
  const ids = [...new Set(rows.map((r) => r.actorPersonId).filter((x): x is string => !!x))];
  const people = ids.length
    ? await prisma.person.findMany({
        where: { id: { in: ids } },
        select: { id: true, first_name: true, last_name: true },
      })
    : [];
  const nameById = new Map(
    people.map((p) => [p.id, [p.first_name, p.last_name].filter(Boolean).join(" ").trim()])
  );
  for (const r of rows) {
    /* ⚠ A missing actor renders as `Panameer`, never as a guess at a person. */
    r.actorName = (r.actorPersonId && nameById.get(r.actorPersonId)) || "Panameer";
  }
  return rows;
}

/** The reporter's own tickets, newest activity first. */
export async function listOwnTickets(viewer: Viewer) {
  const person = await actingPerson(viewer);
  return prisma.supportTicket.findMany({
    where: { reporter_person_id: person.id },
    orderBy: [{ last_message_at: "desc" }, { created_at: "desc" }],
    select: {
      id: true, ticket_code: true, title: true, application: true,
      status: true, priority: true, created_at: true, last_message_at: true,
    },
  });
}

/** One ticket plus its thread — scoped to the reporter unless `asAdmin`. */
export async function getTicket(viewer: Viewer, ticketId: string, asAdmin = false) {
  const person = await actingPerson(viewer);
  const ticket = await prisma.supportTicket.findUnique({ where: { id: ticketId } });
  if (!ticket) return null;
  if (!asAdmin && ticket.reporter_person_id !== person.id) return null;

  const messages = await prisma.ticketMessage.findMany({
    where: { ticket_id: ticketId },
    orderBy: { created_at: "asc" },
  });
  return { ticket, messages };
}

/**
 * ── THE ADMIN SIDE ──────────────────────────────────────────────────────────
 * Every function below is called only from surfaces already behind
 * `canAdminister` — `/admin/*` via route-access, the admin layout's `guardPage`,
 * and `guardApi("canAdminister")` on the routes. Three layers, per the lesson
 * `E046` paid for.
 */

/** The triage list. Ordered by recency of ACTIVITY, which is why the column exists. */
export async function listAllTickets() {
  return prisma.supportTicket.findMany({
    orderBy: [{ last_message_at: "desc" }, { created_at: "desc" }],
    select: {
      id: true, ticket_code: true, title: true, application: true,
      status: true, priority: true, reporter_name: true, reporter_email: true,
      created_at: true, last_message_at: true, assignee_person_id: true,
    },
  });
}

/**
 * ── ⚠⚠⚠ THE FIGURE AN ADMIN PASSES ANYWAY (ruling 80b) ────────────────────
 *
 * ⚠ **THE LIST ALREADY EXISTED AND THAT WAS THE PROBLEM.** `/admin/support` and
 * its `[ticketId]` detail route are built, and `ADMIN_NAV` carries `Support
 * Center`, so ruling 80's admin half was **69a — something else is already doing
 * it.** ⚠⚠ What was missing is the half 80b added: *"if the admin surface has no
 * figure row, a list there is a door nobody knows to open — rule 5's cousin."*
 * ⚠ Measured before building: `/admin`'s `TileRow` held four tiles and **no
 * ticket figure anywhere on the page**, nor in its `VolumeFooter`.
 *
 * ⚠⚠ **IT PASSES THE WRITER TEST CLEANLY (counting rule 1)** — `createTicket`
 * writes `status: "Open"` and `updateTicket` moves it, so both ends of the chain
 * have a writer. ⚠⚠⚠ **AND IT IS NOT A ZERO STATE: measured 2026-09-25 —
 * 2 `Open`, 0 `In Progress`, 1 `Resolved`.** ⚠ **A measured figure renders as a
 * number in ink, never a dash** (ruling 53c), so this returns a `number` and not
 * `number | null`: there is no uncountable case to represent.
 *
 * ⚠ **NOTHING TO MUTE.** No recipient, no `person_id`, no preference row — which
 * is the whole reason 80b chose a count over a notification.
 */
export async function countTicketsAwaitingPanameer(): Promise<number> {
  return prisma.supportTicket.count({
    where: { status: { in: [...AWAITING_PANAMEER_STATUSES] } },
  });
}

export type TicketUpdate = {
  status?: string | null;
  priority?: string | null;
  assignToSelf?: boolean;
  unassign?: boolean;
  resolution?: string | null;
};

/**
 * Triage a ticket.
 *
 * ⚠ `assignToSelf` RATHER THAN AN ASSIGNEE ID, and that is not laziness: there
 * is exactly one Panameer admin today — the same fact that made Scott defer
 * `TicketHelper` — so an id parameter would be an unused surface accepting a
 * person id from the client. When there is a second admin this grows a picker.
 * ⚠ `date_solved` IS DERIVED FROM THE STATUS, never sent: it is set the first
 * time a ticket reaches Resolved/Closed and cleared if it reopens, so the column
 * and the status cannot disagree.
 */
export async function updateTicket(viewer: Viewer, ticketId: string, input: TicketUpdate) {
  const person = await actingPerson(viewer);
  const existing = await prisma.supportTicket.findUnique({
    where: { id: ticketId },
    /* ⚠ `status`, `reporter_person_id` and `title` are read for the ruling-82a
       notification below — the PRIOR status is the only way to know whether the
       status actually moved, and a notification that fires on an unchanged
       status is the echo 82a rejects. */
    select: {
      id: true,
      date_solved: true,
      status: true,
      reporter_person_id: true,
      title: true,
      /* ⚠ `P2-ALL-E761` — the PRIOR assignee and priority, read for `from_value`
         on the history events below. ⚠⚠ The status was already here for ruling
         82a's notification, and that comparison is REUSED rather than duplicated:
         one "did it actually move" test, not two that can disagree (`E585`). */
      assignee_person_id: true,
      priority: true,
    },
  });
  if (!existing) throw new SupportError("That ticket no longer exists", "NOT_FOUND");

  if (input.status && !TICKET_STATUSES.includes(input.status as (typeof TICKET_STATUSES)[number])) {
    throw new SupportError("Unknown status", "INVALID");
  }
  if (input.priority && !TICKET_PRIORITIES.includes(input.priority as (typeof TICKET_PRIORITIES)[number])) {
    throw new SupportError("Unknown priority", "INVALID");
  }

  /* ⚠ ONE DEFINITION — see `TICKETS_TERMINAL_STATUSES` for what this replaced. */
  const closing = TICKETS_TERMINAL_STATUSES.includes(
    input.status as (typeof TICKETS_TERMINAL_STATUSES)[number],
  );

  /*
    ── ⚠⚠⚠ THE CHANGE AND ITS HISTORY LAND TOGETHER (`P2-ALL-E761`) ───────────

    ⚠ Scott, working `PAN-CTXFTX`: *"I assigned it to me and asked a question.
    Want to see that history on the ticket."*

    ⚠⚠ **IT IS A TRANSACTION, AND THAT IS A DELIBERATE CHANGE TO A LIVE WRITE
    PATH.** This was a bare `prisma.supportTicket.update`. A history written
    outside the transaction can disagree with the row it describes — an event
    saying *"Open → In Progress"* beside a ticket still reading `Open` is worse
    than no history, because it is a record that lies.

    ⚠⚠⚠ **AN EVENT IS WRITTEN ONLY WHEN THE VALUE ACTUALLY MOVED.** A save that
    re-submits the same status is not a status change, and a timeline full of
    *"Open → Open"* is the echo ruling 82a already rejected for notifications.
    ⚠ The status comparison is the SAME ONE 82a uses, read from `existing` — one
    definition, not two that can drift (`E585`).
  */
  const events: {
    kind: string;
    from_value: string | null;
    to_value: string | null;
  }[] = [];

  if (input.status && input.status !== existing.status) {
    events.push({ kind: "status", from_value: existing.status, to_value: input.status });
  }
  if (input.priority && input.priority !== existing.priority) {
    events.push({ kind: "priority", from_value: existing.priority, to_value: input.priority });
  }
  /* ⚠ Assigning to yourself when you already hold it is not an assignment. */
  if (input.assignToSelf && existing.assignee_person_id !== person.id) {
    events.push({
      kind: "assigned",
      from_value: existing.assignee_person_id,
      to_value: person.id,
    });
  }
  if (input.unassign && existing.assignee_person_id) {
    events.push({ kind: "unassigned", from_value: existing.assignee_person_id, to_value: null });
  }

  const updated = await prisma.$transaction(async (tx) => {
    const row = await tx.supportTicket.update({
      where: { id: ticketId },
      data: {
        ...(input.status ? { status: input.status } : {}),
        ...(input.priority ? { priority: input.priority } : {}),
        ...(input.assignToSelf ? { assignee_person_id: person.id } : {}),
        ...(input.unassign ? { assignee_person_id: null } : {}),
        ...(input.resolution !== undefined ? { resolution_description: input.resolution || null } : {}),
        ...(input.status
          ? { date_solved: closing ? existing.date_solved ?? new Date() : null }
          : {}),
      },
      select: { id: true },
    });
    for (const e of events) {
      await tx.ticketEvent.create({
        data: { ticket_id: ticketId, actor_person_id: person.id, ...e },
      });
    }
    return row;
  });

  /*
    ── ⚠⚠⚠ RULING 82a — THE EVENT IS THE ANSWER, NOT THE CREATION ───────────

    ⚠ Scott, 2026-09-25: *"Notifying the creator that they created something
    tells them what they just pressed."* ⚠⚠ So the notification is here, on the
    STATUS CHANGE, and not in `createTicket`: filing a ticket ends on a
    confirmation the member is already looking at, while **the answer arrives on
    Panameer's side, days later, when they are somewhere else.**

    ⚠⚠ THREE GUARDS, AND EACH ONE REFUSES A DIFFERENT ECHO:
     1. ⚠ **ONLY WHEN THE STATUS ACTUALLY MOVED.** A priority edit, an
        assignment or a resolution-note save changes the row without changing
        anything the reporter is waiting on. ⚠⚠ Comparing against `existing`
        also covers **re-saving the same status**, which is why the prior value
        is read rather than assumed from `input.status` being present.
     2. ⚠⚠⚠ **NEVER TO THE PERSON WHO PRESSED THE BUTTON.** An admin who files a
        ticket and then triages it is the exact case ruling 82a names — and it
        is real here, not hypothetical: one of the three live tickets was
        reported by an account that can also administer.
     3. ⚠ **DEDUPED PER TICKET PER STATUS**, so a double-submit or a bounce
        between two statuses and back cannot fan out.

    ⚠⚠ `notify()` NEVER THROWS INTO THIS CALLER — it catches, logs and
    continues, by its own contract: *"a failed notification must not roll back"*
    the thing that happened. ⚠ It is awaited so the write is ordered, not so the
    triage depends on it.
    ⚠⚠⚠ **THIS SENDS NO EMAIL, AND MY EARLIER WARNING THAT IT DID WAS WRONG.**
    The category ships `email: true` under ruling 34b (I chose `false` and
    `check:notify-prefs` was right to fail the build) — ⚠⚠ **but `notify()`
    RECORDS INTENT AND DOES NOT SEND.** It imports no sender, and no path turns
    a `Notification` row into an email. **This writes an in-app row. That is
    all it does.**
    ⚠ SUPERSEDED, quoted not deleted (`E164`) — my false warning:
    //   THIS SENDS REAL EMAIL … the next status move mails a real reporter at
    //   a real address.
    ⚠⚠ **THE PRODUCT-WIDE GAP IS THE INVERSE AND IS FILED AS `E658`:** the
    settings screen shows Email as live for all 17 categories and nothing
    delivers. See `notification-categories.ts`.
  */
  const statusMoved = Boolean(input.status) && input.status !== existing.status;
  const isOwnTicket = existing.reporter_person_id === person.id;
  if (statusMoved && !isOwnTicket && existing.reporter_person_id) {
    await notify({
      event: "support.ticket_status",
      personId: existing.reporter_person_id,
      entityType: "SupportTicket",
      entityId: ticketId,
      dedupeKey: `support.ticket_status:${ticketId}:${input.status}`,
      vars: { status: input.status!, ticketTitle: existing.title, ticketId },
    });
  }

  return updated;
}
