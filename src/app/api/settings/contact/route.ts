import { z } from "zod";
import { settingsWrite } from "@/lib/settings-api";
import { updateContactInfo } from "@/lib/settings";

const Body = z.object({
  firstName: z.string().trim().min(1).max(80).optional(),
  lastName: z.string().trim().min(1).max(80).optional(),
  phone: z.string().trim().max(40).nullable().optional(),
  timeZone: z.string().trim().max(60).nullable().optional(),
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
