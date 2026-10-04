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
): Promise<{ connect?: React.ReactNode; mentor?: React.ReactNode }> {
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
    tone: "outline" as const,
  };
  return {
    connect: <ConnectControls {...common} part="colleague" />,
    mentor: <ConnectControls {...common} part="mentor" />,
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
  /*
    ── ⚠⚠⚠ PROFILE360 (`P2-A2-E616`, ruling 11 keeps the name) ─────────────

    ⚠⚠ SCOTT, 2026-09-23: *"where my profile page gets flipped 360 to be
    viewable for another provider."*

    ⚠ MEASURED 2026-09-24, and it is why this brief is smaller than it reads:
    **the peer view already existed.** `E598` shipped the rate rule Scott ruled
    on 09-24 — `provider-profile-view.ts` withholds a rate from anyone without
    `canHireTalent`, and `check:visitor-profile` proves it live
    (*"rate figure 210.00 — owner true · buyer true · provider false"*).
    ⚠⚠ **WHAT DID NOT EXIST IS A WAY FOR THE OWNER TO SEE IT.** This route
    hard-coded `previewAsBuyer`, so an owner could preview one of the two
    non-owner views and not the other — and **61 of 62 members are providers**,
    so the view they could not preview is the one almost everybody uses.

    ⚠ A QUERY PARAMETER, NOT A ROUTE. The route set does not move, nothing new
    needs registering in `route-access.ts`, and the page a peer actually lands
    on is byte-identical to the page the owner previews — which is the only way
    a preview can be trusted.
    ⚠⚠ IT IS OWNER-ONLY BY CONSTRUCTION: `previewAsPeer` is `profile.isOwner &&
    …` below, so a stranger appending `?as=provider` changes nothing about what
    they were already going to see.
  */
  const wantsPeerPreview = as === "provider";

  /*
    E049 — THE GATE, before the read.

    Ahead of the DB call on purpose: an anonymous request should not spend a
    query on a record it is not going to be shown, and doing it here means the
    profile payload is never even assembled for a viewer who cannot have it.

    A callback so signing in lands back on the profile they were trying to open
    — the gate is meant to cost an account, not the click.
  */
  /*
    ── ⚠⚠⚠ SIGNED OUT NOW GETS A **MASKED PREVIEW**, NOT A LOGIN WALL ────────
                                                        (`P2-A1.1-E738` WS-A)

    ⚠ SCOTT, 2026-10-01, approving the mockup: *"that is awesome. do it."* The
    brief: *"Signed out, `/providers/[id]` shows the masked profile per the
    mockup, not a redirect to sign-in. Signed in, it shows the full profile
    exactly as today."*

    ⚠⚠ **THE OLD REDIRECT IS WHAT MADE A SHARE LINK WORTHLESS.** `E049` gated
    this route so nobody could walk from an `/explore` teaser to a surname — the
    right call, and the masking it protected is now enforced a layer deeper, in
    `lib/masked-profile.ts`, where the name is **not in the payload at all.**
    ⚠⚠⚠ **SO THE GATE IS NOT BEING WEAKENED; IT IS BEING MOVED FROM THE ROUTE TO
    THE TYPE.** A route gate protects one URL. A type that has no `lastName`
    field protects every surface that ever reads it.

    ⚠ SUPERSEDED, quoted not deleted (`E164`) — the redirect, and `E049`'s
    reasoning for it, which is preserved in the page's header comment:
    //   if (!viewer) {
    //     redirect(`/login?callbackUrl=${encodeURIComponent(`/providers/${id}`)}`);
    //   }

    ⚠⚠ **NOTHING BELOW THIS BLOCK RUNS FOR A VISITOR**, which is what keeps the
    rest of the page — `getProviderProfileView`, `recordProfileView`,
    `getMyCommunity`, `canMessage` — untouched and signed-in-only. ⚠ In
    particular **NO PROFILE-VIEW ROW IS WRITTEN FOR A SIGNED-OUT VISITOR**
    (Scott, 2026-10-01: *"no profile-view write for signed-out visitors"*), and
    it is guaranteed by the early return rather than by a flag.
  */
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
      {profile.identityMasked && (
        <div className="border-b border-line bg-canvas px-4 py-2.5 text-center text-[13.5px] text-ink-2 sm:px-6">
          Showing <span className="font-semibold text-ink">first name only</span>.
          Full name and contact details are shared once you engage this provider.
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
        {/*
          ── ⚠⚠⚠ THE `<h1>` COMES BACK BY ITSELF (`E602` WS-D item 3) ─────────

          ⚠ MEASURED AT THE PREMISE CHECK: this page had **no `<h1>` at all**,
          and the cause is exact. `ConnectProfile` renders the name as an `<h2>`
          for the OWNER and an `<h1>` for a visitor, because — in its own words —
          *"the OWNER's `<h1>` is the tab row's (`E600` WS-A); a visitor has no
          row, so the name is the page's title there."*
          ⚠⚠ ON THIS ROUTE THE OWNER GOT THE `<h2>` **AND THERE WAS NO TAB ROW**,
          so the promised `<h1>` existed nowhere. Two correct rules met and left
          a hole between them.
          ⚠⚠⚠ `previewAsBuyer` CLOSES IT WITHOUT A NEW HEADING: the owner now
          gets the visitor branch, which carries the real `<h1>`.
          ⚠ SUPERSEDED, quoted not deleted (`E164`) — an `sr-only` heading added
          here first, which produced TWO `<h1>`s once the visitor branch supplied
          its own. **A duplicate heading is a worse defect than the one it fixed.**
          //   <h1 className="sr-only">
          //     {`${profile.person.firstName} ${profile.person.lastName}`.trim()}
          //     {profile.headline ? ` — ${profile.headline}` : ""}
          //   </h1>
        */}
        {/* ⚠ `colleagueCount` IS NO LONGER A PROP (`P2-A2-E600` WS-B) — the
              name card carries name, title and location only. ⚠ SUPERSEDED,
              quoted not deleted (`E164`):
              //   colleagueCount={colleagueCount} */}
        {/*
          ── ⚠⚠⚠ THE SAME CLEAN SURFACE, BECAUSE THE COMPONENT IS SHARED (`P2-A2-E713`) ──

          ⚠⚠ **`ConnectProfile` RENDERS BOTH THE OWNER'S `/profile` AND THIS BUYER-FACING
          PAGE**, so `WS-A`'s restyle reaches here whether or not the wrapper is added.
          ⚠⚠⚠ **WITHOUT THE WRAPPER THIS PAGE WOULD GET THE BOXLESS SECTIONS AND KEEP
          COMFORTAA HEADINGS — half the redesign, which is worse than either whole.**
          ⚠ **AND IT IS THE `VISITOR VIEW` THE BRIEF'S STOP GATE ASKS FOR:** *"the owner view
          AND the visitor view (visitor view has no empty sections…)"*. There is nowhere else
          to photograph a visitor looking at a profile.
          ⚠⚠ **REPORTED: `/providers/[id]` IS NOT AN "ACCOUNT INFORMATION" PAGE**, so this is a
          consequence of the shared component rather than a page this brief set out to change.
          Stated so it is not a surprise.
        */}
        <div className="account-surface">
        <ConnectProfile
          p={profile}
          taughtPaths={taughtPaths}
          takenPaths={takenPaths}
          testimonials={testimonials}
          community={await getCommunitySignalForProfile(profile.id)}
          youBothKnow={youBothKnow}
          messagePermission={messagePermission}
          /*
            ── ⚠⚠⚠ WHO SEES `Hire` (`P2-A8-E719`) ──────────────────────────────────────────

            ⚠ **A SIGNED-IN MEMBER WHO CAN BUY AND IS NOT THE OWNER.** `hasCapability(viewer,
            "canHireTalent")` is the same capability the API route guards on and the same
            column `resolveBuyer` reads — `access.ts:110`, literally `is_service_buyer`.
            ⚠⚠ **`!profile.isOwner` IS SEPARATE AND IS SCOTT'S RULE:** *"Owner preview: no
            Hire."* An owner who is also a buyer would otherwise be offered a button that
            sole-sources themselves — which the server refuses anyway (`OWN_PROFILE`), but a
            control that always errors is worse than no control.
            ⚠⚠⚠ **IT COVERS THE `?as=provider` PREVIEW TOO**, because that path keeps
            `profile.isOwner` true on the view model by design (`E598`) — so the one condition
            answers both previews without a second flag.
            ⚠ A signed-out visitor never reaches here: the page redirects before this.
          */
          canHire={!profile.isOwner && viewerCanHire(viewer)}
          {...(await connectSlot(viewer, profile.person.userId, profile.isOwner))}
          /* ⚠⚠⚠ THE BUYER'S VIEW, ALWAYS. `isOwner` stays true on the view
             model — the bar above needs it and `recordProfileView` still must
             not write a view row for the owner (`E598`) — but every owner
             AFFORDANCE is suppressed at `ConnectProfile`'s single owner point. */
          /* ⚠ `previewAsBuyer` SUPPRESSES OWNER AFFORDANCES and is true for
             BOTH previews — a peer sees no owner tools either. ⚠⚠ The rate
             difference is decided in the view model, not here, so there is one
             rate rule and this component never learns it. */
          previewAsBuyer
        />
        </div>
      </main>
    </div>
  );
}
