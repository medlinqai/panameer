import { prisma } from "@/lib/prisma";
import type { SourcingKind, TransactionType } from "@prisma/client";

export const BUILT_IN_COMMISSION_BPS: Record<SourcingKind, number> = {
  SOLE_SOURCED: 499,
  APP_SOURCED: 999,
  SERVICE_PRODUCT: 1499,
};

export type ResolvedCommission = {
  bps: number;
  transactionType: TransactionType | null;
  fallback: boolean;
};

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

export function sourcingKindForLine(input: {
  soleSourced: boolean;
  supplierPartId: string | null;
}): SourcingKind {
  if (input.supplierPartId) return "SERVICE_PRODUCT";
  return input.soleSourced ? "SOLE_SOURCED" : "APP_SOURCED";
}

export function bpsToPercentLabel(bps: number): string {
  return (bps / 100).toFixed(2);
}
