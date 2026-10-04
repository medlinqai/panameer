import { guardPage } from "@/lib/guard";
import { getSecurity } from "@/lib/security-settings";
import { SecurityPanel } from "@/components/settings/SecurityPanel";

export const metadata = { title: "Password & Security · Panameer" };

export default async function SecurityPage() {
  const viewer = await guardPage("authenticated");
  const security = await getSecurity(viewer);
  return <SecurityPanel security={security} />;
}
