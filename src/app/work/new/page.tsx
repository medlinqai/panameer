import { guardPage } from "@/lib/guard";
import { WorkRequestWizard } from "@/components/work/WorkRequestWizard";

/**
 * /work/new — the buyer's Work Request builder (brief_L). A focused full-screen
 * wizard (its own WizardShell, no app nav), reached standalone or as the
 * skippable first-request step at the end of buyer onboarding. AUTHORITATIVE
 * server gate: canHireTalent (brief_J). Business logic is in the API/lib.
 */
export default async function WorkNewPage() {
  await guardPage("canHireTalent");
  return <WorkRequestWizard />;
}
