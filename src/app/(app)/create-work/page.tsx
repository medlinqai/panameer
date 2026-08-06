import { redirect } from "next/navigation";
import { guardPage } from "@/lib/guard";
import { getSessionViewer } from "@/lib/session";
import { checkTransact } from "@/lib/guard";
import { CreateWorkRequest } from "@/components/work/CreateWorkRequest";

/**
 * Create a Work Request (brief_create_work_request_v1).
 *
 * Replaces the ComingSoon stub the requester rail was landing on.
 *
 * THE COMPANY GATE IS CHECKED HERE AND AGAIN IN THE API. A work request commits
 * a company, so the caller needs an approved membership on one that has
 * accepted the company terms. Redirecting from the page is the courtesy;
 * `checkTransact` inside every route is the boundary.
 */
export const metadata = { title: "Create a Work Request · Panameer" };

export default async function Page() {
  await guardPage("canHireTalent");
  const viewer = await getSessionViewer();
  if (!viewer) redirect("/login?callbackUrl=%2Fcreate-work");

  const transact = await checkTransact(viewer);
  if (!transact.ok) redirect(`/company?blocked=${transact.reason}`);

  return <CreateWorkRequest />;
}
