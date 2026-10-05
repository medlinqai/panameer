import { redirect } from "next/navigation";
import { getSessionViewer } from "@/lib/session";
import { getCompanyBinding } from "@/lib/company";
import { loadCompanyView } from "@/lib/company-view";
import { BrandingEditor } from "@/components/company/BrandingEditor";
import { CompanyShell } from "@/components/company/CompanyShell";
import { CompanyVisibility } from "@/components/company/CompanyVisibility";
import { CompanySection } from "@/components/company/CompanySection";

export const dynamic = "force-dynamic";
export const metadata = { title: "Company Branding · Panameer" };

// Company → Branding: logo, brand colour and theme preview (admins only).
export default async function Page() {
  const viewer = await getSessionViewer();
  if (!viewer) redirect("/login?callbackUrl=%2Fcompany%2Fbranding");
  const binding = await getCompanyBinding(viewer);
  if (!binding?.isAdmin) redirect("/company");
  const view = await loadCompanyView(binding.company.id);
  if (!view) redirect("/company");
  return (
    <CompanyShell c={view} role="admin" visibility={<CompanyVisibility on={view.showOnProfiles} canEdit />}>
      <CompanySection id="branding" title="Branding">
        <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-ink-2">
          Your logo sets your colour, and your colour themes the console for everyone at {view.name}. Panameer picks the structure so the result is always readable.
        </p>
        <div className="mt-5">
          <BrandingEditor companyName={view.name} logoUrl={view.logoUrl} initialHue={view.brandHue} initialRecipe={view.themeRecipe} />
        </div>
      </CompanySection>
    </CompanyShell>
  );
}
