import { ComingSoon } from "@/components/ComingSoon";
import { guardPage } from "@/lib/guard";

/**
 * Invite a provider to propose — a titled placeholder (WS-E).
 *
 * THERE IS NO WORK-INVITATION MODEL. `CoordinatorInvite` is a recruiter asking
 * to REPRESENT a provider — a different relationship — and wiring this button
 * to it would be fabrication by mislabelling, which is worse than an honest
 * "not yet". The share page names this destination, so it has to land
 * somewhere; this is that somewhere until the model exists.
 */
export const metadata = { title: "Invite a Provider · Panameer" };

export default async function Page() {
  await guardPage("canHireTalent");
  return <ComingSoon title="Invite a Provider to Propose" />;
}
