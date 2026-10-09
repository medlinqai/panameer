import { NextResponse } from "next/server";
import { z } from "zod";
import { guardApi } from "@/lib/guard";
import { prisma } from "@/lib/prisma";

const Body = z.object({
  action: z.enum(["read", "dismiss", "undismiss", "read_all", "dismiss_all"]),
  ids: z.array(z.string().uuid()).max(2000).optional(),
});

export async function POST(req: Request) {
  const gate = await guardApi("authenticated");
  if (gate instanceof NextResponse) return gate;

  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const person = await prisma.person.findUnique({
    where: { user_id: gate.userId },
    select: { id: true },
  });
  if (!person) return NextResponse.json({ error: "No person" }, { status: 404 });

  const { action, ids } = parsed.data;
  const now = new Date();

  const mine = {
    person_id: person.id,
    delivered_in_app_at: { not: null },
    dismissed_at: null,
  };

  if (action === "read_all") {
    const r = await prisma.notification.updateMany({
      where: { ...mine, read_at: null },
      data: { read_at: now },
    });
    return NextResponse.json({ ok: true, count: r.count });
  }

  if (action === "dismiss_all") {
    // N-E002: returns the ids so the page can offer Undo.
    const hit = (await prisma.notification.findMany({ where: mine, select: { id: true }, take: 2000 })).map((n) => n.id);
    const r = await prisma.notification.updateMany({ where: { id: { in: hit }, dismissed_at: null }, data: { dismissed_at: now } });
    return NextResponse.json({ ok: true, count: r.count, ids: hit });
  }

  if (!ids?.length) {
    return NextResponse.json({ error: "No rows selected" }, { status: 400 });
  }

  const r = await prisma.notification.updateMany({
    where: { id: { in: ids }, person_id: person.id },
    data: action === "read" ? { read_at: now } : action === "undismiss" ? { dismissed_at: null } : { dismissed_at: now },
  });
  return NextResponse.json({ ok: true, count: r.count });
}
