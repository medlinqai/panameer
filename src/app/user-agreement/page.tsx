import { LegalPage } from "@/components/legal/LegalPage";
import { USER_TOS_VERSION } from "@/lib/tos";
import { USER_AGREEMENT_DOC } from "@/content/legal/user-agreement";
import { LEGAL_UPDATED } from "@/content/legal/meta";

export const metadata = { title: "User Agreement — Panameer" };

/**
 * The User Agreement (brief_user_agreement WS-A).
 *
 * The longest of the four documents and the one the other two keep pointing at:
 * the Terms of Use sends you to "Section 7 of our User Agreement" and the
 * Privacy Policy defines Service Buyer, Provider and Recruiter "as defined in
 * the User Agreement". Both citations were dead until this route existed.
 *
 * `/user-agreement` IS A NEW ROUTE, AND IT DOES NOT REPLACE `/company-terms`.
 * The brief allows for the two being the same thing; they are not. This is the
 * agreement a PERSON accepts at signup, versioned by `USER_TOS_VERSION`.
 * `/company-terms` is the separate agreement a company's admin accepts on the
 * entity's behalf, versioned by `COMPANY_TOS_VERSION`, with its own acceptance
 * flow on the company page — and still an unwritten placeholder, because no
 * text has been provided for it.
 *
 * Sections anchor on their numbers (`#section-7`), not their titles, so a
 * reworded heading cannot break an inbound citation.
 */
export default function Page() {
  return (
    <LegalPage
      title="User Agreement"
      version={USER_TOS_VERSION}
      updated={LEGAL_UPDATED}
      doc={USER_AGREEMENT_DOC}
      self="user-agreement"
    />
  );
}
