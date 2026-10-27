import { NextResponse } from "next/server";
import { guardApi } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { saveWant, type Want } from "@/lib/job-agent";

// EX-E004: save What I Want (and the Daily Digest switch), owner-scoped from the session.
export async function POST(request: Request) {
  const gate = await guardApi("canProvideServices");
  if (gate instanceof NextResponse) return gate;
  const me = await prisma.person.findUnique({ where: { user_id: gate.userId }, select: { id: true } });
  if (!me) return NextResponse.json({ error: "No profile." }, { status: 404 });
  const b = (await request.json().catch(() => ({}))) as Partial<Want>;
  const list = (v: unknown) => (Array.isArray(v) ? v.map((x) => String(x).trim()).filter(Boolean) : []);
  await saveWant(me.id, { skills: list(b.skills), modules: list(b.modules), rateFloorCents: typeof b.rateFloorCents === "number" && b.rateFloorCents > 0 ? Math.round(b.rateFloorCents) : null, workTypes: list(b.workTypes), contractTypes: list(b.contractTypes), countries: list(b.countries), digest: b.digest === true });
  return NextResponse.json({ ok: true });
}
