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
  /*
    ── ⚠⚠⚠ `aiTrainingOptIn` NO LONGER ACCEPTED (ruling 78c) ───────────────

    ⚠ Ruling 78 deleted the AI Data Training card. ⚠⚠ **THE COLUMN STAYS**
    (dropping it is ruling 41's register entry 5, on trunk) — ⚠⚠⚠ **BUT THE
    WRITE PATH CANNOT.** With the card gone, this endpoint could still be POSTed
    directly to set the consent **while no surface anywhere could withdraw it**:
    a consent that can be GIVEN and not TAKEN BACK, which is the exact state
    78a exists to prevent.
    ⚠ **MEASURED 2026-09-25 BEFORE DECIDING: `ai_training_opt_in = true` on 0 of
    63 provider profiles.** Nothing to clear — so this closes the door rather
    than cleaning up after it.
    ⚠⚠ **IT IS NOT A VALIDITY CHANGE FOR ANY LIVE CALLER.** The only caller was
    the deleted card; an unknown key is simply ignored by the schema.
    ⚠ SUPERSEDED, quoted not deleted (`E164`):
    //   aiTrainingOptIn: z.boolean().optional(),
  */
  linkedGithub: z.string().trim().max(200).nullable().optional(),
  linkedStackoverflow: z.string().trim().max(200).nullable().optional(),
});

export const POST = (request: Request) =>
  settingsWrite(request, Body, (viewer, input) => updateProfileSettings(viewer, input));
