import { prisma } from "@/lib/prisma";
import type { Viewer } from "@/lib/access";
import {
  acceptColleague,
  declineColleague,
  decideMentor,
  getMyCommunity,
  outgoingRequests,
  withdrawRequest,
} from "@/lib/connections";
import { declineRecommendation } from "@/lib/recommendations";

// Connections › Requests (2026-10-08): everything a member asked of another member — connect, mentoring, recommendation.
export type RequestKind = "CONNECT" | "MENTORING" | "RECOMMENDATION";
export type RequestItem = { id: string; kind: RequestKind; name: string; title: string | null; photoUrl: string | null; at: string; note: string | null; respondHref?: string };

export async function listRequests(viewer: Viewer): Promise<{ received: RequestItem[]; sent: RequestItem[] }> {
  const [mine, outgoing, me, profile] = await Promise.all([
    getMyCommunity(viewer),
    outgoingRequests(viewer),
    prisma.person.findUnique({ where: { user_id: viewer.userId }, select: { id: true } }),
    prisma.providerProfile.findFirst({ where: { person: { user_id: viewer.userId } }, select: { id: true } }),
  ]);
  const rowsAt = new Map(
    (await prisma.connection.findMany({ where: { id: { in: [...mine.incoming, ...mine.mentorRequests, ...mine.mentorRequested].map((r) => r.connectionId) } }, select: { id: true, created_at: true } })).map((r) => [r.id, r.created_at]),
  );
  const at = (id: string) => (rowsAt.get(id) ?? new Date()).toISOString();
  const recoNotes = me
    ? await prisma.notification.findMany({ where: { person_id: me.id, event_key: "recommendation.requested", resolved_at: null }, orderBy: { created_at: "desc" }, select: { id: true, href: true, entity_id: true, created_at: true } })
    : [];
  const recoRows = recoNotes.length
    ? await prisma.recommendationRequest.findMany({ where: { id: { in: recoNotes.map((n) => n.entity_id).filter((x): x is string => !!x) }, status: "SENT" }, select: { id: true, message: true, providerProfile: { select: { person: { select: { first_name: true, last_name: true, title: true, photo_url: true } } } } } })
    : [];
  const received: RequestItem[] = [
    ...mine.incoming.map((r) => ({ id: r.connectionId, kind: "CONNECT" as const, name: r.person!.name, title: r.person!.title, photoUrl: r.person!.photoUrl, at: at(r.connectionId), note: null })),
    ...mine.mentorRequests.map((r) => ({ id: r.connectionId, kind: "MENTORING" as const, name: r.person!.name, title: r.person!.title, photoUrl: r.person!.photoUrl, at: at(r.connectionId), note: null })),
    ...recoNotes.flatMap((n) => {
      const r = recoRows.find((x) => x.id === n.entity_id);
      if (!r) return [];
      const p = r.providerProfile.person;
      return [{ id: n.id, kind: "RECOMMENDATION" as const, name: `${p.first_name} ${p.last_name}`.trim(), title: p.title, photoUrl: p.photo_url, at: n.created_at.toISOString(), note: r.message.slice(0, 80), respondHref: n.href ?? undefined }];
    }),
  ].sort((a, b) => b.at.localeCompare(a.at));
  const recoSent = profile
    ? await prisma.recommendationRequest.findMany({ where: { provider_profile_id: profile.id, status: "SENT" }, orderBy: { sent_at: "desc" }, select: { id: true, contact_name: true, sent_at: true } })
    : [];
  const sent: RequestItem[] = [
    ...outgoing.map((r) => ({ id: r.id, kind: "CONNECT" as const, name: r.name, title: r.title, photoUrl: r.photoUrl, at: r.sentAt.toISOString(), note: null })),
    ...mine.mentorRequested.map((r) => ({ id: r.connectionId, kind: "MENTORING" as const, name: r.person!.name, title: r.person!.title, photoUrl: r.person!.photoUrl, at: at(r.connectionId), note: null })),
    ...recoSent.map((r) => ({ id: r.id, kind: "RECOMMENDATION" as const, name: r.contact_name, title: null, photoUrl: null, at: r.sent_at.toISOString(), note: null })),
  ].sort((a, b) => b.at.localeCompare(a.at));
  return { received, sent };
}

export class RequestError extends Error {}

/** Accept / Decline a received request, or Withdraw a sent one. Every path checks the viewer owns that side. */
export async function actOnRequest(viewer: Viewer, kind: RequestKind, id: string, action: "accept" | "decline" | "withdraw") {
  if (kind === "CONNECT") {
    if (action === "accept") return acceptColleague(viewer, id);
    if (action === "decline") return declineColleague(viewer, id);
    if (!(await withdrawRequest(viewer, id))) throw new RequestError("That request is no longer open.");
    return;
  }
  if (kind === "MENTORING") {
    if (action !== "withdraw") return decideMentor(viewer, id, action === "accept");
    const row = await prisma.connection.updateMany({ where: { id, from_user_id: viewer.userId, kind: "MENTOR", status: "PENDING" }, data: { status: "WITHDRAWN" } });
    if (!row.count) throw new RequestError("That request is no longer open.");
    await prisma.notification.updateMany({ where: { dedupe_key: { startsWith: `mentor.request:${id}:` }, resolved_at: null }, data: { resolved_at: new Date() } });
    return;
  }
  if (action === "decline") {
    // `id` is my notification; its link carries the one-time token the respond page uses.
    const n = await prisma.notification.findFirst({ where: { id, event_key: "recommendation.requested", person: { user_id: viewer.userId } }, select: { id: true, href: true } });
    const raw = n?.href?.match(/\/recommend\/([^/?#]+)/)?.[1];
    if (!n || !raw) throw new RequestError("That request is no longer open.");
    await declineRecommendation(raw);
    await prisma.notification.update({ where: { id: n.id }, data: { resolved_at: new Date(), read_at: new Date() } });
    return;
  }
  if (action === "withdraw") {
    const res = await prisma.recommendationRequest.updateMany({ where: { id, status: "SENT", providerProfile: { person: { user_id: viewer.userId } } }, data: { status: "EXPIRED" } });
    if (!res.count) throw new RequestError("That request is no longer open.");
    await prisma.notification.updateMany({ where: { dedupe_key: { startsWith: `recommendation.request:${id}:` }, resolved_at: null }, data: { resolved_at: new Date() } });
    return;
  }
  throw new RequestError("Open the request to write it.");
}
