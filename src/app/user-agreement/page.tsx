import { LegalPage } from "@/components/legal/LegalPage";
import { USER_TOS_VERSION } from "@/lib/tos";
import { USER_AGREEMENT_DOC } from "@/content/legal/user-agreement";
import { LEGAL_UPDATED } from "@/content/legal/meta";

export const metadata = { title: "User Agreement — Panameer" };

export default function Page() {
  return (
    <LegalPage
      title="User Agreement"
      version={USER_TOS_VERSION}
      updated={LEGAL_UPDATED}
      doc={USER_AGREEMENT_DOC}
      summary={
        "The binding agreement between you and Panameer: your account, how Work Orders between a Service Buyer and a Provider work, fees, payment and escrow, and how disputes are resolved."
      }
      self="user-agreement"
    />
  );
}
