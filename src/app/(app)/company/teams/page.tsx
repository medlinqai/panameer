import { redirect } from "next/navigation";
import { getSessionViewer } from "@/lib/session";
import { getCompanyBinding } from "@/lib/company";
import { ComingSoon } from "@/components/ComingSoon";

export const metadata = { title: "Company Teams · Panameer" };

export default async function Page() {
  const viewer = await getSessionViewer();
  if (!viewer) redirect("/login?callbackUrl=%2Fcompany");
  const binding = await getCompanyBinding(viewer);
  if (!binding?.isAdmin) redirect("/company");

  return <ComingSoon title="Company Teams" />;
}
