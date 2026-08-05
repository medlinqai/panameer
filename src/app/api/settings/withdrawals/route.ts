import { z } from "zod";
import { settingsWrite } from "@/lib/settings-api";
import { addPayoutMethod, removePayoutMethod } from "@/lib/settings";

/**
 * POST /api/settings/withdrawals — payout methods (WS-H / E017).
 *
 * The tax gate lives in the LIB, not here. A disabled button is a courtesy; the
 * rule has to hold for a request that never saw the button.
 */
const Body = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("add"),
    kind: z.enum(["BANK_ACCOUNT", "PAYPAL", "WIRE"]),
    label: z.string().trim().min(1, "Give it a name you'll recognise.").max(80),
    last4: z.string().trim().max(34).nullable().optional(),
    country: z.string().trim().min(2, "Where does the money land?").max(80),
  }),
  z.object({ action: z.literal("remove"), id: z.string().uuid() }),
]);

export const POST = (request: Request) =>
  settingsWrite(request, Body, (viewer, input) =>
    input.action === "add"
      ? addPayoutMethod(viewer, input)
      : removePayoutMethod(viewer, input.id)
  );
