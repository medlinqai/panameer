import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { displayTitle } from "@/lib/notification-events";
import { guardApi } from "@/lib/guard";
import { getSessionViewer } from "@/lib/session";

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

  const rows = await prisma.notification.findMany({
    // N-E001: the quick view shows only what hasn't been dismissed.
    where: { person_id: person.id, delivered_in_app_at: { not: null }, dismissed_at: null },
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
    },
  });

  return NextResponse.json({
    rows: rows.map((n) => ({
      id: n.id,
      title: displayTitle(n.title),
      href: n.href,
      unread: n.read_at === null,
      needsAction: n.requires_action && n.resolved_at === null,
      at: n.created_at,
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
