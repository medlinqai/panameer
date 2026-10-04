import { z } from "zod";
import { settingsWrite } from "@/lib/settings-api";
import { saveTaxProfile } from "@/lib/settings";

const Body = z.object({
  legalName: z.string().trim().min(2, "Enter the name on your tax records.").max(160),
  country: z.string().trim().min(2, "Where are you taxed?").max(80),
  asEntity: z.boolean(),
  tinLast4: z.string().trim().max(24).nullable().optional(),
  signedName: z.string().trim().min(2, "Type your name to sign.").max(160),
  tinKind: z.enum(["EIN", "SSN"]).nullable().optional(),
  classification: z
    .enum(["C_CORP", "S_CORP", "LLC", "PARTNERSHIP", "SOLE_PROP_INDIVIDUAL", "NONPROFIT"])
    .nullable()
    .optional(),
});

export const POST = (request: Request) =>
  settingsWrite(request, Body, (viewer, input) => saveTaxProfile(viewer, input));
