import { notFound, redirect } from "next/navigation";
import { checkTransact, guardPage } from "@/lib/guard";
import { getSessionViewer } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { InviteToPropose } from "@/components/work/InviteToPropose";
import { getWorkRequestDetail } from "@/lib/work-request-lines";
import { invitedOn } from "@/lib/work-request-invite";
import { matchProvidersFor } from "@/lib/work-request-match";
import { WorkRequestError } from "@/lib/work-request";
import { BackLink } from "@/components/console/BackLink";

export const metadata = { title: "Invite a Provider · Panameer" };

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ line?: string }>;
}) {
  await guardPage("canHireTalent");
  const viewer = await getSessionViewer();
  const { id } = await params;
  if (!viewer)
    redirect(`/login?callbackUrl=${encodeURIComponent(`/work-requests/${id}/invite`)}`);

  const transact = await checkTransact(viewer);
  if (!transact.ok) {
    redirect(
      `/company?blocked=${transact.reason}&from=${encodeURIComponent(`/work-requests/${id}/invite`)}`
    );
  }

  let detail;
  try {
    detail = await getWorkRequestDetail(viewer, id);
  } catch (e) {
    if (e instanceof WorkRequestError && (e.code === "NOT_FOUND" || e.code === "NOT_A_BUYER"))
      notFound();
    throw e;
  }

  const [{ providers }, invited] = await Promise.all([
    matchProvidersFor(viewer, id),
    invitedOn(viewer, id),
  ]);

  const profiles = await prisma.providerProfile.findMany({
    where: { id: { in: providers.map((p) => p.profileId) } },
    select: { id: true, person_id: true },
  });
  const personOf = new Map(profiles.map((p) => [p.id, p.person_id]));

  const options = providers
    .map((p) => ({
      personId: personOf.get(p.profileId) ?? "",
      profileId: p.profileId,
      firstName: p.firstName,
      lastName: p.lastName,
      name: p.name,
      headline: p.headline,
      photoUrl: p.photoUrl,
      validated: p.validated,
      relevantSkills: p.relevantSkills,
      matchedSkillNames: p.matchedSkillNames,
    }))
    .filter((p) => p.personId);

  const { line } = await searchParams;

  return (
    <div className="mx-auto w-full max-w-4xl">
      <BackLink href={`/work-requests/${id}`} label={detail.title.trim() || "Work Request"} />
      <h1 className="mt-2 font-display text-[28px] font-bold tracking-[-0.5px]">
        Invite providers to bid
      </h1>
      <p className="mt-1.5 max-w-2xl text-[15px] leading-relaxed text-ink-2">
        Each provider you invite gets their own invitation to bid on one line, so
        you can compare like for like. Anyone else can still find the request and
        bid on it.
      </p>

      <div className="mt-7">
        <InviteToPropose
          workRequestId={id}
          lines={detail.lines.map((l) => ({
            id: l.id,
            lineNumber: l.lineNumber,
            description: l.description,
            invitedCount: l.invitedCount,
          }))}
          providers={options}
          initialLineId={
            // VALIDATED AGAINST THIS REQUEST'S OWN LINES. A `?line=` from a
            line && detail.lines.some((l) => l.id === line) ? line : null
          }
          alreadyInvitedPersonIds={invited.map((i) => i.personId)}
        />
      </div>
    </div>
  );
}
