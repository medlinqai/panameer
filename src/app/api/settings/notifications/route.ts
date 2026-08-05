import { z } from "zod";
import { settingsWrite } from "@/lib/settings-api";
import { setNotificationPref } from "@/lib/settings";

/** POST /api/settings/notifications — one category's channels (WS-H / E020). */
const Body = z.object({
  category: z.string().min(1),
  inApp: z.boolean().optional(),
  email: z.boolean().optional(),
  sms: z.boolean().optional(),
});

export const POST = (request: Request) =>
  settingsWrite(request, Body, (viewer, input) =>
    setNotificationPref(viewer, input.category, input)
  );
