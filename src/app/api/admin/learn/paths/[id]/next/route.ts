import { NextResponse } from "next/server";
import { z } from "zod";
import { guardApi } from "@/lib/guard";
import { prisma } from "@/lib/prisma";

// L-E046: Admin › Learn › path — its "Recommended next" list (ordered).
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await guardApi("canAdminister");
  if (gate instanceof NextResponse) return gate;
  const { id } = await params;
  const [links, paths] = await Promise.all([
    prisma.learningPathNext.findMany({ where: { from_path_id: id }, orderBy: { sort_order: "asc" }, select: { to_path_id: true } }),
    prisma.learningPath.findMany({ where: { status: "PUBLISHED", id: { not: id } }, orderBy: { title: "asc" }, select: { id: true, title: true } }),
  ]);
  return NextResponse.json({ next: links.map((l) => l.to_path_id), paths });
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await guardApi("canAdminister");
  if (gate instanceof NextResponse) return gate;
  const { id } = await params;
  const b = z.object({ next: z.array(z.string().uuid()).max(12) }).safeParse(await req.json().catch(() => null));
  if (!b.success) return NextResponse.json({ error: "Bad request" }, { status: 400 });
  const ids = [...new Set(b.data.next.filter((x) => x !== id))];
  await prisma.$transaction([
    prisma.learningPathNext.deleteMany({ where: { from_path_id: id, to_path_id: { notIn: ids } } }),
    ...ids.map((to, i) => prisma.learningPathNext.upsert({ where: { from_path_id_to_path_id: { from_path_id: id, to_path_id: to } }, create: { from_path_id: id, to_path_id: to, sort_order: i }, update: { sort_order: i } })),
  ]);
  return NextResponse.json({ next: ids });
}
