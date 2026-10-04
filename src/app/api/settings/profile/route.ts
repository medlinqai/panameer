import { z } from "zod";
import { settingsWrite } from "@/lib/settings-api";
import { updateProfileSettings } from "@/lib/settings";

const Body = z.object({
  paused: z.boolean().optional(),
  projectPreference: z
    .enum(["ANY", "SHORT_TERM", "LONG_TERM", "CONTRACT_TO_HIRE"])
    .nullable()
    .optional(),
  earningsPrivate: z.boolean().optional(),
  previewHidden: z.boolean().optional(),
  publicName: z.boolean().optional(),
  linkedGithub: z.string().trim().max(200).nullable().optional(),
  linkedStackoverflow: z.string().trim().max(200).nullable().optional(),
});

export const POST = (request: Request) =>
  settingsWrite(request, Body, (viewer, input) => updateProfileSettings(viewer, input));
