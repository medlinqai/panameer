import { redirect } from "next/navigation";
import { guardPage } from "@/lib/guard";
import { getSessionViewer } from "@/lib/session";
import { checkTransact } from "@/lib/guard";
import { CreateWorkRequest } from "@/components/work/CreateWorkRequest";
import { missingIdentityForPerson } from "@/lib/work-request";
import { requirementFor } from "@/lib/work-request-identity";
import { prisma } from "@/lib/prisma";

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

  /*
    ── ⚠⚠ THE UI MIRROR OF THE POST GATE (`P1-J4-E025`) ───────────────────────

    ⚠ A MIRROR, NOT THE BOUNDARY. `postWorkRequest` runs the identical check
    server-side and refuses regardless of what this page renders; the API is
    reachable without ever loading this component. This exists so a requester
    learns what is missing BEFORE they write a whole request, rather than at the
    Post button.
    ⚠ IT READS THE SAME FUNCTION — `missingIdentityForPerson` — so the two
    cannot disagree about the rule, and the strings come from the same table.
  */
  const person = await prisma.person.findFirst({
    where: { user_id: viewer.userId },
    select: { id: true },
  });
  const identityGaps = person
    ? (await missingIdentityForPerson(person.id)).map(requirementFor)
    : [];

  return <CreateWorkRequest identityGaps={identityGaps} />;
}
