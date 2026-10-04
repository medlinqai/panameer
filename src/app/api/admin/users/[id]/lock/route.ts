import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { guardApi } from "@/lib/guard";

const Body = z.object({
  action: z.literal("unlock"),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const viewer = await guardApi("canAdminister");
  if (viewer instanceof NextResponse) return viewer;

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Unsupported action." }, { status: 400 });
  }

  const { id } = await params;
  const person = await prisma.person.findUnique({
    where: { id },
    select: { user: { select: { id: true, email: true } } },
  });
  if (!person?.user) {
    return NextResponse.json({ error: "No login on this record." }, { status: 404 });
  }

  const updated = await prisma.user.update({
    where: { id: person.user.id },
    data: { locked: false, locked_until: null, failed_login_attempts: 0 },
    select: { locked: true, locked_until: true, failed_login_attempts: true },
  });

  return NextResponse.json({ ok: true, ...updated });
}
