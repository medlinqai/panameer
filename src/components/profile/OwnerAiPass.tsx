"use client";

import { useRouter } from "next/navigation";
import { AiPassPanel } from "@/components/onboarding/AiPassPanel";
import { ResumeImportAction } from "@/components/onboarding/ResumeImportAction";

/**
 * The AI pass on a LIVE provider's own profile (E129).
 *
 * A thin client wrapper so `ProviderProfileView` (a server component) can offer
 * it without becoming a client component itself. Rendered only for the owner,
 * only when work history is empty — the caller enforces both.
 *
 * On success it refreshes the server component rather than patching state: this
 * page reads the profile from the database, so the refresh IS the update, and
 * hand-maintaining a second copy of the work history in client state is how the
 * two would drift.
 */
export function OwnerAiPass() {
  const router = useRouter();
  return (
    <AiPassPanel
      compact
      heading="No work history on your profile yet"
      reasons={[
        "If you uploaded a résumé, our reader may have missed a layout it couldn't follow. We can have another go at it.",
      ]}
      onUpload={() => router.push("/join/provider?step=tell_us&return=review")}
      onManual={() => router.push("/join/provider?step=tell_us&return=review")}
      onApplied={() => router.refresh()}
    />
  );
}

/**
 * The persistent "Import from résumé" action for the published profile's Work
 * History header (E132). Refreshes the server component on success, since this
 * page reads the profile from the database.
 */
export function OwnerResumeImport() {
  const router = useRouter();
  return <ResumeImportAction onApplied={() => router.refresh()} />;
}

/**
 * ── ⚠⚠ THE RE-RUN OFFER, IN THE GAPS PANEL (`P2-J14-E561` WS-A) ────────────
 *
 * ⚠ SAME COMPONENT, SAME ROUTE, SAME CONFIRM — only the presentation differs.
 * ⚠⚠ THERE IS NO SECOND BUTTON AND NO SECOND ENTRY POINT: this REPLACES the
 * `Import from résumé` that sat in the profile's Work History header. The
 * WIZARD's copy of that header is untouched.
 */
export function OwnerResumeRerun() {
  const router = useRouter();
  return (
    <ResumeImportAction
      label="Update from my résumé"
      showContext
      onApplied={() => router.refresh()}
    />
  );
}
