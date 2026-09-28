import { prisma } from "@/lib/prisma";
import { BUILT_IN_COMMISSION_BPS } from "@/lib/application-commissions";

/**
 * ── ⚠⚠ SEED THE THREE `null` ROWS AT 499 / 999 / 1499. NOTHING ELSE ─────────
 *
 * `P2-A15-E696` WS-B, ruling 97.
 *
 * ⚠⚠⚠ **THE MATRIX EXISTS SO SCOTT CAN SPLIT HOURLY FROM FIXED-PRICE LATER
 * WITHOUT A MIGRATION — NOT SO IT SHIPS FULL.** An override row nobody asked for
 * is a rate nobody chose, and it would be indistinguishable later from one he
 * set on purpose.
 *
 * ⚠ **IDEMPOTENT, AND IT NEVER OVERWRITES A RATE AN ADMIN HAS EDITED.** It
 * creates the row if the kind has no default; if one exists it is left exactly
 * as it is. ⚠⚠ Re-running this must not silently undo somebody's change — that
 * is the whole difference between a seed and a reset.
 */
async function main() {
  const kinds = Object.keys(BUILT_IN_COMMISSION_BPS) as (keyof typeof BUILT_IN_COMMISSION_BPS)[];
  for (const kind of kinds) {
    const existing = await prisma.applicationCommission.findFirst({
      where: { sourcing_kind: kind, transaction_type: null },
      select: { id: true, rate_bps: true },
    });
    if (existing) {
      console.log(`  ${kind.padEnd(16)} already set at ${existing.rate_bps} bps — left alone`);
      continue;
    }
    const row = await prisma.applicationCommission.create({
      data: {
        sourcing_kind: kind,
        transaction_type: null,
        rate_bps: BUILT_IN_COMMISSION_BPS[kind],
        note: "Seeded default (ruling 97). Applies to every transaction type for this sourcing kind.",
      },
      select: { rate_bps: true },
    });
    console.log(`  ${kind.padEnd(16)} created at ${row.rate_bps} bps`);
  }
  const total = await prisma.applicationCommission.count();
  console.log(`\napplication_commissions rows: ${total}  (3 defaults, no overrides — by design)`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e?.message ?? e);
    process.exit(1);
  });
