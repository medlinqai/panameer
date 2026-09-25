import { z } from "zod";
import { settingsWrite } from "@/lib/settings-api";
import { updateContactInfo } from "@/lib/settings";

/** POST /api/settings/contact — name, phone and time zone (WS-H / E014). */
const Body = z.object({
  firstName: z.string().trim().min(1).max(80).optional(),
  lastName: z.string().trim().min(1).max(80).optional(),
  phone: z.string().trim().max(40).nullable().optional(),
  timeZone: z.string().trim().max(60).nullable().optional(),
  /*
    ── ⚠⚠ THE ADDRESS ARRIVES HERE (brief 10 WS-B) ────────────────────────

    ⚠ SCOTT: *"Edit Address → lives in Settings."* ⚠⚠ `Address.country` already
    exists as a column, so **country is a render-and-edit job, not a schema
    window** — measured before this was written.
    ⚠⚠⚠ **ZOD KEEPS ABSENT AND PRESENT APART BY CONSTRUCTION** (ruling 67): an
    omitted `address` stays `undefined` and `updateContactInfo` leaves the
    address alone, while a supplied object is written. **No `String()` coercion
    anywhere near it** — `67d`, which turns an absent key into the literal
    `"undefined"` and travels.
  */
  address: z
    .object({
      country: z.string().trim().max(60).optional(),
      line1: z.string().trim().max(200).optional(),
      line2: z.string().trim().max(200).optional(),
      city: z.string().trim().max(120).optional(),
      state: z.string().trim().max(120).optional(),
      postalCode: z.string().trim().max(32).optional(),
    })
    .optional(),
});

export const POST = (request: Request) =>
  settingsWrite(request, Body, (viewer, input) => updateContactInfo(viewer, input));
