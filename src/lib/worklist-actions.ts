import { prisma } from "@/lib/prisma";
import type { Viewer } from "@/lib/access";
import { decideRequest } from "@/lib/company";

// Act from the row (Oracle-style): Approve / Decline a join request, Reply to a message, Dismiss an item with nothing to do.
export type RowAction =
  | { kind: "join"; pending: boolean }
  | { kind: "reply"; href: string }
  | { kind: "dismiss" }
  | null;
type Row = { id: string; eventKey: string; entityId: string | null; dedupeKey: string | null; needsAction: boolean; resolved: boolean; href: string | null };

const joinParts = (key: string | null) => {
  const m = key?.match(/^company\.join_requested:([0-9a-f-]{36}):([0-9a-f-]{36}):/i);
  return m ? { companyId: m[1], askerPersonId: m[2] } : null;
};

export async function actionsFor(rows: Row[]): Promise<Record<string, RowAction>> {
  const out: Record<string, RowAction> = {};
  const joins = rows.map((r) => ({ r, j: r.eventKey === "company.join_requested" ? joinParts(r.dedupeKey) : null })).filter((x) => x.j);
  const pending = joins.length
    ? await prisma.companyMembership.findMany({ where: { status: "PENDING", OR: joins.map((x) => ({ company_id: x.j!.companyId, person_id: x.j!.askerPersonId })) }, select: { company_id: true, person_id: true } })
    : [];
  const msgIds = rows.filter((r) => r.eventKey === "message.received" && r.entityId).map((r) => r.entityId!);
  const senders = msgIds.length ? new Map((await prisma.message.findMany({ where: { id: { in: msgIds } }, select: { id: true, from_user_id: true } })).map((m) => [m.id, m.from_user_id])) : new Map<string, string>();
  for (const r of rows) {
    if (r.eventKey === "company.join_requested") {
      const j = joinParts(r.dedupeKey);
      out[r.id] = j ? { kind: "join", pending: !r.resolved && pending.some((p) => p.company_id === j.companyId && p.person_id === j.askerPersonId) } : null;
    } else if (r.eventKey === "message.received") {
      const from = r.entityId ? senders.get(r.entityId) : undefined;
      out[r.id] = from ? { kind: "reply", href: `/messages?with=${from}` } : null;
    } else out[r.id] = r.resolved ? null : { kind: "dismiss" };
  }
  return out;
}

export class WorklistActionError extends Error {}

/** Approve / Decline from the row: the same decision as Company › Team › asking (admin-checked there). */
export async function decideFromRow(viewer: Viewer, notificationId: string, decision: "APPROVED" | "REJECTED") {
  const n = await ownNotification(viewer, notificationId);
  const j = joinParts(n.dedupe_key);
  if (n.event_key !== "company.join_requested" || !j) throw new WorklistActionError("That isn't a join request.");
  const m = await prisma.companyMembership.findFirst({ where: { company_id: j.companyId, person_id: j.askerPersonId, status: "PENDING" }, select: { id: true } });
  if (!m) {
    await prisma.notification.update({ where: { id: n.id }, data: { resolved_at: new Date(), read_at: new Date() } });
    throw new WorklistActionError("That request has already been decided.");
  }
  await decideRequest(viewer, m.id, decision);
  await prisma.notification.update({ where: { id: n.id }, data: { read_at: new Date(), resolved_at: new Date() } });
}

/** Dismiss: nothing to do, so the item is settled (resolved and read). */
export async function dismissFromRow(viewer: Viewer, notificationId: string) {
  const n = await ownNotification(viewer, notificationId);
  const now = new Date();
  await prisma.notification.update({ where: { id: n.id }, data: { resolved_at: n.resolved_at ?? now, read_at: n.read_at ?? now } });
}

async function ownNotification(viewer: Viewer, id: string) {
  const n = await prisma.notification.findFirst({ where: { id, person: { user_id: viewer.userId } }, select: { id: true, event_key: true, dedupe_key: true, resolved_at: true, read_at: true } });
  if (!n) throw new WorklistActionError("That item no longer exists.");
  return n;
}
