import { LegalPage } from "@/components/legal/LegalPage";
import { USER_TOS_VERSION } from "@/lib/tos";

export const metadata = { title: "Privacy Policy — Panameer" };

export default function Page() {
  return (
    <LegalPage
      title="Privacy Policy"
      version={USER_TOS_VERSION}
      audience="details of what Panameer collects and why"
    />
  );
}
