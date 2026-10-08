import { followState } from "@/lib/follow";
import { FollowButton } from "@/components/community/FollowButton";
import Link from "next/link";
import { PageTabs } from "@/components/casing/PageTabs";
import { tabSequenceFor } from "@/lib/nav";
import { profileTabs, ACCOUNT_MENU_NAME } from "@/lib/profile-tabs";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ConnectProfile } from "@/components/community/ConnectProfile";
import { getProviderProfileView } from "@/lib/provider-profile-view";
import { getMyCommunity, mutualColleagueCount } from "@/lib/connections";
import { ConnectControls } from "@/components/community/ConnectControls";
import { BackButton } from "@/components/casing/BackButton";
import { viewerCanHire } from "@/lib/rate-visibility";
import { getSessionViewer } from "@/lib/session";
import { getPathsTaughtByProfile, getPathsTakenBy } from "@/lib/learn-home";
import { publicTestimonials } from "@/lib/recommendations";
import { getCommunitySignalForProfile } from "@/lib/community-signal";
import { canMessage } from "@/lib/messages";
import { recordProfileView } from "@/lib/profile-views";
import { MaskedProviderPage } from "@/components/public/MaskedProviderPage";
import { getMaskedProfile } from "@/lib/masked-profile";
import type { Metadata } from "next";

async function connectSlot(
  viewer: Awaited<ReturnType<typeof getSessionViewer>>,
  ownerUserId: string | null,
  isOwner: boolean
): Promise<{ connect?: React.ReactNode; mentor?: React.ReactNode; follow?: React.ReactNode }> {
  if (!viewer || !ownerUserId || isOwner) return {};

  const mine = await getMyCommunity(viewer);
  const colleague = [
    ...mine.colleagues.map((c) => ({ p: c.person, rel: "ACCEPTED" as const, id: c.connectionId })),
    ...mine.incoming.map((c) => ({ p: c.person, rel: "PENDING" as const, id: c.connectionId })),
    ...mine.outgoing.map((c) => ({ p: c.person, rel: "PENDING" as const, id: c.connectionId })),
  ].find((x) => x.p?.userId === ownerUserId);
  const incomingId = mine.incoming.find((c) => c.person?.userId === ownerUserId)?.connectionId;

  const following = mine.following.some((f) => f.person?.userId === ownerUserId);
  const common = {
    toUserId: ownerUserId,
    relation: colleague?.rel ?? null,
    incomingConnectionId: incomingId ?? null,
    isMentor: following,
    mentorStatus: following ? ("MENTOR" as const) : mine.mentorRequested.some((f) => f.person?.userId === ownerUserId) ? ("REQUESTED" as const) : null,
    tone: "block" as const,
  };
  const fs = await followState(viewer.userId, ownerUserId);
  return {
    connect: <ConnectControls {...common} part="colleague" />,
    mentor: <ConnectControls {...common} part="mentor" />,
    follow: <FollowButton toUserId={ownerUserId} initialFollowing={fs.following} initialCount={fs.followers} />,
  };
}

async function providerColleagueCount(userId: string | null): Promise<number> {
  if (!userId) return 0;
  return prisma.connection.count({
    where: {
      kind: "COLLEAGUE",
      status: "ACCEPTED",
      OR: [{ from_user_id: userId }, { to_user_id: userId }],
    },
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const p = await getMaskedProfile(id);
  const title = p?.title?.trim()
    ? `${p.title} — Panameer`
    : "Provider Profile — Panameer";
  const description = p
    ? [p.location, p.experience ? `${p.experience} experience` : null]
        .filter(Boolean)
        .join(" · ") || "An Oracle expert on Panameer."
    : "An Oracle expert on Panameer.";
  return {
    title,
    description,
    robots: { index: false, follow: true },
    openGraph: { title, description },
  };
}

export default async function PublicProviderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ as?: string }>;
}) {
  const { id } = await params;
  const { as } = await searchParams;
  const viewer = await getSessionViewer();
  // PROFILE360 , ruling 11 keeps the name)
  const wantsPeerPreview = as === "provider";

  // E049 — THE GATE, before the read.
  // SIGNED OUT NOW GETS A MASKED PREVIEW, NOT A LOGIN WALL
  if (!viewer) {
    return <MaskedProviderPage id={id} />;
  }

  const profile = await getProviderProfileView(id, {
    viewerUserId: viewer?.userId,
    viewer,
    previewAsPeer: wantsPeerPreview,
  });
  if (!profile) notFound();
  const previewAsPeer = profile.isOwner && wantsPeerPreview;

  const [taughtPaths, takenPaths, testimonials] = await Promise.all([
    getPathsTaughtByProfile(profile.id),
    getPathsTakenBy(profile.person.userId ?? null),
    publicTestimonials(profile.id),
  ]);

  await recordProfileView({
    profileId: profile.id,
    viewerUserId: viewer?.userId,
    isOwner: profile.isOwner,
  });

  const ownerUserId = profile.person.userId;
  const [, youBothKnow, messagePermission] = profile.isOwner
    ? [(await getMyCommunity(viewer)).colleagues.length, null, null]
    : await Promise.all([
        providerColleagueCount(ownerUserId),
        ownerUserId ? mutualColleagueCount(viewer, ownerUserId) : null,
        ownerUserId ? canMessage(viewer, ownerUserId) : null,
      ]);

  return (
    <div className="flex min-h-full flex-col">
      {}
      {}
      {}
      {/* Masked surname is blurred in the name itself (Scott 2026-10-08: "blur, don't bar"). */}
      {!profile.isOwner && (
        <div className="mx-auto w-full max-w-6xl px-4 pt-4 sm:px-6">
          <BackButton fallback="/connect/community" />
        </div>
      )}

      {}

      {}
      {}
      {}
      {profile.isOwner && (
        <PageTabs
          wrap
          eyebrow={ACCOUNT_MENU_NAME}
          sequence={tabSequenceFor("/profile")}
          tabs={profileTabs(viewer)}
          current="/profile"
        />
      )}

      {}
      {profile.isOwner && (
        <div className="border-b border-line bg-canvas px-4 py-2.5 text-[13.5px] text-ink-2 sm:px-6">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2">
            {}
            <span>
              {previewAsPeer ? "This Is How Other Providers See You" : "This Is How Buyers See You"}
            </span>
            {}
            <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <Link
                href={previewAsPeer ? `/providers/${id}` : `/providers/${id}?as=provider`}
                className="font-semibold text-magenta hover:underline"
              >
                {previewAsPeer ? "See What Buyers See" : "Profile360"}
              </Link>
              <Link
                href="/profile"
                className="font-semibold text-magenta hover:underline"
              >
                &larr; Back to My Profile
              </Link>
            </span>
          </div>
        </div>
      )}

      <main className="flex-1">
        {/* THE `<h1>` COMES BACK BY ITSELF ( WS-D item 3) */}
        {/* name card carries name, title and location only. */}
        {/* THE SAME CLEAN SURFACE, BECAUSE THE COMPONENT IS SHARED */}
        <div className="account-surface">
        <ConnectProfile
          p={profile}
          taughtPaths={taughtPaths}
          takenPaths={takenPaths}
          testimonials={testimonials}
          community={await getCommunitySignalForProfile(profile.id)}
          youBothKnow={youBothKnow}
          messagePermission={messagePermission}
          // WHO SEES `Hire`
          canHire={!profile.isOwner && viewerCanHire(viewer)}
          {...(await connectSlot(viewer, profile.person.userId, profile.isOwner))}
          // THE BUYER'S VIEW, ALWAYS. `isOwner` stays true on the view
          // BOTH previews — a peer sees no owner tools either. The rate
          previewAsBuyer
        />
        </div>
      </main>
    </div>
  );
}
