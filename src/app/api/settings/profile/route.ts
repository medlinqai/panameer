import { z } from "zod";
import { settingsWrite } from "@/lib/settings-api";
import { updateProfileSettings } from "@/lib/settings";

/** POST /api/settings/profile — visibility and preferences (WS-H / E015). */
const Body = z.object({
  paused: z.boolean().optional(),
  projectPreference: z
    .enum(["ANY", "SHORT_TERM", "LONG_TERM", "CONTRACT_TO_HIRE"])
    .nullable()
    .optional(),
  earningsPrivate: z.boolean().optional(),
  aiTrainingOptIn: z.boolean().optional(),
  linkedGithub: z.string().trim().max(200).nullable().optional(),
  linkedStackoverflow: z.string().trim().max(200).nullable().optional(),
});

export const POST = (request: Request) =>
  settingsWrite(request, Body, (viewer, input) => updateProfileSettings(viewer, input));
