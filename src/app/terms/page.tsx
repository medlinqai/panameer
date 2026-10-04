import { LegalPage } from "@/components/legal/LegalPage";
import { USER_TOS_VERSION } from "@/lib/tos";
import { TERMS_DOC } from "@/content/legal/terms";
import { LEGAL_UPDATED } from "@/content/legal/meta";

export const metadata = { title: "Terms of Use — Panameer" };

export default function Page() {
  return (
    <LegalPage
      title="Terms of Use"
      version={USER_TOS_VERSION}
      updated={LEGAL_UPDATED}
      doc={TERMS_DOC}
      summary={
        "The rules for using panameer.com — what you may post, what you may not do here, and when we can take your access away."
      }
      self="terms"
    />
  );
}
