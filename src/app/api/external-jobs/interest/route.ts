import { NextResponse } from "next/server";
import { guardApi } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { setInterest } from "@/lib/external-jobs";

// EX-E003: I'm Interested (and Undo), owner-scoped from the session.
export async function POST(request: Request) {
  const gate = await guardApi("authenticated");
  if (gate instanceof NextResponse) return gate;
  const me = await prisma.person.findUnique({ where: { user_id: gate.userId }, select: { id: true } });
  if (!me) return NextResponse.json({ error: "No profile." }, { status: 404 });
  const b = (await request.json().catch(() => ({}))) as { id?: string; on?: boolean };
  try {
    await setInterest(me.id, String(b.id ?? ""), b.on !== false);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
