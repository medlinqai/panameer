import { guardPage } from "@/lib/guard";
import { getSessionViewer } from "@/lib/session";
import { getMyTeams, incomingRosterInvites, rosterCoverage } from "@/lib/teams";
import { hasCapability } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import {
  ProviderTeamSections,
  RecruiterTeamSections,
} from "@/components/community/TeamSections";
import { PageTabs } from "@/components/casing/PageTabs";
import { tabSequenceFor } from "@/lib/nav";
import { connectTabs } from "@/lib/connect-tabs";
import { unreadCount } from "@/lib/messages";

export const metadata = { title: "My Teams · Panameer" };

export default async function MyTeamsPage() {
  await guardPage("authenticated");
  const unreadViewer = await getSessionViewer();
  const unread = unreadViewer ? await unreadCount(unreadViewer) : 0;
  const viewer = await getSessionViewer();
  const teams = viewer
    ? await getMyTeams(viewer)
    : { represents: [], pendingInvites: [], representedBy: null, isCoordinator: false };

  const canProvide = viewer ? hasCapability(viewer, "canProvideServices") : false;
  const canCoordinateTeams = viewer ? hasCapability(viewer, "canCoordinate") : false;

  const invites = viewer ? await incomingRosterInvites(viewer) : [];

  const mePerson = viewer
    ? await prisma.person.findUnique({
        where: { user_id: viewer.userId },
        select: { id: true },
      })
    : null;
  const coverage =
    canCoordinateTeams && mePerson ? await rosterCoverage(mePerson.id) : [];

  const roster = [
    ...teams.represents.map((m) => ({
      key: m.profileId,
      name: m.name,
      headline: m.headline,
      photoUrl: m.photoUrl,
      consent: "accepted" as const,
    })),
    ...teams.pendingInvites.map((i) => ({
      key: i.id,
      name: i.name ?? i.email,
      headline: null,
      photoUrl: null,
      consent: "awaiting" as const,
    })),
  ];

  const recruitersKnown = [
    ...(teams.representedBy ? [teams.representedBy] : []),
    ...invites.map((i) => i.recruiter),
  ];

  return (
    <>
      {}
      {}
      {}
      <PageTabs
        wrap
        eyebrow="CONNECT" sequence={tabSequenceFor("/connect")} tabs={connectTabs(viewer, unread)} current="/community/teams" />
      <div className="mx-auto max-w-4xl space-y-4">
      <header>
        <h1 className="font-display text-[26px] font-bold tracking-[-0.5px]">
          My Teams
        </h1>
        <p className="mt-1.5 max-w-2xl text-[15px] leading-relaxed text-ink-2">
          The providers you represent, and the recruiter who represents you.
        </p>
      </header>

      {}
      {canProvide && (
        <ProviderTeamSections
          representedBy={teams.representedBy}
          invites={invites}
          recruitersKnown={recruitersKnown}
        />
      )}

      {canCoordinateTeams && (
        <RecruiterTeamSections roster={roster} coverage={coverage} />
      )}

      {!canProvide && !canCoordinateTeams && (
        <p className="text-[14px] leading-relaxed text-ink-2">
          Teams are for providers and recruiters. Your account is neither, so
          there is nothing here for you yet.
        </p>
      )}
    </div>
    </>
  );
}
