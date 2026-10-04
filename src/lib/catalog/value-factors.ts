
/** Mirrors `enum ValueFactorBasis` in schema.prisma. */
export const VALUE_FACTOR_BASES = [
  "SUPPLIER_SPEND",
  "CONTRACT_SPEND",
  "PURCHASING_HEADCOUNT",
  "REVENUE",
  "EBITDA",
  "FLAT",
] as const;

export type ValueFactorBasis = (typeof VALUE_FACTOR_BASES)[number];

export const BASIS_REQUIRES: Record<ValueFactorBasis, readonly string[]> = {
  SUPPLIER_SPEND: ["spendBand"],
  CONTRACT_SPEND: ["spendBand", "costLeverBand"],
  PURCHASING_HEADCOUNT: ["headcountBand"],
  REVENUE: ["revenueBand"],
  EBITDA: ["ebitdaBand"],
  FLAT: [],
};

export const factorUnit = (basis: ValueFactorBasis): "bps" | "cents" =>
  basis === "FLAT" ? "cents" : "bps";

/** True for a basis whose rate scales with something the buyer told us. */
export const isProportional = (basis: ValueFactorBasis) => basis !== "FLAT";
