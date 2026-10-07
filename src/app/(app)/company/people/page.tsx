import { redirect } from "next/navigation";
import { getSessionViewer } from "@/lib/session";
import { getCompanyBinding } from "@/lib/company";
import { CompanyPeople } from "@/components/company/CompanyPeople";

export const dynamic = "force-dynamic";
export const metadata = { title: "Team · Panameer" };

export default async function CompanyPeoplePage() {
  const viewer = await getSessionViewer();
  if (!viewer) redirect("/login?callbackUrl=%2Fcompany%2Fpeople");
  const binding = await getCompanyBinding(viewer);
  if (!binding || binding.status !== "APPROVED") redirect("/company");
  return <CompanyPeople viewer={viewer} binding={binding} />;
}
