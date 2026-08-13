import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { guardApi } from "@/lib/guard";
import { percentToBps } from "@/lib/assessment/tax-rate";

/**
 * Write the funding rate. `canAdminister` only — this number appears on every
 * assessment report, so it is Panameer Admin's, not a company owner's.
 */
const Body = z.object({
  /** null = the global default row. */
  geography: z.string().trim().min(2).max(2).nullable(),
  percent: z.number().min(0).max(100),
  note: z.string().trim().max(300).nullable().optional(),
});

export async function POST(req: Request) {
  const viewer = await guardApi("canAdminister");
  if (viewer instanceof NextResponse) return viewer;

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "That rate didn't look right." }, { status: 400 });
  }
  const { geography, percent, note } = parsed.data;
  const rate_bps = percentToBps(percent);

  /*
    upsert ON `geography`, which is unique and nullable. Postgres treats NULLs
    as distinct in a unique index, so the global row cannot be matched by an
    upsert `where` — hence the explicit branch. Getting this wrong would insert
    a second global row on every save and leave `resolveTaxRate` picking one at
    random.
  */
  if (geography === null) {
    const existing = await prisma.taxRate.findFirst({ where: { geography: null }, select: { id: true } });
    if (existing) {
      await prisma.taxRate.update({
        where: { id: existing.id },
        data: { rate_bps, note: note ?? null, updated_by: viewer.userId },
      });
    } else {
      await prisma.taxRate.create({
        data: { geography: null, rate_bps, note: note ?? null, updated_by: viewer.userId },
      });
    }
  } else {
    await prisma.taxRate.upsert({
      where: { geography },
      update: { rate_bps, note: note ?? null, updated_by: viewer.userId },
      create: { geography, rate_bps, note: note ?? null, updated_by: viewer.userId },
    });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const viewer = await guardApi("canAdminister");
  if (viewer instanceof NextResponse) return viewer;

  const geography = new URL(req.url).searchParams.get("geography");
  // The global row is deliberately not deletable — removing it would silently
  // fall back to the built-in constant, which is the one state an admin cannot
  // see or set. Edit it instead.
  if (!geography) {
    return NextResponse.json({ error: "The global default can't be deleted." }, { status: 400 });
  }
  await prisma.taxRate.deleteMany({ where: { geography } });
  return NextResponse.json({ ok: true });
}
