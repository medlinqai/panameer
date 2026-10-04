import { z } from "zod";
import { settingsWrite } from "@/lib/settings-api";
import { addBillingMethod, removeBillingMethod } from "@/lib/settings";

const Body = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("add"),
    kind: z.enum(["CARD", "PAYPAL", "BANK_DEBIT"]),
    label: z.string().trim().min(1, "Give it a name you'll recognise.").max(80),
    last4: z.string().trim().max(24).nullable().optional(),
  }).strict(),
  z.object({ action: z.literal("remove"), id: z.string().uuid() }).strict(),
]);

export const POST = (request: Request) =>
  settingsWrite(request, Body, (viewer, input) =>
    input.action === "add"
      ? addBillingMethod(viewer, input)
      : removeBillingMethod(viewer, input.id)
  );
