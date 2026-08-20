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
  /*
    ⚠ `from=` AS WELL AS `blocked=` (P1-J1.2-E004). The reason names which door
    closed; it does NOT name where the person was. `/company` now renders the
    company form inline and sends them back afterwards, and without this it would
    have to guess — two different callers redirect here with NO_COMPANY, so a
    guess would send half of them somewhere they had never been.
  */
  if (!transact.ok) {
    redirect(`/company?blocked=${transact.reason}&from=${encodeURIComponent("/create-work")}`);
  }

  return <CreateWorkRequest />;
}
