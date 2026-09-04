import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notifications";
import type { Viewer } from "@/lib/access";

/**
 * MESSAGES — every rule, in one place (`P1-ALL-E379`).
 *
 * SCOTT, 2026-09-04, on being told there is no `Message` model: *"build one!"*
 *
 * ⚠⚠ NOTHING IN A COMPONENT DECIDES ANYTHING HERE. The composer asks
 * `canMessage` what to show and `sendMessage` asks it again on the way in — a
 * UI that hides the box is not a permission, and `check:messages` asserts the
 * server-side re-check exists.
 */

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

/**
 * ⚠⚠ THE COPY THE COMPOSER SHOWS, ONE STRING PER REASON.
 *
 * ⚠ IT EXPLAINS BEFORE THE SEND RATHER THAN ERRORING AFTER IT. A person who
 * types four paragraphs and THEN learns they cannot send has been actively
 * misled by the interface.
 *
 * ⚠ CC-AUTHORED COPY — Scott has not seen these five strings and can overrule
 * any of them. They are here rather than in the component so there is one place
 * to change them.
 */
export const DENIAL_COPY: Record<MessageDenial, string> = {
  SELF: "This is you.",
  NOT_CONNECTED:
    "You can message someone once you're colleagues. Send a colleague request first — they'll need to accept it.",
  PENDING:
    "Your colleague request is still waiting on them. You'll be able to message once they accept.",
  /* ⚠ IT DOES NOT SAY "THEY DECLINED YOU". The decline is the other person's
     business, and `E372` keeps the row precisely so the request cannot be
     re-sent forever. Naming it would turn a quiet no into a notification. */
  DECLINED: "You can't message this member.",
  UNAVAILABLE:
    "This member has turned off messages. Their profile still shows how else to reach them.",
  NOT_A_MEMBER: "This person doesn't have an account you can message.",
};

function deny(reason: MessageDenial): MessagePermission {
  return { ok: false, reason, message: DENIAL_COPY[reason] };
}

/**
 * ⚠⚠ MAY THE VIEWER MESSAGE THIS PERSON, AND IF NOT, WHY NOT.
 *
 * ── THE RULE ──────────────────────────────────────────────────────────────
 *
 * An `ACCEPTED` `COLLEAGUE` connection, in either direction. That is all.
 *
 * ⚠⚠ A `MENTOR` CONNECTION GRANTS NOTHING, AND THAT IS A SPAM HOLE RATHER THAN
 * A PREFERENCE. `E372` writes `MENTOR` rows as `ACCEPTED` INSTANTLY AND
 * UNILATERALLY — nobody's permission is asked, by design. So if a mentor
 * connection carried a message permission, ANYONE COULD MESSAGE ANYONE simply
 * by connecting as a mentor first, and the entire consent model would be
 * decorative. `check:messages` mutation-tests exactly this pair.
 *
 * ⚠ A COLLEAGUE CONNECTION IS MUTUAL, and that mutual yes IS the consent a
 * message permission should require. It is the same yes `E369`'s growth
 * strategy rests on — *"I vouch for this person"* — so this makes the colleague
 * request more valuable rather than adding a second permission system.
 *
 * ⚠ `PENDING` AND `DECLINED` CARRY NO PERMISSION. Not even "a message to
 * explain your request" — that is precisely the invite spam the decline state
 * exists to prevent.
 *
 * ⚠ `available_for_messages = false` OVERRIDES EVERYTHING, including between
 * accepted colleagues. An opt-out is not a suggestion.
 *
 * ── ⚠⚠ THE SEAM: A PAID ENGAGEMENT SHOULD GRANT A MESSAGE PERMISSION ───────
 *
 * SCOTT, 2026-09-04: *"unless you had to pay prior to connection."*
 *
 * He is right, and it is the correct exception: PAYMENT IS CONSENT. Somebody
 * who bought your time has earned the ability to reach you, and it cannot be
 * spam because it costs money — his own rule from the mentoring decision,
 * *"keep it simple...you want it, pay for it. if not, you didn't really want
 * it."* Willingness to pay is a stronger filter than a connection.
 *
 * ⚠⚠ A PAID ENGAGEMENT GRANTS A MESSAGE PERMISSION AND THIS IS WHERE IT PLUGS
 * IN — a third branch beside the colleague check, before the availability
 * check. IT IS NOT HERE BECAUSE NO ORDER MODEL EXISTS (`E371` / commerce):
 * `WorkRequest -> WorkOrder -> Settlement` is unbuilt, so the branch's condition
 * would be permanently false. ⚠ A GATE THAT CANNOT FIRE, SITTING IN THE CODE
 * LOOKING IMPLEMENTED, IS THE `E034` SHAPE — so it is named here rather than
 * stubbed. The next person finds the seam instead of rediscovering the rule.
 *
 * ⚠ ITS KNOWN CONSEQUENCE, ACCEPTED FOR NOW: a member who connected as a mentor
 * CANNOT message that mentor. `E374`'s demand signal — *"3 members connected to
 * you as a mentor"* — IS the ask, and paying for time runs on the commerce path
 * when it exists. Do NOT add a message-your-mentor shortcut around it.
 */
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

  /* ⚠ EITHER DIRECTION. A colleague connection is one row and either party may
     have sent it; requiring `from_user_id = me` would let only the requester
     message, which is not what "mutual" means. */
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

  /* ⚠⚠ THE OPT-OUT IS CHECKED LAST AND OVERRIDES THE ACCEPTED CONNECTION.
     Ordering matters for the COPY, not the outcome: a stranger who has also
     switched messages off should be told they are not connected, which is the
     thing they can act on, rather than being told about a setting that is none
     of their business.
     ⚠ ABSENT PROFILE = REACHABLE. The column lives on `ProviderProfile` and a
     member without one has never opted out. Treating "no profile" as "opted
     out" would silently mute every requester-only account. */
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

/**
 * ⚠⚠ THE PERMISSION IS RE-CHECKED HERE, SERVER-SIDE, ON EVERY SEND. The
 * composer hiding itself is a courtesy, not a control — this route is reachable
 * with curl.
 *
 * ⚠ THE SENDER COMES FROM THE SESSION AND IS NEVER IN THE PAYLOAD, so there is
 * no shape of request that sends AS somebody else.
 */
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
    where: { user_id: { in: [...byOther.keys()] } },
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
 * ⚠ THE UNREAD BADGE, APPLIED TO A TAB SET (`P1-ALL-E379`).
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
