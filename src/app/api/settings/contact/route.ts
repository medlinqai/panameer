import { z } from "zod";
import { settingsWrite } from "@/lib/settings-api";
import { updateContactInfo } from "@/lib/settings";

/** POST /api/settings/contact — name, phone and time zone (WS-H / E014). */
const Body = z.object({
  firstName: z.string().trim().min(1).max(80).optional(),
  lastName: z.string().trim().min(1).max(80).optional(),
  phone: z.string().trim().max(40).nullable().optional(),
  timeZone: z.string().trim().max(60).nullable().optional(),
});

export const POST = (request: Request) =>
  settingsWrite(request, Body, (viewer, input) => updateContactInfo(viewer, input));
