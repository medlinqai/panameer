import { redirect } from "next/navigation";
import { getSessionViewer } from "@/lib/session";
import { getCompanyBinding } from "@/lib/company";
import { CompanyTerms } from "@/components/company/CompanyTerms";

export const dynamic = "force-dynamic";
export const metadata = { title: "Company Terms · Panameer" };

export default async function CompanyTermsPage() {
  const viewer = await getSessionViewer();
  if (!viewer) redirect("/login?callbackUrl=%2Fcompany%2Fterms");
  const binding = await getCompanyBinding(viewer);
  if (!binding || binding.status !== "APPROVED") redirect("/company");
  if (!binding.isAdmin) redirect("/company");
  return (
    <div className="mx-auto w-full max-w-[1010px] pb-12">
      <CompanyTerms binding={binding} />
    </div>
  );
}
