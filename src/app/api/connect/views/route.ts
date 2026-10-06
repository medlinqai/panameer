import { NextResponse } from "next/server";
import { z } from "zod";
import { guardApi } from "@/lib/guard";
import { prisma } from "@/lib/prisma";

// Connections saved views: per user; the stored query is the filter set.
const Body = z.object({ name: z.string().trim().min(1, "Name the view.").max(80), query: z.string().max(2000) });

export async function POST(request: Request) {
  const viewer = await guardApi("authenticated");
  if (viewer instanceof NextResponse) return viewer;
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "That didn't look right." }, { status: 400 });
  const count = await prisma.connectionView.count({ where: { user_id: viewer.userId } });
  if (count >= 30) return NextResponse.json({ error: "You can keep up to 30 views." }, { status: 400 });
  const v = await prisma.connectionView.create({ data: { user_id: viewer.userId, name: parsed.data.name, query: parsed.data.query.replace(/^\?/, "") }, select: { id: true } });
  return NextResponse.json({ ok: true, id: v.id });
}

export async function DELETE(request: Request) {
  const viewer = await guardApi("authenticated");
  if (viewer instanceof NextResponse) return viewer;
  const id = new URL(request.url).searchParams.get("id") ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Invalid view." }, { status: 400 });
  await prisma.connectionView.deleteMany({ where: { id, user_id: viewer.userId } });
  return NextResponse.json({ ok: true });
}
