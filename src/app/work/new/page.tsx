import { guardPage, guardTransact } from "@/lib/guard";
import { WorkRequestWizard } from "@/components/work/WorkRequestWizard";

/**
 * /work/new — the buyer's Work Request builder (brief_L). A focused full-screen
 * wizard (its own WizardShell, no app nav), reached standalone or as the
 * skippable first-request step at the end of buyer onboarding. AUTHORITATIVE
 * server gate: canHireTalent (brief_J). Business logic is in the API/lib.
 */
export default async function WorkNewPage() {
  const viewer = await guardPage("canHireTalent");
  /*
    THE COMPANY GATE (brief_company_model WS4). Two different questions, asked
    in order: canHireTalent is "is this a buyer", and the company gate is "do
    they have an entity to contract as". A work request commits a COMPANY, so a
    buyer with no approved membership — or whose company hasn't accepted the
    company terms — has nothing to commit. Denials land on /company with the
    reason rather than a blank refusal.
  */
  await guardTransact(viewer);
  return <WorkRequestWizard />;
}
