import { LegalPage } from "@/components/legal/LegalPage";
import { USER_TOS_VERSION } from "@/lib/tos";

export const metadata = { title: "Terms of Service — Panameer" };

/** The USER ToS — accepted by each person at signup. */
export default function Page() {
  return (
    <LegalPage
      title="Terms of Service"
      version={USER_TOS_VERSION}
      audience="terms every Panameer user agrees to at signup"
    />
  );
}
