import { LegalPage } from "@/components/legal/LegalPage";
import { USER_TOS_VERSION } from "@/lib/tos";
import { TERMS_DOC } from "@/content/legal/terms";
import { LEGAL_UPDATED } from "@/content/legal/meta";

export const metadata = { title: "Terms of Use — Panameer" };

/**
 * The USER terms — accepted by each person at signup. Draft; see the banner.
 *
 * TITLED "TERMS OF USE" BECAUSE THAT IS WHAT THE DOCUMENT CALLS ITSELF. The
 * signup checkbox links to this route as both "Terms of Service" and "User
 * Agreement", and the loaded text treats Terms of Use as one part of a wider
 * Terms of Service — so those three names do not yet line up. Naming the page
 * after the document is the honest half of that; reconciling the set is
 * counsel's call, and is flagged in the brief rather than guessed at here.
 */
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
