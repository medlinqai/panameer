import type { TaxType } from "@prisma/client";

export const TAX_LABELS: Record<TaxType, string> = {
  C_CORP: "C-Corporation",
  S_CORP: "S-Corporation",
  LLC: "LLC",
  PARTNERSHIP: "Partnership",
  SOLE_PROP_INDIVIDUAL: "Sole Proprietor / Individual",
  NONPROFIT: "Non-profit",
};

export const TAX_TYPE_VALUES = Object.keys(TAX_LABELS) as TaxType[];

export function isTaxType(v: string): v is TaxType {
  return (TAX_TYPE_VALUES as string[]).includes(v);
}
