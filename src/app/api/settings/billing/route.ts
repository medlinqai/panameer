import { z } from "zod";
import { settingsWrite } from "@/lib/settings-api";
import { addBillingMethod, removeBillingMethod } from "@/lib/settings";

/**
 * POST /api/settings/billing — add or remove a billing method (WS-H / E016).
 *
 * One route, two actions, discriminated in the body: a DELETE with a payload is
 * awkward in fetch and a second route for "remove" would duplicate the gate for
 * six lines of difference. NO CARD NUMBERS — the lib stores a label and the
 * last four, and there is nowhere in this codebase that a PAN could lawfully go.
 */
const Body = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("add"),
    kind: z.enum(["CARD", "PAYPAL", "BANK_DEBIT"]),
    label: z.string().trim().min(1, "Give it a name you'll recognise.").max(80),
    last4: z.string().trim().max(24).nullable().optional(),
    expMonth: z.number().int().min(1).max(12).nullable().optional(),
    expYear: z.number().int().min(2024).max(2100).nullable().optional(),
  }),
  z.object({ action: z.literal("remove"), id: z.string().uuid() }),
]);

export const POST = (request: Request) =>
  settingsWrite(request, Body, (viewer, input) =>
    input.action === "add"
      ? addBillingMethod(viewer, input)
      : removeBillingMethod(viewer, input.id)
  );
