import { displayTitle } from "@/lib/notification-events";
import { prisma } from "@/lib/prisma";

export function isWorklistItem(n: {
  requires_action: boolean;
  resolved_at: Date | null;
  delivered_in_app_at: Date | null;
}): boolean {
  return n.requires_action && n.resolved_at === null && n.delivered_in_app_at !== null;
}

export type WorklistItem = {
  id: string;
  title: string;
  body: string | null;
  href: string | null;
  at: Date;
  count: number;
};

export async function getWorklist(
  personId: string,
  take = 20
): Promise<WorklistItem[]> {
  const where = {
    person_id: personId,
    requires_action: true,
    resolved_at: null,
    delivered_in_app_at: { not: null },
  };
  const exact = new Map(
    (
      await prisma.notification.groupBy({
        by: ["title"],
        where,
        _count: { _all: true },
      })
    ).map((g) => [g.title, g._count._all]),
  );
  const rows = await prisma.notification.findMany({
    where,
    orderBy: { created_at: "asc" },
    take: Math.max(take * 5, 50),
    select: { id: true, title: true, body: true, href: true, created_at: true },
  });
  return groupWorklist(rows, exact, take);
}

export function groupWorklist(
  rows: readonly { id: string; title: string; body: string | null; href: string | null; created_at: Date }[],
  exact: ReadonlyMap<string, number>,
  take: number,
): WorklistItem[] {
  const byTitle = new Map<string, WorklistItem>();
  for (const n of rows) {
    if (byTitle.has(n.title)) continue;
    byTitle.set(n.title, {
      id: n.id,
      title: n.title,
      body: n.body,
      href: n.href,
      at: n.created_at,
      count: exact.get(n.title) ?? 1,
    });
  }
  return [...byTitle.values()].slice(0, take);
}

export async function countWorklist(personId: string): Promise<number> {
  return prisma.notification.count({
    where: {
      person_id: personId,
      requires_action: true,
      resolved_at: null,
      delivered_in_app_at: { not: null },
    },
  });
}

/** N-E002: Show All lists every notification, dismissed ones included (they render muted). */
export function triageWhere(personId: string) {
  return {
    person_id: personId,
    delivered_in_app_at: { not: null },
  };
}

export function actWhere(personId: string) {
  return {
    person_id: personId,
    requires_action: true,
    resolved_at: null,
    delivered_in_app_at: { not: null },
  };
}

export type TriageRow = {
  id: string;
  title: string;
  body: string | null;
  href: string | null;
  category: string;
  eventKey: string;
  at: Date;
  unread: boolean;
  needsAction: boolean;
  /** For the row's own buttons (Approve / Decline, Reply, Dismiss). */
  entityId: string | null;
  dedupeKey: string | null;
  resolved: boolean;
  dismissed: boolean;
};

const TRIAGE_SELECT = {
  id: true,
  title: true,
  body: true,
  href: true,
  category: true,
  event_key: true,
  created_at: true,
  read_at: true,
  requires_action: true,
  resolved_at: true,
  delivered_in_app_at: true,
  entity_id: true,
  dedupe_key: true,
  dismissed_at: true,
} as const;

function toTriage(n: {
  id: string; title: string; body: string | null; href: string | null;
  category: string; event_key: string; created_at: Date; read_at: Date | null;
  requires_action: boolean; resolved_at: Date | null; delivered_in_app_at: Date | null;
  entity_id: string | null; dedupe_key: string | null; dismissed_at: Date | null;
}): TriageRow {
  return {
    id: n.id,
    title: displayTitle(n.title),
    body: n.body,
    href: n.href,
    category: n.category,
    eventKey: n.event_key,
    at: n.created_at,
    unread: n.read_at === null,
    needsAction: isWorklistItem(n),
    entityId: n.entity_id,
    dedupeKey: n.dedupe_key,
    resolved: n.resolved_at !== null,
    dismissed: n.dismissed_at !== null,
  };
}

export async function getTriage(
  personId: string,
  opts: { filter?: string; take?: number; cursor?: string } = {}
): Promise<{ rows: TriageRow[]; more: boolean }> {
  const take = opts.take ?? 25;
  const where: Record<string, unknown> = { ...triageWhere(personId) };
  if (opts.filter === "unread") where.read_at = null;
  else if (opts.filter && opts.filter !== "all") where.category = opts.filter;

  const rows = await prisma.notification.findMany({
    where,
    orderBy: { created_at: "desc" },
    take: take + 1,
    ...(opts.cursor ? { cursor: { id: opts.cursor }, skip: 1 } : {}),
    select: TRIAGE_SELECT,
  });
  return { rows: rows.slice(0, take).map(toTriage), more: rows.length > take };
}

export async function getTriageCounts(
  personId: string
): Promise<{ all: number; unread: number; byCategory: { key: string; n: number }[] }> {
  const base = triageWhere(personId);
  const [all, unread, grouped] = await Promise.all([
    prisma.notification.count({ where: base }),
    prisma.notification.count({ where: { ...base, read_at: null } }),
    prisma.notification.groupBy({
      by: ["category"],
      where: base,
      _count: { _all: true },
    }),
  ]);
  return {
    all,
    unread,
    byCategory: grouped
      .map((g) => ({ key: g.category, n: g._count._all }))
      .sort((a, b) => b.n - a.n || a.key.localeCompare(b.key)),
  };
}

export type ActRow = TriageRow;

/** Closes action items whose ask is already done: messages that have been read,
 *  and "profile hidden" once the profile is visible again. Idempotent. */
export async function settleStale(personId: string): Promise<void> {
  const now = new Date();
  const open = await prisma.notification.findMany({
    where: { person_id: personId, resolved_at: null, event_key: { in: ["message.received", "profile.visibility_off"] } },
    select: { id: true, event_key: true, entity_id: true },
  });
  if (!open.length) return;
  const msgIds = open.filter((n) => n.event_key === "message.received" && n.entity_id).map((n) => n.entity_id as string);
  const read = msgIds.length
    ? new Set((await prisma.message.findMany({ where: { id: { in: msgIds }, read_at: { not: null } }, select: { id: true } })).map((m) => m.id))
    : new Set<string>();
  const visible = open.some((n) => n.event_key === "profile.visibility_off")
    ? !!(await prisma.providerProfile.findFirst({ where: { person_id: personId, paused_at: null }, select: { id: true } }))
    : false;
  const done = open
    .filter((n) => (n.event_key === "message.received" && n.entity_id && read.has(n.entity_id)) || (n.event_key === "profile.visibility_off" && visible))
    .map((n) => n.id);
  if (done.length) await prisma.notification.updateMany({ where: { id: { in: done } }, data: { resolved_at: now, read_at: now } });
}

export async function getActList(
  personId: string,
  opts: { status?: "open" | "completed" | "any"; q?: string; category?: string } = {}
): Promise<ActRow[]> {
  const status = opts.status ?? "open";
  const where: Record<string, unknown> = {
    person_id: personId,
    requires_action: true,
    delivered_in_app_at: { not: null },
  };
  if (status === "open") where.resolved_at = null;
  else if (status === "completed") where.resolved_at = { not: null };
  if (opts.category) where.category = opts.category;
  const term = opts.q?.trim();
  if (term && term.length >= 2) {
    where.OR = [
      { title: { contains: term, mode: "insensitive" } },
      { body: { contains: term, mode: "insensitive" } },
    ];
  }
  const rows = await prisma.notification.findMany({
    where,
    orderBy: { created_at: "asc" },
    take: 200,
    select: TRIAGE_SELECT,
  });
  return rows.map(toTriage);
}

export async function getActCounts(
  personId: string
): Promise<{ open: number; pastDay: number; pastWeek: number; byCategory: { key: string; n: number }[] }> {
  const base = actWhere(personId);
  const day = new Date(Date.now() - 86_400_000);
  const week = new Date(Date.now() - 7 * 86_400_000);
  const [open, pastDay, pastWeek, grouped] = await Promise.all([
    prisma.notification.count({ where: base }),
    prisma.notification.count({ where: { ...base, created_at: { lt: day } } }),
    prisma.notification.count({ where: { ...base, created_at: { lt: week } } }),
    prisma.notification.groupBy({ by: ["category"], where: base, _count: { _all: true } }),
  ]);
  return {
    open,
    pastDay,
    pastWeek,
    byCategory: grouped
      .map((g) => ({ key: g.category, n: g._count._all }))
      .sort((a, b) => b.n - a.n || a.key.localeCompare(b.key)),
  };
}
