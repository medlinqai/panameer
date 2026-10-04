import { prisma } from "@/lib/prisma";

// R-E018: at most one message email per sender → recipient every 15 minutes.
export const MESSAGE_EMAIL_WINDOW_MS = 15 * 60 * 1000;

export type MessageEmailDecision = { hold: true } | { hold: false; count: number };

/** Pure rule: hold inside the window; otherwise mail, covering every unread message since the last mail. */
export function decideMessageEmail(lastEmailAt: Date | null, now: Date, unreadSince: number): MessageEmailDecision {
  if (lastEmailAt && now.getTime() - lastEmailAt.getTime() < MESSAGE_EMAIL_WINDOW_MS) return { hold: true };
  return { hold: false, count: Math.max(1, unreadSince) };
}

/** Reads the facts for one `message.received` notification and applies the rule. */
export async function messageEmailFor(
  notificationId: string,
  personId: string,
  now = new Date()
): Promise<(MessageEmailDecision & { senderName: string | null }) | null> {
  const n = await prisma.notification.findUnique({ where: { id: notificationId }, select: { entity_id: true } });
  if (!n?.entity_id) return null;
  const msg = await prisma.message.findUnique({
    where: { id: n.entity_id },
    select: { from_user_id: true, to_user_id: true, from: { select: { first_name: true } } },
  });
  if (!msg) return null;

  const fromSender = await prisma.message.findMany({
    where: { from_user_id: msg.from_user_id, to_user_id: msg.to_user_id },
    select: { id: true },
    orderBy: { created_at: "desc" },
    take: 200,
  });
  const last = await prisma.notification.findFirst({
    where: {
      person_id: personId,
      event_key: "message.received",
      email_sent_at: { not: null },
      id: { not: notificationId },
      entity_id: { in: fromSender.map((m) => m.id) },
    },
    orderBy: { email_sent_at: "desc" },
    select: { email_sent_at: true },
  });
  const lastEmailAt = last?.email_sent_at ?? null;
  const unreadSince = await prisma.message.count({
    where: {
      from_user_id: msg.from_user_id,
      to_user_id: msg.to_user_id,
      read_at: null,
      ...(lastEmailAt ? { created_at: { gt: lastEmailAt } } : {}),
    },
  });
  return { ...decideMessageEmail(lastEmailAt, now, unreadSince), senderName: msg.from.first_name ?? null };
}
