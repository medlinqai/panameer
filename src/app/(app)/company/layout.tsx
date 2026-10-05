import { AreaTabs } from "@/components/casing/AreaTabs";
import { AREA_EYEBROW, companyTabs } from "@/lib/account-areas";
import { getSessionViewer } from "@/lib/session";
import { getCompanyBinding } from "@/lib/company";

// Company area: the tab row shows only for an approved member; admins get Branding + Terms too.
export default async function CompanyLayout({ children }: { children: React.ReactNode }) {
  const viewer = await getSessionViewer();
  const binding = viewer ? await getCompanyBinding(viewer) : null;
  const member = binding?.status === "APPROVED";
  return (
    <>
      {member && <AreaTabs eyebrow={AREA_EYEBROW.company} tabs={companyTabs(binding.isAdmin)} />}
      {children}
    </>
  );
}
