import { LegalPlaceholder } from "@/components/legal/LegalPlaceholder";
import { COMPANY_TOS_VERSION } from "@/lib/tos";

export const metadata = { title: "Company Terms of Service — Panameer" };

/**
 * The COMPANY ToS — a second, separate agreement, accepted by a company's admin
 * on the entity's behalf. It is what lets the company do business on Panameer;
 * the user terms only bind the person.
 */
export default function Page() {
  return (
    <LegalPlaceholder
      title="Company Terms of Service"
      version={COMPANY_TOS_VERSION}
      audience="terms a company's admin accepts on the entity's behalf"
    />
  );
}
