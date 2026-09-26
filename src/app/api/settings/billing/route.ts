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
    /*
      ── ⚠⚠⚠ CARD EXPIRY IS NO LONGER ACCEPTED (`P2-A2-E672`) ──────────────

      ⚠⚠ **WS-D AND RULING 32 FORBID IT IN TERMS:** *"NO card number, CVV or
      expiry may be typed into, transmitted by, logged by or stored by
      Panameer code."* ⚠ This endpoint accepted `expMonth`/`expYear` and
      `settings.ts` wrote them to `billing_methods`, **while no UI anywhere
      collected them** — so it was an API-only capability: any signed-in member
      could POST card expiry and Panameer would store it.
      ⚠⚠⚠ **THAT IS EXACTLY THE THING FOUND LATER BY SOMEBODY WHO IS NOT US**
      (Scott, 2026-09-26). Found by `E670`'s verification pass, not by a gate —
      nothing in `scripts/` tests for a card field.

      ⚠ **PRE-EXISTING, NOT A REGRESSION** — first shipped in `b571b5d`
      (WS-H / `E016`). ⚠ **0 `BillingMethod` rows exist and 0 hold an expiry**,
      so removing the capability destroys nothing.
      ⚠⚠ **THE SCHEMA KEEPS `exp_month` / `exp_year` — ruling 38 IS
      ADDITIVE-ONLY AND A DROP IS NOT ADDITIVE.** The columns are now orphaned
      by construction: no reader, no writer, no route. Recorded rather than
      dropped.
      ⚠⚠ **`.strict()` IS NOW SET — see the block below.** ⚠ SUPERSEDED,
      quoted not deleted (`E164`), and it was true for exactly one commit:
      //   ⚠ `.strict()` is NOT set on this schema, so an unknown key is
      //   IGNORED rather than refused — a caller still sending `expMonth`
      //   gets a 200 and the value goes nowhere.
      ⚠ SUPERSEDED, quoted not deleted (`E164`):
      //   expMonth: z.number().int().min(1).max(12).nullable().optional(),
      //   expYear: z.number().int().min(2024).max(2100).nullable().optional(),
    */
    /*
      ── ⚠⚠⚠ `.strict()` — AN UNKNOWN KEY IS REFUSED, NOT IGNORED (`P2-A2-E677`) ──

      ⚠⚠ **WITHOUT IT, A CALLER STILL SENDING `expMonth` GOT A `200` FOR A WRITE
      THAT DID NOT HAPPEN.** ⚠⚠⚠ **A SUCCESS RESPONSE FOR A SILENT NO-OP IS A
      LIE TO THE CALLER** — Scott, 2026-09-26 — *"same family as a gate that
      asserts nothing."* Both report success for work nobody did.
      ⚠ It also makes `E672`'s removal enforceable rather than merely done:
      the field is now **rejected at the boundary**, so it cannot quietly come
      back by a client starting to send it again.
    */
  }).strict(),
  z.object({ action: z.literal("remove"), id: z.string().uuid() }).strict(),
]);

export const POST = (request: Request) =>
  settingsWrite(request, Body, (viewer, input) =>
    input.action === "add"
      ? addBillingMethod(viewer, input)
      : removeBillingMethod(viewer, input.id)
  );
