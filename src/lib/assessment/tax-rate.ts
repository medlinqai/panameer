import { prisma } from "@/lib/prisma";

/**
 * THE FUNDING RATE — Phase 1's entire tax logic (WS-C).
 *
 * Funding = EBITDA x rate. That is it. The brief is explicit that the
 * sophisticated multi-lever calculation is Phase 2, post-CPA, and that Phase 1
 * ships a rate times a number — so this module resolves a rate and multiplies,
 * and there is nowhere else in the codebase that reasons about tax.
 *
 * ⚠ THE RATE IS DATA, NOT A CONSTANT. It lives in the `tax_rates` table and is
 * editable by a Panameer Admin from day one: a global default plus optional
 * per-geography overrides. Scott refines both later, and a hard-coded 0.18
 * would make that a code change, a deploy, and a conversation with an engineer
 * about a number that is his to set.
 *
 * BASIS POINTS. 18% is 1800 — exact. Storing 0.18 as a float and multiplying
 * money by it is how a funding figure ends in ...9999.
 */

/** The default the table is seeded with when it is empty. 18%. */
export const DEFAULT_TAX_RATE_BPS = 1800;

export type ResolvedRate = {
  bps: number;
  /** Which row answered: the state code, or null for the global default. */
  geography: string | null;
  /** True when no row existed at all and the built-in default was used. */
  fallback: boolean;
};

/**
 * Most specific wins: a row for the state, else the global row, else the
 * built-in default.
 *
 * The built-in fallback exists so a fresh database renders a report rather than
 * throwing — but it reports `fallback: true` so the admin page can say the
 * table is empty instead of showing 18% as though somebody chose it.
 */
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

/**
 * The funding figure: EBITDA x rate, as a range because EBITDA is a band.
 *
 * Returned unlabelled and uncaveated — the report renders it as a number with
 * no "estimate" tag, per the locked decision that Scott manages this claim. The
 * honesty rail is that the RATE is config, visible and editable, not that the
 * UI hedges it.
 */
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
