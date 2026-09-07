import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
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
      return await prisma.supportTicket.create({
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
  ]);
  return message;
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
