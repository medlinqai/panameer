import { memberVisibleWhere } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notifications";
import type { Viewer } from "@/lib/access";

export const MAX_BODY = 4000;

export type MessageDenial =
  | "SELF"
  | "NOT_CONNECTED"
  | "PENDING"
  | "DECLINED"
  | "UNAVAILABLE"
  | "NOT_A_MEMBER";

export type MessagePermission =
  | { ok: true }
  | { ok: false; reason: MessageDenial; message: string };

export const DENIAL_COPY: Record<MessageDenial, string> = {
  SELF: "This is you.",
  NOT_CONNECTED:
    "You can message someone once you're colleagues. Send a colleague request first — they'll need to accept it.",
  PENDING:
    "Your colleague request is still waiting on them. You'll be able to message once they accept.",
  DECLINED: "You can't message this member.",
  UNAVAILABLE:
    "This member has turned off messages. Their profile still shows how else to reach them.",
  NOT_A_MEMBER: "This person doesn't have an account you can message.",
};

function deny(reason: MessageDenial): MessagePermission {
  return { ok: false, reason, message: DENIAL_COPY[reason] };
}

export async function canMessage(
  viewer: Viewer,
  otherUserId: string
): Promise<MessagePermission> {
  if (viewer.userId === otherUserId) return deny("SELF");

  const other = await prisma.user.findUnique({
    where: { id: otherUserId },
    select: {
      id: true,
      person: { select: { providerProfile: { select: { available_for_messages: true } } } },
    },
  });
  if (!other) return deny("NOT_A_MEMBER");

  const rel = await prisma.connection.findFirst({
    where: {
      kind: "COLLEAGUE",
      OR: [
        { from_user_id: viewer.userId, to_user_id: otherUserId },
        { from_user_id: otherUserId, to_user_id: viewer.userId },
      ],
    },
    select: { status: true },
  });

  if (!rel) return deny("NOT_CONNECTED");
  if (rel.status === "PENDING") return deny("PENDING");
  if (rel.status === "DECLINED") return deny("DECLINED");

  const available = other.person?.providerProfile?.available_for_messages;
  if (available === false) return deny("UNAVAILABLE");

  return { ok: true };
}

export class MessageError extends Error {
  constructor(
    message: string,
    public code: MessageDenial | "EMPTY" | "TOO_LONG"
  ) {
    super(message);
    this.name = "MessageError";
  }
}

export async function sendMessage(viewer: Viewer, toUserId: string, body: string) {
  const text = body.trim();
  if (!text) throw new MessageError("Write something first.", "EMPTY");
  if (text.length > MAX_BODY)
    throw new MessageError(`Messages are limited to ${MAX_BODY} characters.`, "TOO_LONG");

  const permission = await canMessage(viewer, toUserId);
  if (!permission.ok) throw new MessageError(permission.message, permission.reason);

  const row = await prisma.message.create({
    data: { from_user_id: viewer.userId, to_user_id: toUserId, body: text },
    select: { id: true, created_at: true },
  });

  /*
    ⚠⚠ IN-APP ONLY, AND NO EMAIL CHANNEL IS DECLARED HERE.

    `notify()` is the ONE write path and it derives channels from the category's
    own preferences — this call adds none. ⚠ REPORTED RATHER THAN SILENTLY
    CHANGED: the shipped `message.received` CATEGORY defaults to `email: true`,
    so `notify` will stamp `suppressed_reason: "email_not_configured"` on the
    row while still delivering in-app. That is already honest — the delivery
    layer records every channel that could not fire — and re-pointing a shipped
    category default is a decision nobody has made.

    ⚠ IT NEVER THROWS INTO THIS PATH. `notify` catches its own failures by
    contract: a notification is a side effect of the message, never a condition
    of it. A failed notification must not lose somebody's message.

    ⚠ NO `dedupeKey`. Two messages from the same person are two events; deduping
    them would silently swallow the second.
  */
  const recipient = await prisma.person.findFirst({
    where: { user_id: toUserId },
    select: { id: true },
  });
  const sender = await prisma.person.findFirst({
    where: { user_id: viewer.userId },
    select: { first_name: true, last_name: true },
  });
  if (recipient) {
    await notify({
      event: "message.received",
      personId: recipient.id,
      entityType: "message",
      entityId: row.id,
      vars: {
        senderName: sender ? `${sender.first_name} ${sender.last_name}`.trim() : "someone",
      },
    });
  }

  return row;
}

export type ConversationSummary = {
  otherUserId: string;
  name: string;
  photoUrl: string | null;
  title: string | null;
  lastBody: string;
  lastAt: Date;
  /** ⚠ Unread means addressed TO me and unread. My own sent rows never count. */
  unread: number;
};

/**
 * ⚠ THE CONVERSATION LIST IS DERIVED FROM THE PAIRS, because there is no thread
 * row to read. Every message the viewer is either end of, folded by "the other
 * person", newest first.
 *
 * ⚠ NOT PAGINATED, AND THAT IS A KNOWN LIMIT rather than an oversight: messaging
 * is colleague-only, so the list is bounded by how many colleagues somebody has.
 * It needs paging the day that stops being true.
 *
 * ── ⚠⚠⚠ THE DERIVATION IS A DELIBERATE INTERIM (`P2-ALL-E560`, 2026-09-18) ──
 *
 * SCOTT RULED THIS, AND IT WAS CHOSEN RATHER THAN SETTLED FOR. The `E560` drawer
 * lists conversations, which is exactly what a `Conversation` model would serve —
 * so the question "why is there no model?" WILL be asked again. The answer:
 *
 *   · ⚠ `E379` CHOSE *"One table. No Thread, no Participant"* DELIBERATELY. It
 *     was a decision, not an omission.
 *   · ⚠⚠ `Message` HELD **ZERO ROWS** when the drawer was built (measured
 *     2026-09-18). **A model designed now would be designed against no data and
 *     backfilled from nothing** — every shape choice a guess.
 *   · ⚠ `@@index([from_user_id, to_user_id, created_at])` ALREADY EXISTS and is
 *     what makes folding the pairs in memory reasonable.
 *
 * ⚠⚠ THE NAMED CONDITION THAT UNBLOCKS THE MODEL — do not add one before it:
 * **"IF THE DERIVATION GETS SLOW, THAT IS THE SIGNAL TO ADD IT — WITH REAL
 * MESSAGES TO SHAPE IT."** ⚠ Slow means measured, on real rows, not suspected.
 *
 * ⚠ ONE DEFINITION, TWO CALLERS: the `/messages` page and `GET /api/messages`
 * (the drawer) both come here. ⚠⚠ A SECOND DERIVATION IS THE FAILURE TO AVOID —
 * two surfaces listing conversations by different rules is the `teachesPathWhere`
 * mistake in a new place.
 */
export async function listConversations(viewer: Viewer): Promise<ConversationSummary[]> {
  const rows = await prisma.message.findMany({
    where: { OR: [{ from_user_id: viewer.userId }, { to_user_id: viewer.userId }] },
    orderBy: { created_at: "desc" },
    select: {
      from_user_id: true,
      to_user_id: true,
      body: true,
      created_at: true,
      read_at: true,
    },
  });

  const byOther = new Map<string, ConversationSummary>();
  for (const m of rows) {
    const otherUserId = m.from_user_id === viewer.userId ? m.to_user_id : m.from_user_id;
    let entry = byOther.get(otherUserId);
    if (!entry) {
      /* Rows arrive newest-first, so the first one seen IS the last message. */
      entry = {
        otherUserId,
        name: "",
        photoUrl: null,
        title: null,
        lastBody: m.body,
        lastAt: m.created_at,
        unread: 0,
      };
      byOther.set(otherUserId, entry);
    }
    if (m.to_user_id === viewer.userId && m.read_at === null) entry.unread += 1;
  }

  const people = await prisma.person.findMany({
    /* `E821` */
    where: { user_id: { in: [...byOther.keys()] }, ...memberVisibleWhere() },
    select: { user_id: true, first_name: true, last_name: true, title: true, photo_url: true },
  });
  for (const p of people) {
    const entry = p.user_id ? byOther.get(p.user_id) : undefined;
    if (!entry) continue;
    entry.name = `${p.first_name} ${p.last_name}`.trim();
    entry.title = p.title;
    entry.photoUrl = p.photo_url;
  }

  /* ⚠ A conversation with somebody who has no Person row still lists, with an
     empty name rather than being dropped — losing a real message from the list
     is worse than showing it unlabelled. */
  return [...byOther.values()].sort((a, b) => b.lastAt.getTime() - a.lastAt.getTime());
}

/** Oldest first — a conversation reads top to bottom. */
export async function getConversation(viewer: Viewer, otherUserId: string) {
  return prisma.message.findMany({
    where: {
      OR: [
        { from_user_id: viewer.userId, to_user_id: otherUserId },
        { from_user_id: otherUserId, to_user_id: viewer.userId },
      ],
    },
    orderBy: { created_at: "asc" },
    select: { id: true, from_user_id: true, body: true, created_at: true, read_at: true },
  });
}

/**
 * ⚠⚠ THE RECIPIENT'S ROWS ONLY. The `to_user_id: viewer.userId` clause is the
 * whole guarantee — without it a sender could mark their own outgoing messages
 * read and the unread count would become a number nobody set. `check:messages`
 * asserts this scope.
 */
export async function markRead(viewer: Viewer, otherUserId: string) {
  await prisma.message.updateMany({
    where: { to_user_id: viewer.userId, from_user_id: otherUserId, read_at: null },
    data: { read_at: new Date() },
  });
}

/** One number, for the tab badge. ⚠ Zero renders NOTHING — see `PageTabs`. */
export async function unreadCount(viewer: Viewer): Promise<number> {
  return prisma.message.count({
    where: { to_user_id: viewer.userId, read_at: null },
  });
}

/**
 * ── ⚠⚠⚠ DEAD SINCE `8f71ac2`. IT MATCHES NOTHING (`P2-ALL-E691`, rule 6) ────
 *
 * ⚠⚠ **IT LOOKS FOR A TAB WHOSE `href` IS `/messages`, AND THE CONNECT ROW HAS
 * NOT CONTAINED ONE SINCE `8f71ac2`** (*"`P2-J3-E557` WS-A — Connect is a room,
 * not a path"*). ⚠ **MEASURED: feeding it the live row with `unread = 7`
 * produces ZERO badges.**
 *
 * ⚠⚠⚠ **SO THIS RETURNED ITS INPUT UNCHANGED FOR WEEKS WHILE `unreadCount()`
 * RAN ON EVERY `/messages` AND `/community` PAGE LOAD.** The figure's WRITER was
 * live and its READER was dead, which is the quietest way for a number to
 * disappear: nothing errors, nothing logs, and the query still costs.
 * ⚠ **THE COUNT NOW RENDERS IN THE TITLE LINE** on `/messages` (ruling `88b`),
 * which is where 88b puts it anyway.
 *
 * ⚠⚠ **NOT DELETED, AND THE REASON IS §14: BEFORE DELETING DEAD CODE, CHECK
 * WHETHER A GATE ASSERTS A LIVE RULE AGAINST IT.** The zero rule below is live,
 * quoted by the page that replaced this, and `PageTabs` still honours `badge`
 * for any row that grows one later. ⚠ It is kept, marked, and asserted dead by
 * `check:community` so it cannot come back to life unnoticed.
 *
 * ⚠ SUPERSEDED, quoted not deleted (`E164`) — what it claimed to do:
 * //   THE UNREAD BADGE, APPLIED TO A TAB SET (P1-ALL-E379). The /community tab
 * //   row is shared by five pages, so the badge is put on here rather than in
 * //   each of them - five copies of "which tab is Messages" is five chances to
 * //   disagree.
 *
 * ⚠ ORIGINAL NOTE, STILL TRUE AND STILL THE RULE:
 *
 * The `/community` tab row is shared by five pages, so the badge is put on here
 * rather than in each of them — five copies of "which tab is Messages" is five
 * chances to disagree.
 *
 * ⚠⚠ ZERO PASSES `undefined`, NEVER `0`. The badge must not render for a person
 * with nothing unread, and `PageTabs` guards it a second time. A "0" badge
 * reports an absence as a measurement — the same fault as a fabricated `$0`
 * rate, and the same rule that keeps `declinedCount` off the page entirely.
 *
 * ⚠ PURE. It takes the count rather than reading it, so the page decides
 * whether it is worth a query for an anonymous viewer.
 */
export function tabsWithUnread<T extends { href: string; badge?: number }>(
  tabs: T[],
  unread: number
): T[] {
  if (unread <= 0) return tabs;
  return tabs.map((t) => (t.href === "/messages" ? { ...t, badge: unread } : t));
}
