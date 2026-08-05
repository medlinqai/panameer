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
});

export const POST = (request: Request) =>
  settingsWrite(request, Body, (viewer, input) => saveTaxProfile(viewer, input));
