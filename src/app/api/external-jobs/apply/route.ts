import { NextResponse } from "next/server";
import { guardApi } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { applyExternal, withdrawExternal } from "@/lib/external-apply";

// XA-E002: Apply on Panameer (and withdraw while still Applied), owner-scoped from the session.
async function me(userId: string) {
  return prisma.person.findUnique({ where: { user_id: userId }, select: { id: true } });
}
export async function POST(request: Request) {
  const gate = await guardApi("authenticated");
  if (gate instanceof NextResponse) return gate;
  const p = await me(gate.userId);
  if (!p) return NextResponse.json({ error: "No profile." }, { status: 404 });
  const b = (await request.json().catch(() => ({}))) as { id?: string; start?: string; rateCents?: number; note?: string };
  try {
    await applyExternal(p.id, String(b.id ?? ""), b);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
export async function DELETE(request: Request) {
  const gate = await guardApi("authenticated");
  if (gate instanceof NextResponse) return gate;
  const p = await me(gate.userId);
  if (!p) return NextResponse.json({ error: "No profile." }, { status: 404 });
  await withdrawExternal(p.id, new URL(request.url).searchParams.get("id") ?? "");
  return NextResponse.json({ ok: true });
}
