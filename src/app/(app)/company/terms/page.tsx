import { redirect } from "next/navigation";
import { getSessionViewer } from "@/lib/session";
import { getCompanyBinding } from "@/lib/company";
import { loadCompanyView } from "@/lib/company-view";
import { CompanyShell } from "@/components/company/CompanyShell";
import { CompanyVisibility } from "@/components/company/CompanyVisibility";
import { CompanyTerms } from "@/components/company/CompanyTerms";

export const dynamic = "force-dynamic";
export const metadata = { title: "Company Terms · Panameer" };

export default async function CompanyTermsPage() {
  const viewer = await getSessionViewer();
  if (!viewer) redirect("/login?callbackUrl=%2Fcompany%2Fterms");
  const binding = await getCompanyBinding(viewer);
  if (!binding || binding.status !== "APPROVED") redirect("/company");
  if (!binding.isAdmin) redirect("/company");
  const view = await loadCompanyView(binding.company.id);
  if (!view) redirect("/company");
  return (
    <CompanyShell c={view} role={binding.isAdmin ? "admin" : "member"} visibility={<CompanyVisibility on={view.showOnProfiles} canEdit={binding.isAdmin} />}>
      <CompanyTerms binding={binding} />
    </CompanyShell>
  );
}
