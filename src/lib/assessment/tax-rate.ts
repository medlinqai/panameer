import { prisma } from "@/lib/prisma";

/** The default the table is seeded with when it is empty. 18%. */
export const DEFAULT_TAX_RATE_BPS = 1800;

export type ResolvedRate = {
  bps: number;
  /** Which row answered: the state code, or null for the global default. */
  geography: string | null;
  /** True when no row existed at all and the built-in default was used. */
  fallback: boolean;
};

export async function resolveTaxRate(state?: string | null): Promise<ResolvedRate> {
  const rows = await prisma.taxRate.findMany({
    where: state ? { OR: [{ geography: state }, { geography: null }] } : { geography: null },
    select: { geography: true, rate_bps: true },
  });

  const override = state ? rows.find((r) => r.geography === state) : undefined;
  if (override) return { bps: override.rate_bps, geography: override.geography, fallback: false };

  const global = rows.find((r) => r.geography === null);
  if (global) return { bps: global.rate_bps, geography: null, fallback: false };

  return { bps: DEFAULT_TAX_RATE_BPS, geography: null, fallback: true };
}

export function fundingFromEbitda(
  ebitdaCents: [number, number],
  bps: number
): [number, number] {
  return [
    Math.round((ebitdaCents[0] * bps) / 10_000),
    Math.round((ebitdaCents[1] * bps) / 10_000),
  ];
}

export const bpsToPercent = (bps: number) => bps / 100;
export const percentToBps = (pct: number) => Math.round(pct * 100);
