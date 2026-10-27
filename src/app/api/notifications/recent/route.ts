import { markLink } from "@/lib/login-return";
import { ACTION_EVENTS, NEWS_DAYS } from "@/lib/action-rule";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { displayTitle } from "@/lib/notification-events";
import { guardApi } from "@/lib/guard";
import { getSessionViewer } from "@/lib/session";
import { actionsFor } from "@/lib/worklist-actions";

const TAKE = 6;

export async function GET() {
  const gate = await guardApi("authenticated");
  if (gate instanceof NextResponse) return gate;
  const viewer = await getSessionViewer();
  if (!viewer) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const person = await prisma.person.findUnique({
    where: { user_id: viewer.userId },
    select: { id: true },
  });
  if (!person) return NextResponse.json({ rows: [] });

  // Scott 10-27: a new action also gets one bell entry (linking to its Worklist item); it turns read when the action is done.
  await prisma.notification.updateMany({ where: { person_id: person.id, requires_action: true, resolved_at: { not: null }, read_at: null }, data: { read_at: new Date() } }).catch(() => null);
  const rows = await prisma.notification.findMany({
    // N-E001: the quick view shows only what hasn't been dismissed. News expires after 14 days; actions stay until done.
    where: { person_id: person.id, delivered_in_app_at: { not: null }, dismissed_at: null, NOT: { event_key: { in: ["todo.item", "message.received"] } },
      OR: [{ requires_action: false, created_at: { gte: new Date(Date.now() - NEWS_DAYS * 86_400_000) } }, { requires_action: true, event_key: { in: [...ACTION_EVENTS] } }] },
    orderBy: { created_at: "desc" },
    take: TAKE,
    select: {
      id: true,
      title: true,
      href: true,
      read_at: true,
      created_at: true,
      requires_action: true,
      resolved_at: true,
      event_key: true,
      entity_id: true,
      dedupe_key: true,
    },
  });
  // NT-E002: request rows get their buttons in the bell too.
  const actions = await actionsFor(rows.map((n) => ({ id: n.id, eventKey: n.event_key, entityId: n.entity_id, dedupeKey: n.dedupe_key, needsAction: n.requires_action, resolved: n.resolved_at !== null, href: n.href })));

  return NextResponse.json({
    rows: rows.map((n) => ({
      id: n.id,
      title: displayTitle(n.title),
      // Scott 10-27: a notification link carries from=notification (a sign-in from it returns there).
      href: n.requires_action ? markLink(`/worklist?item=${n.id}`, "notification") : n.href ? markLink(n.href, "notification") : n.href,
      unread: n.read_at === null,
      needsAction: n.requires_action && n.resolved_at === null,
      at: n.created_at,
      action: actions[n.id] ?? null,
    })),
  });
}

export async function POST(request: Request) {
  const gate = await guardApi("authenticated");
  if (gate instanceof NextResponse) return gate;
  const viewer = await getSessionViewer();
  if (!viewer) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const parsed = z
    .object({ id: z.string().uuid() })
    .safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "That isn't a valid request." }, { status: 400 });
  }

  const person = await prisma.person.findUnique({
    where: { user_id: viewer.userId },
    select: { id: true },
  });
  if (!person) return NextResponse.json({ error: "No person." }, { status: 404 });

  const res = await prisma.notification.updateMany({
    where: { id: parsed.data.id, person_id: person.id, read_at: null },
    data: { read_at: new Date() },
  });

  return NextResponse.json({ ok: true, marked: res.count });
}
