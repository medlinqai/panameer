import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { guardApi } from "@/lib/guard";

const Body = z.object({
  sourcing_kind: z.enum(["SOLE_SOURCED", "APP_SOURCED", "SERVICE_PRODUCT"]),
  transaction_type: z
    .enum(["PRODUCT_BY_QTY", "SERVICE_BY_QTY", "SERVICE_BY_AMT"])
    .nullable(),
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
  const { sourcing_kind, transaction_type, percent, note } = parsed.data;
  const rate_bps = Math.round(percent * 100);

  if (transaction_type === null) {
    const existing = await prisma.applicationCommission.findFirst({
      where: { sourcing_kind, transaction_type: null },
      select: { id: true },
    });
    if (existing) {
      await prisma.applicationCommission.update({
        where: { id: existing.id },
        data: { rate_bps, note: note ?? null, updated_by: viewer.userId },
      });
    } else {
      await prisma.applicationCommission.create({
        data: {
          sourcing_kind,
          transaction_type: null,
          rate_bps,
          note: note ?? null,
          updated_by: viewer.userId,
        },
      });
    }
  } else {
    await prisma.applicationCommission.upsert({
      where: { sourcing_kind_transaction_type: { sourcing_kind, transaction_type } },
      update: { rate_bps, note: note ?? null, updated_by: viewer.userId },
      create: {
        sourcing_kind,
        transaction_type,
        rate_bps,
        note: note ?? null,
        updated_by: viewer.userId,
      },
    });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const viewer = await guardApi("canAdminister");
  if (viewer instanceof NextResponse) return viewer;

  const parsed = z
    .object({
      sourcing_kind: z.enum(["SOLE_SOURCED", "APP_SOURCED", "SERVICE_PRODUCT"]),
      transaction_type: z.enum(["PRODUCT_BY_QTY", "SERVICE_BY_QTY", "SERVICE_BY_AMT"]),
    })
    .safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Only an override can be removed." },
      { status: 400 }
    );
  }
  await prisma.applicationCommission.deleteMany({
    where: {
      sourcing_kind: parsed.data.sourcing_kind,
      transaction_type: parsed.data.transaction_type,
    },
  });
  return NextResponse.json({ ok: true });
}
