import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { guardApi } from "@/lib/guard";

/**
 * Write a platform commission. `canAdminister` only — this number is the
 * platform's cut on every transaction of its kind, so it is Panameer Admin's.
 *
 * ⚠⚠⚠ **A CHANGE HERE APPLIES TO NEW TRANSACTIONS ONLY.** The rate is resolved
 * once at work order creation and stamped onto the line; nothing re-reads this
 * table afterwards. ⚠ **THAT IS THE OPPOSITE OF `/api/admin/tax-rates`, WHICH
 * SITS BESIDE IT AND WHOSE CHANGES DO REACH ALREADY-SENT REPORTS** — right for a
 * report, catastrophic for a fee (ruling `97b`).
 */
const Body = z.object({
  sourcing_kind: z.enum(["SOLE_SOURCED", "APP_SOURCED", "SERVICE_PRODUCT"]),
  /** ⚠ null = the kind's default row, which applies to every transaction type. */
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
  /* ⚠ Percent → bps, rounded, because 9.99 × 100 is 998.9999999999999 in IEEE
     754. The same reason every cents conversion in this codebase rounds. */
  const rate_bps = Math.round(percent * 100);

  /*
    ⚠⚠ THE SAME NULL TRAP `/api/admin/tax-rates` DOCUMENTS, AND FOR THE SAME
    REASON: Postgres treats NULLs as DISTINCT in a unique index, so an upsert
    keyed on `(sourcing_kind, null)` can never match the existing default row.
    ⚠⚠⚠ **GETTING THIS WRONG INSERTS A SECOND DEFAULT ROW ON EVERY SAVE AND
    LEAVES `resolveCommissionBps` PICKING ONE AT RANDOM** — which, for a fee,
    means two transactions of the same kind quietly charging different rates.
  */
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

/**
 * ⚠ Remove an override. ⚠⚠ **A KIND'S DEFAULT ROW CANNOT BE DELETED** — without
 * it that kind falls to the built-in floor, which reports `fallback: true` and
 * means nobody chose the number being charged.
 */
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
