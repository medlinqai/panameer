import { z } from "zod";
import { settingsWrite } from "@/lib/settings-api";
import { saveTaxProfile } from "@/lib/settings";

/**
 * POST /api/settings/tax — the tax profile that gates withdrawals (E017).
 *
 * `signedName` is an attestation, which is why it is required and separate from
 * `legalName`: typing your own name under a statement is the signature, and a
 * form that pre-filled it would not be one.
 */
const Body = z.object({
  legalName: z.string().trim().min(2, "Enter the name on your tax records.").max(160),
  country: z.string().trim().min(2, "Where are you taxed?").max(80),
  asEntity: z.boolean(),
  tinLast4: z.string().trim().max(24).nullable().optional(),
  signedName: z.string().trim().min(2, "Type your name to sign.").max(160),
  /*
    ── ⚠ WHICH NUMBER, AND WHAT KIND OF PAYEE (`P1-ALL-E404` WS-2/WS-3) ───────

    ⚠⚠ THE KIND IS ASKED, NEVER GUESSED. A sole proprietor may legitimately give
    an SSN, and EIN and SSN have different impossible values — 666-45-6789 is an
    impossible SSN and a perfectly valid EIN. Inferring from the digits would
    reject real people.
    ⚠ Both optional so a W-8 payee, who files neither, is not forced to answer a
    W-9 question.
  */
  tinKind: z.enum(["EIN", "SSN"]).nullable().optional(),
  classification: z
    .enum(["C_CORP", "S_CORP", "LLC", "PARTNERSHIP", "SOLE_PROP_INDIVIDUAL", "NONPROFIT"])
    .nullable()
    .optional(),
});

export const POST = (request: Request) =>
  settingsWrite(request, Body, (viewer, input) => saveTaxProfile(viewer, input));
