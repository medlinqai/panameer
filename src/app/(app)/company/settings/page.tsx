import { redirect } from "next/navigation";
import { getSessionViewer } from "@/lib/session";

export default async function Page() {
  const viewer = await getSessionViewer();
  if (!viewer) redirect("/login?callbackUrl=%2Fcompany");
  redirect("/company");
}
