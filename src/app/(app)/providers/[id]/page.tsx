import { notFound, redirect } from "next/navigation";
import { ProviderProfileViewPage } from "@/components/profile/ProviderProfileView";
import { getProviderProfileView } from "@/lib/provider-profile-view";
import { getMyCommunity } from "@/lib/connections";
import { ConnectControls } from "@/components/community/ConnectControls";
import { getSessionViewer } from "@/lib/session";
import { getPathsTaughtByProfile } from "@/lib/learn-home";
import { publicTestimonials } from "@/lib/recommendations";
import { getCommunitySignalForProfile } from "@/lib/community-signal";

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

export default async function PublicProviderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const viewer = await getSessionViewer();

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
  });
  if (!profile) notFound();

  const [taughtPaths, testimonials] = await Promise.all([
    getPathsTaughtByProfile(profile.id),
    publicTestimonials(profile.id),
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
      <main className="flex-1">
        <ProviderProfileViewPage
          p={profile}
          taughtPaths={taughtPaths}
          testimonials={testimonials}
          community={await getCommunitySignalForProfile(profile.id)}
          {...(await connectSlot(viewer, profile.person.userId, profile.isOwner))}
        />
      </main>
    </div>
  );
}
