import { redirect } from "next/navigation";
import { getSessionViewer } from "@/lib/session";

export default async function RequesterReadyPage() {
  const viewer = await getSessionViewer();
  if (!viewer) redirect("/login?callbackUrl=/dashboard");
  redirect("/dashboard");
}
