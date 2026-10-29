import { prisma } from "@/lib/prisma";
import type { Viewer } from "@/lib/access";
import { decideRequest } from "@/lib/company";

// Act from the row (Oracle-style): Approve / Decline a join request, Reply to a message, Dismiss an item with nothing to do.
export type RowAction =
  | { kind: "join"; pending: boolean }
  // NT-E002: a connection request and a mentor request are decided from the row too.
  | { kind: "connect"; pending: boolean }
  | { kind: "mentor"; pending: boolean }
  | { kind: "reply"; href: string }
  | { kind: "message"; href: string; label: string }
  | { kind: "dismiss" }
  // HP-E002: work rows act from the row — View & Propose · Decline, Review & Accept, Review & Send.
  | { kind: "work"; primary: { label: string; href: string }; secondary?: { label: string; href: string } }
  | null;
type Row = { id: string; eventKey: string; entityId: string | null; dedupeKey: string | null; needsAction: boolean; resolved: boolean; href: string | null; action?: string | null };

const joinParts = (key: string | null) => {
  const m = key?.match(/^company\.join_requested:([0-9a-f-]{36}):([0-9a-f-]{36}):/i);
  return m ? { companyId: m[1], askerPersonId: m[2] } : null;
};

const connParts = (key: string | null) => /^(?:colleague\.invite|mentor\.request):([0-9a-f-]{36})/i.exec(key ?? "")?.[1] ?? null;

const INSTRUCTOR_EVENTS = new Set(["learn.path_enrolled.instructor", "learn.course_completed.instructor", "learn.path_completed.instructor"]);

export async function actionsFor(rows: Row[]): Promise<Record<string, RowAction>> {
  const out: Record<string, RowAction> = {};
  const joins = rows.map((r) => ({ r, j: r.eventKey === "company.join_requested" ? joinParts(r.dedupeKey) : null })).filter((x) => x.j);
  const pending = joins.length
    ? await prisma.companyMembership.findMany({ where: { status: "PENDING", OR: joins.map((x) => ({ company_id: x.j!.companyId, person_id: x.j!.askerPersonId })) }, select: { company_id: true, person_id: true } })
    : [];
  const msgIds = rows.filter((r) => r.eventKey === "message.received" && r.entityId).map((r) => r.entityId!);
  const senders = msgIds.length ? new Map((await prisma.message.findMany({ where: { id: { in: msgIds } }, select: { id: true, from_user_id: true } })).map((m) => [m.id, m.from_user_id])) : new Map<string, string>();
  // L-E035..L-E037: instructor events act as "Message {First}" (the learner's user id is in the href).
  const learnerIds = rows.filter((r) => INSTRUCTOR_EVENTS.has(r.eventKey)).map((r) => /with=([0-9a-f-]{36})/i.exec(r.href ?? "")?.[1]).filter((x): x is string => !!x);
  const firsts = learnerIds.length ? new Map((await prisma.user.findMany({ where: { id: { in: learnerIds } }, select: { id: true, first_name: true } })).map((u) => [u.id, u.first_name])) : new Map<string, string | null>();
  const connIds = rows.filter((r) => r.eventKey === "colleague.invite_received" || r.eventKey === "mentor.request_received").map((r) => connParts(r.dedupeKey)).filter((x): x is string => !!x);
  const openConns = connIds.length ? new Set((await prisma.connection.findMany({ where: { id: { in: connIds }, status: "PENDING" }, select: { id: true } })).map((c) => c.id)) : new Set<string>();
  for (const r of rows) {
    const work = workAction(r);
    if (work !== undefined) { out[r.id] = work; continue; }
    if (r.eventKey === "colleague.invite_received" || r.eventKey === "mentor.request_received") {
      const id = connParts(r.dedupeKey);
      out[r.id] = id ? { kind: r.eventKey === "mentor.request_received" ? "mentor" : "connect", pending: !r.resolved && openConns.has(id) } : null;
      continue;
    }
    if (INSTRUCTOR_EVENTS.has(r.eventKey)) {
      const id = /with=([0-9a-f-]{36})/i.exec(r.href ?? "")?.[1];
      out[r.id] = id && !r.resolved ? { kind: "message", href: r.href!, label: `Message ${firsts.get(id)?.trim() || "Them"}` } : r.resolved ? null : { kind: "dismiss" };
      continue;
    }
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

/** HP-E002: the buttons on a work row (undefined = not a work row). */
function workAction(r: Row): RowAction | undefined {
  // WK-E008: a Things You Need to Do line — same words, same button as on the panel.
  if (r.eventKey === "todo.item") {
    if (r.resolved || !r.href) return null;
    // NC-E002: two verbs on one line ("Extend|Close") open the record with that action ready.
    const [a, b] = (r.action || "Open").split("|");
    const act = (v: string) => `${r.href}${r.href!.includes("?") ? "&" : "?"}act=${v.toLowerCase()}`;
    return b ? { kind: "work", primary: { label: a, href: act(a) }, secondary: { label: b, href: act(b) } } : { kind: "work", primary: { label: a, href: r.href } };
  }
  if (r.resolved) return ["work.invited_to_propose", "work.sourcing_event_invited", "work.order_offered", "work.order_created", "buyer.sourcing.notify_others", "work.interview_requested", "work.questions_asked", "work.request_po_check"].includes(r.eventKey) ? null : undefined;
  // JR-E004: No PO Yet — Still Waiting · It Was Declined, both on the Request.
  if (r.eventKey === "work.request_po_check" && r.href) return { kind: "work", primary: { label: "Still Waiting", href: `${r.href}&po=wait` }, secondary: { label: "It Was Declined", href: `${r.href}&po=declined` } };
  if (r.eventKey === "work.invited_to_propose" || r.eventKey === "work.sourcing_event_invited") {
    const jobId = r.dedupeKey?.split(":")[1];
    if (!jobId) return undefined;
    // Decline (with a reason) lives on the Sourcing Event proposal form.
    return { kind: "work", primary: { label: "View & Respond", href: `/work/jobs/${jobId}` }, ...(r.eventKey === "work.sourcing_event_invited" ? { secondary: { label: "Decline", href: `/work/jobs/${jobId}?decline=1` } } : {}) };
  }
  if ((r.eventKey === "work.order_offered" || r.eventKey === "work.order_created") && r.entityId) return { kind: "work", primary: { label: "Review & Accept", href: `/orders/${r.entityId}` } };
  // Scott 10-22: the interview invitation needs a button to the booking.
  if (r.eventKey === "work.interview_requested" && r.href) return { kind: "work", primary: { label: "Pick a Time", href: `${r.href}#interview` } };
  // AQ-E003: "A Buyer Has Questions — Answer".
  if (r.eventKey === "work.questions_asked" && r.href) return { kind: "work", primary: { label: "Answer", href: r.href } };
  if (r.eventKey === "buyer.sourcing.notify_others" && r.entityId) return { kind: "work", primary: { label: "Review & Send", href: `/hire/sourcing/${r.entityId}` } };
  return undefined;
}

export class WorklistActionError extends Error {}

/** Approve / Decline from the row: the same decision as Company › Team › asking (admin-checked there),
 *  and (NT-E002) Accept / Decline on a connection or mentor request — the same calls as Connect › Requests. */
export async function decideFromRow(viewer: Viewer, notificationId: string, decision: "APPROVED" | "REJECTED") {
  const n = await ownNotification(viewer, notificationId);
  if (n.event_key === "colleague.invite_received" || n.event_key === "mentor.request_received") {
    const id = connParts(n.dedupe_key);
    if (!id) throw new WorklistActionError("That request can't be found.");
    const { acceptColleague, declineColleague, decideMentor } = await import("@/lib/connections");
    try {
      if (n.event_key === "mentor.request_received") await decideMentor(viewer, id, decision === "APPROVED");
      else if (decision === "APPROVED") await acceptColleague(viewer, id);
      else await declineColleague(viewer, id);
    } catch (e) {
      await prisma.notification.update({ where: { id: n.id }, data: { resolved_at: new Date(), read_at: new Date() } });
      throw new WorklistActionError((e as Error).message || "That request has already been decided.");
    }
    return;
  }
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
