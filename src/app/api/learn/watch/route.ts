import { NextResponse } from "next/server";
import { z } from "zod";
import { guardApi } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { setPathWatch } from "@/lib/learn-watch";

// Notify Me / You'll Be Notified ✓ for a Coming Soon learning path.
const Body = z.object({ pathId: z.string().uuid(), watch: z.boolean() });

export async function POST(req: Request) {
  const gate = await guardApi("authenticated");
  if (gate instanceof NextResponse) return gate;
  const b = Body.safeParse(await req.json().catch(() => null));
  if (!b.success) return NextResponse.json({ error: "That didn't look right." }, { status: 400 });
  const path = await prisma.learningPath.findFirst({ where: { id: b.data.pathId, status: "PUBLISHED" }, select: { id: true } });
  if (!path) return NextResponse.json({ error: "That learning path doesn't exist." }, { status: 404 });
  await setPathWatch(gate.userId, path.id, b.data.watch);
  return NextResponse.json({ ok: true, watching: b.data.watch });
}
