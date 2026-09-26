/**
 * ── ⚠⚠⚠ THE BUSINESS TYPES, IN ONE PLACE (`P2-A2-E661`) ──────────────────
 *
 * ⚠⚠ **THE LABELS ALREADY EXISTED AS A PRIVATE `const` INSIDE
 * `(app)/company/page.tsx`** and nothing else could read them. The company
 * editor needs the SAME six, the PATCH route needs to validate against them,
 * and a page cannot export a map to an API route — ⚠⚠⚠ **so without this file
 * the six values would have been written out THREE TIMES** (`E585`).
 *
 * ⚠ **THE KEYS MIRROR `enum TaxType` IN `schema.prisma`, AND THE TYPE IS WHAT
 * KEEPS THEM HONEST:** `Record<TaxType, string>` means **adding a value to the
 * enum without labelling it here is a COMPILE ERROR**, not a blank dropdown
 * entry discovered by a member. ⚠⚠ That is the pattern Scott asks to be reached
 * for before a gate: *"a forgetful sender being a compile error rather than a
 * silent gap is worth more than any check we could write after the fact."*
 *
 * ⚠ The `SOLE_PROP_INDIVIDUAL` wording is the schema's own rule, inherited
 * rather than re-invented: *"A sole proprietor is a COMPANY OF ONE, not a
 * separate kind of user. There is deliberately no 'individual' path anywhere in
 * the product."*
 */
import type { TaxType } from "@prisma/client";

export const TAX_LABELS: Record<TaxType, string> = {
  C_CORP: "C-Corporation",
  S_CORP: "S-Corporation",
  LLC: "LLC",
  PARTNERSHIP: "Partnership",
  SOLE_PROP_INDIVIDUAL: "Sole Proprietor / Individual",
  NONPROFIT: "Non-profit",
};

/**
 * ⚠⚠ THE VALIDATION LIST, DERIVED FROM THE LABELS RATHER THAN RETYPED.
 * ⚠⚠⚠ **A FREE-TEXT BOX POSTING INTO AN ENUM COLUMN IS A DOOR ONTO A WALL
 * (`E579`)** — Prisma rejects an unknown value at the database, so the member
 * gets a 500 rather than a refusal that tells them anything. ⚠ Found by LOOKING
 * at the rendered form: the first version of the company editor shipped
 * `Business Type` as a plain `<input>`.
 */
export const TAX_TYPE_VALUES = Object.keys(TAX_LABELS) as TaxType[];

export function isTaxType(v: string): v is TaxType {
  return (TAX_TYPE_VALUES as string[]).includes(v);
}
