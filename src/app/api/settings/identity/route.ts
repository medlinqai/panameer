import { z } from "zod";
import { settingsWrite } from "@/lib/settings-api";
import { submitIdentity } from "@/lib/settings";

/**
 * POST /api/settings/identity — start the IDV badge review (WS-H / E019).
 *
 * NO DOCUMENT IS UPLOADED. What is recorded is which document the person
 * intends to present; the capture, the selfie and the storage all belong to a
 * KYC partner that is explicitly deferred. Accepting an image here would mean
 * holding government ID in a bucket with no lawful basis and no deletion
 * schedule, which is a liability rather than a feature.
 */
const Body = z.object({
  document: z.enum(["Passport", "Driving licence", "National ID card"]),
});

export const POST = (request: Request) =>
  settingsWrite(request, Body, (viewer, input) => submitIdentity(viewer, input.document));
