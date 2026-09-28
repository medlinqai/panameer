import { prisma } from "@/lib/prisma";
import type { SourcingKind, TransactionType } from "@prisma/client";

/**
 * ── ⚠⚠⚠ THE PLATFORM'S COMMISSION, KEYED ON HOW MUCH SOURCING PANAMEER DID ──
 *
 * `P2-A15-E696`, ruling 97. ⚠⚠ **SCOTT, 2026-09-28: *"we need to have the
 * funding rates…editable in the panameer admin page."*** and *"Rates determined
 * by TRANSACTION_TYPE and at the time of transaction (meaning those rates per
 * type can change)."*
 *
 * ⚠⚠⚠ **THIS IS NOT THE ASSESSMENT'S FUNDING RATE.** That is `TaxRate`, it
 * multiplies EBITDA, and **it obeys the opposite lifetime rule** — see
 * `resolveCommissionBps` below.
 */

/**
 * ⚠⚠ THE BUILT-IN FLOOR, AND IT EXISTS FOR THE SAME REASON `DEFAULT_TAX_RATE_BPS`
 * DOES: a fresh database must resolve a rate rather than throw. ⚠ It reports
 * `fallback: true` so the admin page can say **the table is empty** instead of
 * showing a number as though somebody chose it.
 * ⚠⚠⚠ **IT IS NOT A FOURTH RATE AND MUST NOT DRIFT FROM THE SEEDED ROWS** —
 * `check:commissions` pins these three to the seed.
 */
export const BUILT_IN_COMMISSION_BPS: Record<SourcingKind, number> = {
  SOLE_SOURCED: 499,
  APP_SOURCED: 999,
  SERVICE_PRODUCT: 1499,
};

export type ResolvedCommission = {
  bps: number;
  /** ⚠ Which row answered — `null` when the kind's default row did. */
  transactionType: TransactionType | null;
  /** ⚠⚠ True when NO row matched and the built-in floor answered. */
  fallback: boolean;
};

/**
 * ── ⚠⚠ MOST SPECIFIC WINS — THE SAME SHAPE `/admin/tax-rates` ALREADY USES ───
 *
 * ⚠ A row naming the transaction type beats the kind's `null` row. That is
 * deliberately the geography-override pattern from the page beside this one, so
 * an admin arrives already knowing the rule.
 *
 * ⚠⚠⚠ **CALL THIS EXACTLY ONCE PER LINE, AT WORK ORDER CREATION, AND WRITE THE
 * ANSWER ONTO THE ROW. NOTHING MAY READ THIS TABLE AFTERWARDS.**
 * ⚠⚠ **THE TAX PAGE'S FOOTER STATES THE OPPOSITE RULE AND IS RIGHT TO:** *"a
 * change here applies to reports that have already been sent… the rate is a
 * current statement, not a historical one."* ⚠⚠⚠ **CORRECT FOR A REPORT.
 * CATASTROPHIC FOR A FEE: change 9.99 to 11 and every already-settled
 * transaction would silently reprice.** A fee is a term of a contract, and a
 * term that moves after signature is not a term.
 */
export async function resolveCommissionBps(
  kind: SourcingKind,
  transactionType: TransactionType
): Promise<ResolvedCommission> {
  const rows = await prisma.applicationCommission.findMany({
    where: {
      sourcing_kind: kind,
      OR: [{ transaction_type: transactionType }, { transaction_type: null }],
    },
    select: { transaction_type: true, rate_bps: true },
  });

  const specific = rows.find((r) => r.transaction_type === transactionType);
  if (specific) {
    return { bps: specific.rate_bps, transactionType, fallback: false };
  }
  const anyType = rows.find((r) => r.transaction_type === null);
  if (anyType) {
    return { bps: anyType.rate_bps, transactionType: null, fallback: false };
  }
  return { bps: BUILT_IN_COMMISSION_BPS[kind], transactionType: null, fallback: true };
}

/**
 * ⚠⚠⚠ WHICH KIND OF SOURCING THIS LINE WAS, FROM FACTS ALREADY ON THE ROW.
 *
 * ⚠ **THE ORDER MATTERS AND IT IS NOT ARBITRARY:** a service-product line is a
 * catalogue sale whether or not the buyer already knew the seller, so the
 * product test comes first. ⚠⚠ Only then does the buyer's declaration decide
 * between sole-sourced and app-sourced.
 *
 * ⚠⚠ **`supplier_part_id` IS THE PRODUCT TEST** — ruling `94c`: *"service
 * product → `supplier_part_id` + provider + price → `ASSIGNED`, skips
 * `SOURCING`."* A line carrying a catalogue part IS the catalogue sale.
 */
export function sourcingKindForLine(input: {
  soleSourced: boolean;
  supplierPartId: string | null;
}): SourcingKind {
  if (input.supplierPartId) return "SERVICE_PRODUCT";
  return input.soleSourced ? "SOLE_SOURCED" : "APP_SOURCED";
}

/** ⚠ `499` → `"4.99"`. One helper, so no screen does the arithmetic twice. */
export function bpsToPercentLabel(bps: number): string {
  return (bps / 100).toFixed(2);
}
