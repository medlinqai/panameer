import { redirect } from "next/navigation";
import { guardPage } from "@/lib/guard";
import { getSessionViewer } from "@/lib/session";
import { checkTransact } from "@/lib/guard";
import { CreateWorkRequest } from "@/components/work/CreateWorkRequest";
import { missingIdentityForPerson } from "@/lib/work-request";
import { requirementFor } from "@/lib/work-request-identity";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Create a Work Request · Panameer" };

export default async function Page() {
  await guardPage("canHireTalent");
  const viewer = await getSessionViewer();
  if (!viewer) redirect("/login?callbackUrl=%2Fcreate-work");

  const transact = await checkTransact(viewer);
  if (!transact.ok) {
    redirect(`/company?blocked=${transact.reason}&from=${encodeURIComponent("/create-work")}`);
  }

  // THE UI MIRROR OF THE POST GATE
  const person = await prisma.person.findFirst({
    where: { user_id: viewer.userId },
    select: { id: true },
  });
  const identityGaps = person
    ? (await missingIdentityForPerson(person.id)).map(requirementFor)
    : [];

  return <CreateWorkRequest identityGaps={identityGaps} />;
}
