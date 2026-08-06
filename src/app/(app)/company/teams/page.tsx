import { redirect } from "next/navigation";
import { getSessionViewer } from "@/lib/session";
import { getCompanyBinding } from "@/lib/company";
import { ComingSoon } from "@/components/ComingSoon";

/**
 * Company Teams — a titled placeholder the company menu can land on (E214).
 *
 * The route, its title and its gate are real; only the content is pending. The
 * gate is the point: this is a company-administration surface, so it checks the
 * same APPROVED + ADMIN membership the chip uses to decide whether to offer the
 * menu at all. A placeholder that anyone can open would make the menu's
 * admin-only rule a UI suggestion rather than a boundary.
 */
export const metadata = { title: "Company Teams · Panameer" };

export default async function Page() {
  const viewer = await getSessionViewer();
  if (!viewer) redirect("/login?callbackUrl=%2Fcompany");
  const binding = await getCompanyBinding(viewer);
  if (!binding?.isAdmin) redirect("/company");

  return <ComingSoon title="Company Teams" />;
}
