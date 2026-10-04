import { LegalPlaceholder } from "@/components/legal/LegalPlaceholder";
import { COMPANY_TOS_VERSION } from "@/lib/tos";

export const metadata = { title: "Company Terms of Service — Panameer" };

export default function Page() {
  return (
    <LegalPlaceholder
      title="Company Terms of Service"
      version={COMPANY_TOS_VERSION}
      audience="terms a company's admin accepts on the entity's behalf"
      self="company-terms"
    />
  );
}
