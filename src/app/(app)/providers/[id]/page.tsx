import Link from "next/link";
import { PageTabs } from "@/components/casing/PageTabs";
import { tabSequenceFor } from "@/lib/nav";
import { profileTabs } from "@/lib/profile-tabs";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
/*
  ⚠⚠ THE TWO PROFILE COMPONENTS CONVERGE HERE (`P2-J3-E588` WS-B). This page
  now renders the SAME `ConnectProfile` the owner sees at `/community`, in
  visitor mode.

  ── ⚠⚠⚠ `ProviderProfileView.tsx` WAS DELETED ON 2026-09-21 ────────────────

  ⚠ SCOTT RULED THE DELETION (`P2-A2-E598` premise work, closing out `E597`
  WS-D): it had **zero live imports since `E588`** — measured, not assumed —
  and 46KB of unrendered code was still attracting assertions.
  ⚠⚠ THIS IS A NARROW, NAMED EXCEPTION TO `E164`, NOT A NEW HABIT. Rule 13
  applies: the newest dated statement from Scott is the live one, and he gave
  the replacement wording himself. ⚠⚠⚠ **GIT HOLDS THE HISTORY** — the file is
  recoverable at any commit up to `d7a9c94`.
  ⚠ SUPERSEDED, quoted not deleted (`E164`) — the import, and the note that
  used to promise the file would stay:
  // import { ProviderProfileViewPage } from "@/components/profile/ProviderProfileView";
  // ⚠ `ProviderProfileView.tsx` STAYS ON DISK, unimported — every removed
  //   component does. `check:community` GUARD 3 still reads its source for the
  //   `community?: CommunitySignal | null` prop contract.
  ⚠⚠ THAT SECOND CLAIM IS ALSO SUPERSEDED: `E597` WS-D re-pointed GUARD 3 —
  and `check:review-edit` and `check:recruiter` — off the dead file and onto
  the profile the route actually renders, via `scripts/_profile-surface.ts`.
  ⚠⚠⚠ RE-POINTING THOSE GATES IS WHAT MADE THE DELETION SAFE; doing it in the
  other order would have taken three assertions down with the file.
*/
import { ConnectProfile } from "@/components/community/ConnectProfile";
import { getProviderProfileView } from "@/lib/provider-profile-view";
import { getMyCommunity, mutualColleagueCount } from "@/lib/connections";
import { ConnectControls } from "@/components/community/ConnectControls";
import { getSessionViewer } from "@/lib/session";
import { getPathsTaughtByProfile, getPathsTakenBy } from "@/lib/learn-home";
import { publicTestimonials } from "@/lib/recommendations";
import { getCommunitySignalForProfile } from "@/lib/community-signal";
import { canMessage } from "@/lib/messages";
import { recordProfileView } from "@/lib/profile-views";

/**
 * Provider profile — a marketplace surface, BEHIND LOGIN as of E049.
 *
 * IT USED TO BE PUBLIC, and that quietly undid the masking everywhere else.
 * /explore had just been built to show first names only, with every card CTA
 * routed through /login precisely so nobody could walk from a teaser to a
 * surname — and this page rendered the full profile, surname included, to
 * anyone with the URL. A mask that one guessable route removes is not a mask;
 * it is a convention. The route is the boundary now.
 *
 * WHAT SIGNING IN BUYS, AND WHAT IT DOES NOT. An account gets the profile —
 * headline, skills, work history, packages, testimonials, rate. It does NOT get
 * the surname or the contact details: those are transaction-tier, gated in the
 * lib by `identityVisibility`. So there are three levels now, each a real step:
 * anonymous sees the teaser, an account sees the expertise, an engagement sees
 * the person.
 *
 * Renders server-side straight from the lib (still API-first: logic lives in
 * src/lib/provider-profile-view). The lib enforces the visibility gate
 * (brief_K), so a hidden profile 404s — but the owner always sees their own.
 *
 * NOW THE BRANDED VIEW (brief_buyer_profileview). This page rendered
 * `ProfileView` — the older, plainer component — while `/profile` rendered
 * `ProviderProfileView` under E155. Two renderings of one record, and the buyer
 * got the worse one: no testimonials, none of the branded hero, none of the
 * work-history disclosures. A provider polishing their profile was looking at a
 * page no buyer would ever see.
 *
 * OWNER AFFORDANCES ARE ALREADY CONDITIONAL, which is why this is a swap rather
 * than a new read-only variant. `getProviderProfileView` sets `isOwner` from the
 * session, and the component keys the "you're live" banner, the completeness
 * meter, the freshness nudge, Edit Profile, the résumé re-read and every
 * per-section edit link off that one flag. A visitor gets the same page with
 * none of them.
 *
 * THE DATE→ISO NOTE IS GONE BECAUSE ITS REASON IS. It warned that
 * `getPublicProviderProfile` returns Date objects while `PublicProviderProfile`
 * is typed for the wire, and cast through `unknown` to reconcile the two. Both
 * sides are server-side here and share one inferred type, so there is nothing to
 * serialize and nothing to cast.
 */
/**
 * ⚠ THE CONNECT SLOT (`P1-ALL-E374` WS-3) — resolved here because THIS is the
 * page that knows it is showing somebody else. `/profile` and `/join/provider`
 * render the same component and pass nothing.
 *
 * ⚠ IT DECIDES NOTHING. `getMyCommunity` already computed both relations in
 * `lib/connections.ts`; this reads them and hands the component a node. The
 * server re-checks every rule on the way in regardless.
 */
async function connectSlot(
  viewer: Awaited<ReturnType<typeof getSessionViewer>>,
  ownerUserId: string | null,
  isOwner: boolean
): Promise<{ connect?: React.ReactNode }> {
  /* ⚠ A control you cannot press is noise — own profile renders none. */
  if (!viewer || !ownerUserId || isOwner) return {};

  const mine = await getMyCommunity(viewer);
  const colleague = [
    ...mine.colleagues.map((c) => ({ p: c.person, rel: "ACCEPTED" as const, id: c.connectionId })),
    ...mine.incoming.map((c) => ({ p: c.person, rel: "PENDING" as const, id: c.connectionId })),
    ...mine.outgoing.map((c) => ({ p: c.person, rel: "PENDING" as const, id: c.connectionId })),
  ].find((x) => x.p?.userId === ownerUserId);
  const incomingId = mine.incoming.find((c) => c.person?.userId === ownerUserId)?.connectionId;

  return {
    connect: (
      <ConnectControls
        toUserId={ownerUserId}
        relation={colleague?.rel ?? null}
        incomingConnectionId={incomingId ?? null}
        isMentor={mine.following.some((f) => f.person?.userId === ownerUserId)}
      />
    ),
  };
}

/**
 * ⚠ HOW MANY ACCEPTED COLLEAGUES **THIS PROVIDER** HAS. ⚠⚠ NOT
 * `getMyCommunity`, WHICH ANSWERS FOR THE VIEWER — asking the viewer's graph
 * about somebody else's profile is how a count ends up describing the wrong
 * person. ⚠ A `COLLEAGUE` row is undirected, so both columns are read.
 */
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
  if (!viewer) {
    redirect(`/login?callbackUrl=${encodeURIComponent(`/providers/${id}`)}`);
  }

  /*
    THE SAME GATE, IN THE SAME PLACE. The lib returns null for a profile that
    isn't marketplace-visible unless the viewer owns it, and null is a 404 —
    unchanged from the previous implementation, which applied the identical
    predicate inside `getPublicProviderProfile`.

    `viewer` is passed whole as well as by id because the WS5 Plus gate decides
    at the read whether the contact address is in the payload at all.
  */
  const profile = await getProviderProfileView(id, {
    viewerUserId: viewer?.userId,
    viewer,
    /* ⚠ The preview only applies to the owner — see `wantsPeerPreview` above.
       ⚠⚠ `getProviderProfileView` re-derives `isOwner` itself, so this cannot
       be used to widen anybody else's view. */
    previewAsPeer: wantsPeerPreview,
  });
  if (!profile) notFound();
  /* ⚠ Resolved AFTER the read, because only the read knows who owns this. */
  const previewAsPeer = profile.isOwner && wantsPeerPreview;

  /*
    ⚠ `takenPaths` IS THE PROFILE OWNER'S ENROLMENTS, NOT THE VIEWER'S
    (`E593` WS-B item 17). ⚠⚠ `LearnEnrollment` is keyed on `user_id`, and the
    user whose paths belong on this page is the one the page is ABOUT —
    `p.userId`, never the session. Reading the viewer's would show a stranger
    their own courses under somebody else's name.
  */
  const [taughtPaths, takenPaths, testimonials] = await Promise.all([
    getPathsTaughtByProfile(profile.id),
    getPathsTakenBy(profile.person.userId ?? null),
    publicTestimonials(profile.id),
  ]);

  /*
    ── ⚠⚠ THE THREE VISITOR FACTS (`P2-J3-E588` WS-B) ────────────────────────

    ⚠ `colleagueCount` is THIS PROVIDER'S accepted colleagues — the same real
    count the owner sees of their own, asked about somebody else.
    ⚠ `youBothKnow` is the shared set, and it is a REAL QUERY (the owner's
    `Viewing Me` is the one with no data behind it).
    ⚠⚠ `messagePermission` COMES FROM `canMessage`, WHICH IS BYTE-UNCHANGED.
    The button reads the verdict; it does not re-derive the colleague rule.
    ⚠ All three are skipped on the owner's own page, where they are meaningless
    — and `getMyCommunity` is the viewer's own graph, so asking it about
    themselves would answer a different question.
  */
  /*
    ── ⚠⚠ RECORD THE VIEW (`P0-E595` A2) ────────────────────────────────────

    ⚠ THIS IS THE ONLY WRITE PATH. It is here rather than in a client effect
    because a view is *"a deliberate visit to a profile"*, and the server render
    of this page IS that visit — an effect would also miss anyone with
    JavaScript disabled and fire twice under StrictMode.
    ⚠⚠ SAFE TO CALL DURING RENDER: `@@unique([profile_id, viewer_person_id,
    viewed_on])` makes it idempotent, so a re-render, a refresh or a back-button
    all collapse onto the row that already exists. ⚠ `isOwner` is passed so the
    owner's own visit is never counted, and the helper never throws into the page.
  */
  await recordProfileView({
    profileId: profile.id,
    viewerUserId: viewer?.userId,
    isOwner: profile.isOwner,
  });

  const ownerUserId = profile.person.userId;
  /* ⚠ `colleagueCount` IS NO LONGER RENDERED (`P2-A2-E600` WS-B) — Layout A's
     name card is name, title and location. ⚠ The other two are unchanged.
     ⚠ SUPERSEDED, quoted not deleted (`E164`):
     //   const [colleagueCount, youBothKnow, messagePermission] = … */
  const [, youBothKnow, messagePermission] = profile.isOwner
    ? [(await getMyCommunity(viewer)).colleagues.length, null, null]
    : await Promise.all([
        providerColleagueCount(ownerUserId),
        ownerUserId ? mutualColleagueCount(viewer, ownerUserId) : null,
        ownerUserId ? canMessage(viewer, ownerUserId) : null,
      ]);

  return (
    <div className="flex min-h-full flex-col">
      {/*
        The public chrome stays. This page is reachable signed-out, so it keeps
        its own thin header rather than the app shell — a buyer arriving from a
        search result is not a signed-in user and should not meet a console.
      */}
      {/*
        E049 — SAY WHY THE NAME IS SHORT. A profile showing one name with no
        explanation reads as missing data, and the reader's next thought is
        that the record is incomplete rather than that it is protected.
      */}
      {profile.identityMasked && (
        <div className="border-b border-line bg-bg-soft px-4 py-2.5 text-center text-[13.5px] text-ink-2 sm:px-6">
          Showing <span className="font-semibold text-ink">first name only</span>.
          Full name and contact details are shared once you engage this provider.
        </div>
      )}

      {/*
        THE BESPOKE HEADER IS GONE (brief_nav_casing_consistency WS-B).

        This page carried its own sticky bar — a "Panameer" wordmark linking
        home and a "Browse Experts" link. That was a third menu: not the
        marketing header, not the casing, just for this route. The page now
        lives inside the (app) route group, so AppShell supplies the rail,
        header and footer like every other authenticated page.

        THE URL IS UNCHANGED. `(app)` is a route group and adds no segment, so
        /providers/[id] still resolves here — no redirect, no broken links.

        AUTHED, per Scott: it stays behind login, which is what keeps E049
        closed. /explore masks to first names precisely so nobody can walk from
        a teaser to a surname, and this page renders the full profile.
      */}

      {/*
        No wrapper container: `ProviderProfileViewPage` brings its own max-w-6xl
        frame, and nesting it inside another would leave the main column
        narrower here than on /profile — the same record looking like two
        different pages, which is the bug this commit closes.

        `taughtPaths` is passed IN rather than rendered after it. The component
        already places the courses strip below the sections (E137); rendering it
        here as well would print it twice.
      */}
      {/*
        ── ⚠⚠⚠ THE OWNER'S ONE WAY BACK (`P2-A2-E602` WS-D item 2) ────────────

        ⚠ SCOTT: *"The owner gets one way back: 'This Is How Buyers See You —
        Back to My Profile'."*
        ⚠⚠ IT RENDERS **ONLY** FOR THE OWNER, and it is the ONLY thing on this
        page that knows who is looking — every other owner affordance is
        suppressed by `previewAsBuyer` below. ⚠⚠⚠ THAT IS THE WHOLE SHAPE OF
        THE FIX: the page does not pretend the owner is a stranger, it stops
        OFFERING them their own tools while calling itself the buyer's view.
        ⚠ It replaces the *"See What Buyers See"* button that used to render
        here — a link to the page you were already standing on (`E023`).
      */}
      {/*
        ── ⚠⚠ THE PROFILE TAB ROW RENDERS HERE TOO (`E602` WS-D item 4) ──────
        ⚠ `E600` WS-A's rule: there is never a page under the avatar with no
        row. ⚠⚠ MEASURED: this page drew none — the same defect `E600` WS-A
        found on `/company`.
        ⚠⚠⚠ OWNER ONLY, AND THAT IS NOT AN EXCEPTION TO THE RULE — the row is
        `My Profile · Score · Stats · …`, which are the OWNER's destinations. A
        buyer looking at somebody else's profile has no business being offered
        them, and `profileTabs(viewer)` would be answering about the wrong
        person. ⚠ For a visitor this is not "a page with no row"; it is not one
        of the owner's pages at all.
      */}
      {profile.isOwner && (
        <PageTabs
          eyebrow="MY PROFILE"
          sequence={tabSequenceFor("/profile")}
          tabs={profileTabs(viewer)}
          current="/profile"
        />
      )}

      {profile.isOwner && (
        <div className="border-b border-line bg-bg-soft px-4 py-2.5 text-[13.5px] text-ink-2 sm:px-6">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2">
            {/* ⚠⚠ THE BAR NAMES WHICH VIEW THIS IS (`P2-A2-E616`). With two
                previews on one route, *"This Is How Buyers See You"* would be
                false half the time — and a preview that misnames itself is
                worse than no preview. */}
            <span>
              {previewAsPeer ? "This Is How Other Providers See You" : "This Is How Buyers See You"}
            </span>
            {/* ⚠⚠⚠ THE WAY BACK, AND THE WAY ACROSS (`E602`'s lesson: a link
                that drops a member into a walk they cannot leave is a defect).
                ⚠ Both render at every width — they are plain links in a
                `flex-wrap` row, which is what makes 360px behave. */}
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
        <ConnectProfile
          p={profile}
          taughtPaths={taughtPaths}
          takenPaths={takenPaths}
          testimonials={testimonials}
          community={await getCommunitySignalForProfile(profile.id)}
          youBothKnow={youBothKnow}
          messagePermission={messagePermission}
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
      </main>
    </div>
  );
}
