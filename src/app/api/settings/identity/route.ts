import { z } from "zod";
import { settingsWrite } from "@/lib/settings-api";
import { submitIdentity } from "@/lib/settings";

const Body = z.object({
  document: z.enum(["Passport", "Driving licence", "National ID card"]),
});

export const POST = (request: Request) =>
  settingsWrite(request, Body, (viewer, input) => submitIdentity(viewer, input.document));
