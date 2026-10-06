import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notifications";
import type { Viewer } from "@/lib/access";

export class SupportError extends Error {
  constructor(message: string, public code: "INVALID" | "NOT_FOUND" | "FORBIDDEN") {
    super(message);
    this.name = "SupportError";
  }
}

export type AuthorSide = "user" | "panameer";

export const TICKET_STATUSES = ["Open", "In Progress", "Waiting on Reporter", "Resolved", "Closed"] as const;
export const TICKET_PRIORITIES = ["Low", "Medium", "High", "Urgent"] as const;

const TICKET_OWNER: Record<
  (typeof TICKET_STATUSES)[number],
  "panameer" | "reporter" | "done"
> = {
  Open: "panameer",
  "In Progress": "panameer",
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

export const TICKETS_TERMINAL_STATUSES = statusesOwnedBy("done");

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

/** File a ticket. Returns the row so the caller can attach a screenshot to it — */
export async function createTicket(viewer: Viewer, input: CreateTicketInput) {
  const person = await actingPerson(viewer);

  const title = input.title.trim();
  const description = input.description.trim();
  if (title.length < 3) throw new SupportError("A title is required", "INVALID");
  if (description.length < 3) throw new SupportError("A description is required", "INVALID");

  const name = [person.first_name, person.last_name].filter(Boolean).join(" ").trim();

  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      // timeline whose first line can be missing is a timeline that starts at an
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

/** Post a message on a ticket. */
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

  // A reporter may only post on their OWN ticket. The admin side is gated by
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
    // THE MESSAGE GETS AN EVENT TOO , in the SAME transaction that was
    prisma.ticketEvent.create({
      data: { ticket_id: ticketId, actor_person_id: person.id, kind: "message" },
    }),
  ]);
  return message;
}

/** One list, oldest first, interleaving events and messages — because that is how */
export type TimelineEntry = {
  id: string;
  at: Date;
  kind: string;
  actorPersonId: string | null;
  actorName: string;
  fromValue: string | null;
  toValue: string | null;
  /** Present only for `message` rows; the body lives in `TicketMessage`. */
  body: string | null;
  authorSide: string | null;
};

/** What the REPORTER may see. `assigned`/`unassigned`/`priority` are absent. */
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

  // A `message` EVENT CARRIES NO BODY — it is joined to its message by TIME
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

  // MESSAGES WITH NO EVENT — everything posted BEFORE — still show.
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

  /* ONE QUERY FOR EVERY ACTOR, resolved at render as promised above. */
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
    /* A missing actor renders as `Panameer`, never as a guess at a person. */
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

/** THE ADMIN SIDE */
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

export async function updateTicket(viewer: Viewer, ticketId: string, input: TicketUpdate) {
  const person = await actingPerson(viewer);
  const existing = await prisma.supportTicket.findUnique({
    where: { id: ticketId },
    select: {
      id: true,
      date_solved: true,
      status: true,
      reporter_person_id: true,
      title: true,
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

  const closing = TICKETS_TERMINAL_STATUSES.includes(
    input.status as (typeof TICKETS_TERMINAL_STATUSES)[number],
  );

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
