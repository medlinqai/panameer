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

  // In-app always; email per the Messages category (on by default), batched in notifications.ts (R-E018).
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
  /** Unread means addressed TO me and unread. My own sent rows never count. */
  unread: number;
};

/** THE CONVERSATION LIST IS DERIVED FROM THE PAIRS, because there is no thread */
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

  // A conversation with somebody who has no Person row still lists, with an
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

/** THE RECIPIENT'S ROWS ONLY. The `to_user_id: viewer.userId` clause is the */
export async function markRead(viewer: Viewer, otherUserId: string) {
  await prisma.message.updateMany({
    where: { to_user_id: viewer.userId, from_user_id: otherUserId, read_at: null },
    data: { read_at: new Date() },
  });
}

/** One number, for the tab badge. Zero renders NOTHING — see `PageTabs`. */
export async function unreadCount(viewer: Viewer): Promise<number> {
  return prisma.message.count({
    where: { to_user_id: viewer.userId, read_at: null },
  });
}

/** DEAD SINCE `8f71ac2`. IT MATCHES NOTHING , rule 6) */
export function tabsWithUnread<T extends { href: string; badge?: number }>(
  tabs: T[],
  unread: number
): T[] {
  if (unread <= 0) return tabs;
  return tabs.map((t) => (t.href === "/messages" ? { ...t, badge: unread } : t));
}
