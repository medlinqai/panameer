import { LegalPage } from "@/components/legal/LegalPage";
import { USER_TOS_VERSION } from "@/lib/tos";
import { PRIVACY_DOC } from "@/content/legal/privacy";
import { LEGAL_UPDATED } from "@/content/legal/meta";

export const metadata = { title: "Privacy Policy — Panameer" };

export default function Page() {
  return (
    <LegalPage
      title="Privacy Policy"
      version={USER_TOS_VERSION}
      updated={LEGAL_UPDATED}
      doc={PRIVACY_DOC}
      summary={
        "What Panameer collects about you, where it comes from, what we use it for, who we share it with, and the choices you have."
      }
      self="privacy"
    />
  );
}
