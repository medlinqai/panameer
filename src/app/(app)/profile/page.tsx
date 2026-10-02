import { redirect } from "next/navigation";
import { getSessionViewer } from "@/lib/session";
import { EmployeeProfile } from "@/components/profile/EmployeeProfile";
import { FreeLine } from "@/components/marketing/FreeLine";
import { PageTabs } from "@/components/casing/PageTabs";
import { tabSequenceFor } from "@/lib/nav";
import { profileTabs, ACCOUNT_MENU_NAME } from "@/lib/profile-tabs";
import { ConnectProfile } from "@/components/community/ConnectProfile";
import { getOwnProviderProfileView } from "@/lib/provider-profile-view";
import { ensureSlug } from "@/lib/public-slug";
import { getPathsTaughtByProfile, getPathsTakenBy } from "@/lib/learn-home";
/* ⚠ `getUsageStats` AND `countProfileViews` ARE NO LONGER CALLED HERE
   (`P2-A2-E600` WS-B) — the page rule keeps usage and statistics off My
   Profile. ⚠ Both functions are untouched and still serve their own pages.
   ⚠ SUPERSEDED, quoted not deleted (`E164`):
   //   import { getUsageStats } from "@/lib/usage-stats";
   //   import { countProfileViews } from "@/lib/profile-views"; */
import { publicTestimonials } from "@/lib/recommendations";
import { getCommunitySignalForProfile } from "@/lib/community-signal";
import { buildCompletenessInput } from "@/lib/onboarding";
import { computeProfileScore } from "@/lib/completeness";
/* ⚠ `P2-A3-E599` WS-C 4 — the `Grow` card's one-liner shows the owner's own
   score and rank. Computed HERE, on the owner's page, and never passed to
   `/providers/[id]` — the same rule the usage comb followed. */
import { growthBoard, growthScore, rankFor } from "@/lib/growth-score";

/**
 * ── ⚠⚠⚠ `/profile` IS THE OWNER'S PROFILE (`P2-A2-E598` WS-B) ─────────────
 *
 * ⚠ SCOTT, 2026-09-21, on the option-B mockup: *"Yeah...that is much better. It
 * belongs back there."* Earlier the same day: *"way too much on this page… I may
 * just go back to putting my profile under the avatar in the upper right (with
 * the picture)."*
 *
 * ⚠⚠ THE PROFILE IS NOW AN ACCOUNT-MENU DESTINATION, LIKE LINKEDIN'S "ME" — not
 * a Connect tab. So this page renders **without the Connect tab row**, and a
 * small `My Profile` crumb sits where that row was.
 *
 * ── ⚠⚠ THE SWAP, AND WHY THIS DIRECTION ─────────────────────────────────
 *
 * ⚠ `/connect` USED TO RENDER THIS and `/profile` was a redirect INTO it. That
 * is reversed: the body below moved here verbatim, and `/connect` now lands on
 * `/community`.
 * ⚠⚠⚠ `/profile` WAS ALREADY THE STABLE ROUTE (`E591`) — every user-facing link,
 * the account menu, `/stats`, onboarding and `E597`'s eight one-section editors
 * all point here. ⚠ MEASURED AT THE WS-B GATE: **31 live `/connect` references
 * across 17 files**, and not one of them is a link a member follows to their own
 * profile. Moving the RENDER to the route everything already names is what makes
 * this a swap rather than a migration.
 *
 * ── ⚠ SUPERSEDED, quoted not deleted (`E164`) ───────────────────────────
 *
 * ⚠ This whole page was one line:
 * //   redirect("/connect");
 * ⚠ and before that:
 * //   redirect("/community");
 * ⚠⚠ THE REASONING BEHIND THOSE REDIRECTS IS NOT SUPERSEDED, only their
 * destination: *"`/profile` is linked from the band's account menu, from
 * `/stats`, from onboarding and from older briefs; deleting the route would 404
 * every one of them."* ⚠⚠⚠ THAT IS NOW AN ARGUMENT FOR RENDERING HERE rather
 * than for redirecting away.
 *
 * ── ⚠⚠ THE TWO NON-PROVIDER CASES ARE DIFFERENT AND BOTH ARE KEPT ────────
 *
 * ⚠ A Panameer employee gets `EmployeeProfile` — unchanged, and it was always
 * this page's branch. ⚠⚠ A MEMBER WITH NO PROVIDER PROFILE goes to
 * `/community`, which is the behaviour `/connect` carried; it moved with the
 * render so nobody meets an empty profile.
 */
export default async function MyProfilePage() {
  const viewer = await getSessionViewer();
  /* ⚠ ACCESS: `route-access.ts` line 131, `{ prefix: "/profile", requires:
     "authenticated" }` — applied at the edge by `proxy.ts`, and it covers
     `/profile/edit/*` by longest-prefix match too (`E597` WS-C). This redirect
     is the belt to that braces. */
  if (!viewer) redirect("/login?callbackUrl=%2Fprofile");

  // A Panameer employee gets the employee profile even if a seeded provider row
  // still exists behind them — the row is demo noise, not their identity.
  if (viewer.isSystemAdmin) return <EmployeeProfile userId={viewer.userId} />;

  const profile = await getOwnProviderProfileView(viewer.userId, viewer);
  /*
    ⚠⚠ A MEMBER WITH NO PROVIDER PROFILE GETS THE COMMUNITY PAGE, NOT AN EMPTY
    PROFILE. ⚠ `redirect` throws, so nothing below it runs and no profile query
    is attempted against a profile that does not exist.
  */
  if (!profile) redirect("/community");

  /* ⚠ Fetched once and reused: the comb needs the same colleague count and the
     same path lists the cards render, and asking twice for one answer is two
     round trips for nothing. */
  /* ⚠ `mine` IS NO LONGER DESTRUCTURED (`P2-A2-E600` WS-B) — its only reader
     was the colleague count, which Layout A does not render. ⚠ `getMyCommunity`
     is NOT called any more on this page; `growthBoard` does its own reads.
     ⚠ SUPERSEDED, quoted not deleted (`E164`):
     //   const [taughtPathsList, takenPaths, mine] = await Promise.all([
     //     …, getMyCommunity(viewer),
     //   ]); */
  const [taughtPathsList, takenPaths] = await Promise.all([
    getPathsTaughtByProfile(profile.id),
    getPathsTakenBy(viewer.userId),
  ]);
  /* ⚠ `colleagues` IS NO LONGER RENDERED (`P2-A2-E600` WS-B). `getMyCommunity`
     still runs — `growthBoard` and the community signal need it — but the count
     has no surface on Layout A. ⚠ SUPERSEDED, quoted not deleted (`E164`):
     //   const colleagues = mine.colleagues.length; */

  /* ⚠⚠ ONE SCORE, ONE BOARD — the same two calls `/community/grow` makes, so
     the card and the page cannot quote different figures (`E585`). */
  const [growthMe, growthRows] = await Promise.all([
    growthScore(profile.person.personId, "month"),
    growthBoard("month"),
  ]);

  /*
    ── ⚠⚠⚠ THE MEMBER'S OWN PUBLIC LINK (`P2-A1.1-E738`, the lane 4 addition) ─

    ⚠ SCOTT, 2026-10-01: *"Owner sees 'Your public link' + Copy under Visibility
    and in the profile share bar."*

    ⚠⚠ **`ensureSlug` MINTS ON FIRST READ, AND THIS IS THE ONE PLACE IT IS
    CALLED FROM.** This page is owner-only (`getOwnProviderProfileView` resolves
    the profile FROM THE SESSION), so a slug is only ever created for the person
    asking. ⚠⚠⚠ **MINTING ON READ IS SAFE BECAUSE THE SLUG ALONE GRANTS
    NOTHING:** `/in/<slug>` serves the MASKED preview unless `public_name_at` is
    set, and that is a separate, explicit opt-in.
    ⚠ `null` when the member has no usable name yet — the card then shows no
    link row rather than a broken one.
    ⚠⚠ ABSOLUTE, BUILT SERVER-SIDE from `NEXT_PUBLIC_APP_URL`: the member pastes
    this into an email signature, so a relative path would be useless and a URL
    assembled in the browser would be wrong during SSR.
  */
  const slug = await ensureSlug(profile.id);
  const publicUrl = slug
    /* ⚠ `/pro/`, renamed from `/in/` (`P2-A1.1-E756`). The old path still 308s,
       so links already pasted into signatures keep working — but what we HAND
       OUT from today is the new one. */
    ? `${(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3100").replace(/\/$/, "")}/pro/${slug}`
    : null;

  return (
    <>
      {/*
        ── ⚠⚠ THE CRUMB REPLACES THE TAB ROW (`P2-A2-E598` WS-B item 1) ──────

        ⚠ SUPERSEDED, quoted not deleted (`E164`) — what stood here while the
        profile was a Connect tab:
        //   <PageTabs
        //     eyebrow="CONNECT"
        //     sequence={tabSequenceFor("/connect")}
        //     tabs={connectTabs(viewer, unread)}
        //     current="/connect"
        //   />
        ⚠⚠⚠ THE TAB ROW HAD TO GO, NOT JUST LOSE ITS `Profile` ENTRY. A row
        reading `CONNECT · Community · Groups · …` above your own profile is the
        *"not the right menu"* half of Scott's original complaint, moved rather
        than fixed. ⚠ The crumb says where you are without claiming you are
        inside an application.
        ⚠⚠ `unreadCount` WENT WITH THE ROW — it existed only to put the number on
        the Messages tab. One fewer query on this page.
      */}
      {/* ⚠⚠ IT IS THE PAGE'S `<h1>`, NOT A DECORATIVE `<p>`. Shipping it as a
          paragraph left the page with `ConnectProfile`'s own `My Profile`
          heading as well — the same words twice, and two `<h1>` candidates for
          one page. ⚠ That heading is now visitor-only; this is the owner's. */}
      {/*
        ── ⚠⚠⚠ THE CRUMB BECAME THE TAB ROW (`P2-A2-E600` WS-A) ───────────────

        ⚠ `E598` WS-B put a `My Profile` crumb where Connect's tab row had been,
        because the page had no row of its own and needed to say where it was.
        ⚠⚠ IT NOW HAS ONE, AND THE ROW SAYS IT TWICE OVER — an eyebrow reading
        `MY PROFILE` above a tab reading `My Profile`. ⚠⚠⚠ KEEPING THE CRUMB
        WOULD REPEAT THE `E598` WS-B DEFECT EXACTLY: the same words twice, and
        two `<h1>` candidates for one page. `PageTabs` supplies the heading now.
        ⚠ SUPERSEDED, quoted not deleted (`E164`):
        //   <h1 className="mb-3 text-[13px] font-bold uppercase tracking-[0.08em] text-ink-2">
        //     My Profile
        //   </h1>
      */}
      {/*
        ── ⚠⚠⚠ THE MENU NAME IS `Account Information` (ruling 31b, WS-A item 1) ──

        ⚠ Scott's SIT sheet names the menu, and the eyebrow is where that name
        is rendered — `PageTabs`' own docblock calls it *"a room label, not a
        decoration"*, and it is **the thing that stops a bare row of words
        reading as steps rather than siblings.**
        ⚠⚠ `MY PROFILE` was the room label AND the first tab's label, so the row
        said *"My Profile"* twice, eight pixels apart — the same duplication
        `E628` fixed on the Learn catalogue and `E633` fixed again on Courses.
        ⚠⚠⚠ **NAMING THE ROOM `Account Information` AND THE TAB `Profile` MAKES
        THEM DIFFERENT WORDS FOR DIFFERENT THINGS**, which is what they are.
        ⚠ SUPERSEDED, quoted not deleted (`E164`):
        //   eyebrow="MY PROFILE"
      */}
      <PageTabs
        wrap
        eyebrow={ACCOUNT_MENU_NAME}
        sequence={tabSequenceFor("/profile")}
        tabs={profileTabs(viewer)}
        current="/profile"
      />
      {/*
        ⚠⚠ THE PROFILE LEAD LINE (`E737`). ⚠⚠⚠ IT IS ON `/profile` AND NOT INSIDE
        `ConnectProfile` — that component is shared with `/providers/[id]`, so a line placed
        there would also appear on somebody else's profile, telling a visitor that THEIR
        résumé build is free while they look at a stranger.
        ⚠ Both halves are measured: the résumé rebuild is reachable (`OwnerResumeRebuild` on
        this page's own `ConnectProfile`), and the Search Score is on the `Score` tab above.
      */}
      {/* ⚠ `takenPaths` IS KEYED ON THE **USER**, not the person —
          `LearnEnrollment.user_id` (`E593` WS-B item 17). ⚠⚠ A JSX comment
          is only legal in CHILDREN position, never between attributes, which
          is why this note sits here rather than beside the prop. */}
      {/* ⚠ The comb is OWNER-ONLY, so it is computed here — on the owner's own
          page — and never passed to `/providers/[id]` (`E593`). */}
      {/* ⚠ `colleagueFaces` IS NO LONGER PASSED (`P2-A2-E598` WS-C) — the hero
          line carries the colleague COUNT and nothing renders avatars.
          ⚠ SUPERSEDED, quoted not deleted (`E164`) — the seven faces, sliced
          from the SAME `mine.colleagues` the count comes from:
          //   colleagueFaces={mine.colleagues
          //     .filter((c) => c.person)
          //     .slice(0, 7)
          //     .map((c) => ({ personId: c.person!.personId, name: …, photoUrl: … }))}
          ⚠⚠ A JSX COMMENT IS ONLY LEGAL IN CHILDREN POSITION, NEVER BETWEEN
          ATTRIBUTES — this file already carried that warning and I put one
          among the props anyway; `tsc` caught it.
          ⚠ `getMyCommunity` STILL RUNS — `colleagueCount` is its length. */}
      {/* ⚠⚠⚠ `profileViews`, `usage` AND `colleagueCount` ARE NO LONGER PASSED
              (`P2-A2-E600` WS-B). Scott's page rule: *"No growth numbers, usage
              or statistics on My Profile beyond the score side card and the Rank
              Higher card's links."* Layout A's name card is photo, name, title,
              location and two buttons.
              ⚠ THE DOORS SURVIVE as TABS — `/stats` and `/account-health` are in
              the profile row (`E600` WS-A).
              ⚠⚠ REPORTED, NOT BURIED: `recordProfileView` still WRITES a row on
              every non-owner render and nothing displays the count now. It is
              Statistics' figure to show when that page is built.
              ⚠ SUPERSEDED, quoted not deleted (`E164`):
              //   profileViews={await countProfileViews(profile.id)}
              //   usage={await getUsageStats(profile.person.personId, profile.id,
              //     taughtPathsList.length + takenPaths.length, colleagues)}
              //   colleagueCount={colleagues}
          */}
      {/*
        ── ⚠⚠⚠ THE CLEAN SURFACE STARTS HERE, BELOW THE MENUING (`P2-A2-E713` WS-A) ──

        ⚠ **SCOTT: the design applies *"on the page (meaning below the menuing)"*.** ⚠⚠ So the
        wrapper opens AFTER `PageTabs` — **the band, the top menu, the tab row and the eyebrow
        are out of scope and keep Comfortaa.**
        ⚠⚠⚠ **THIS CLASS IS THE ONLY THING SCOPING MONTSERRAT** (`globals.css`, beside
        `.marketing-surface`). Removing it silently returns every heading below to Comfortaa —
        which is a visual regression with no error attached to it.
      */}
      <div className="account-surface">
      {/*
        ── ⚠⚠⚠ THE LEAD LINE LIVES **INSIDE** THE WHITE SURFACE (`P2-A1.1-E739`) ──

        ⚠ **SCOTT, 2026-10-01, walking `/profile` at 390: *"the new free lead line sits
        in its own strip, indented past the page gutter, and the photo butts against
        it… Put the lead line inside the page's normal gutter, with no separate
        background and one standard gap below it."***

        ⚠⚠ **THREE MEASURED CAUSES, NOT ONE**, and each half of his sentence was a
        different defect:
          1. ⚠ **INDENTED** — the wrapper carried `px-4` inside an ancestor that
             already supplies the page gutter, so the `<p>` sat at **x=36** while
             `.pm-cp3`, the photo and every section below sat at **x=20**. ⚠⚠ It also
             used `max-w-5xl` (1024px) against the profile column's **1120px**, so it
             was narrower than its own content at desktop width.
          2. ⚠⚠ **ITS OWN STRIP** — it rendered ABOVE `.account-surface`, i.e. on
             `bg-canvas` (**rgb(250,250,250)**, probed) while the content it introduces
             is on **white**. ⚠⚠⚠ **A LINE THAT INTRODUCES A CARD MUST SIT ON THE
             CARD**, or it reads as chrome belonging to the tab row above it.
          3. ⚠ **THE PHOTO BUTTING AGAINST IT** — no gap of its own; `mb-4` is now the
             one standard gap below, and nothing above (the surface supplies that).

        ⚠⚠ **IT IS STILL ON THE PAGE AND NOT INSIDE `ConnectProfile`, WHICH IS
        `E737`'s LOAD-BEARING REASON AND IS UNCHANGED:** that component is shared with
        `/providers/[id]`, so a line placed there would tell a visitor that THEIR résumé
        build is free while they are looking at a stranger's profile.
        ⚠ Both halves of the claim remain measured: the résumé rebuild is reachable
        (`OwnerResumeRebuild` below) and the Search Score is on the `Score` tab above.
        ⚠ SUPERSEDED, quoted not deleted (`E164`) — both earlier wrappers:
        //   <div className="mx-auto max-w-5xl px-4 pt-3 sm:px-6">   (E737, on canvas)
        //   <div className="mx-auto mb-4 max-w-[1120px]">           (E739 first pass)
      */}
      <div className="mx-auto mb-4 max-w-[1120px]">
        {/* ⚠⚠ "UPDATE", NOT "BUILD" (`P2-A1.1-E750`). Scott, 2026-10-02:
            *"Build makes no sense when I already have a profile."* Ruling:
            *"Update sounds better."* ⚠ This is the OWNER's own page — everyone
            reading this line already has a profile, so "Build" described a state
            none of them is in. ⚠ "latest" is what carries the repeatability: the
            résumé rebuild can be run again, which is the thing being offered.
            ⚠ SUPERSEDED, quoted not deleted (`E164`):
            //   claim="Build your profile from your résumé and see your full Search Score, free."
        */}
        <FreeLine claim="Update your profile from your latest résumé and see your full Search Score, free." />
      </div>
      <ConnectProfile
        /* ⚠ `publicUrl` is resolved HERE and nowhere else — see `ensureSlug`
           above. The view model carries `null` for every other surface. */
        p={{ ...profile, publicUrl }}
        /* ⚠⚠ `Viewing Me`, WITH DATA BEHIND IT AT LAST (`P0-E595` A2). One row
           per viewer per day, counted all time — the `Counters` decision, not a
           window nobody ruled on. ⚠ This is the OWNER's own page, which is the
           only place the figure is shown. */
        /* ⚠⚠ SEVEN, NOT ALL OF THEM (`P2-A3-E596` WS-D). The card is a summary
           with a door; `/community/colleagues` is the list. ⚠ Sliced from the
           SAME `mine.colleagues` the count above comes from, so the faces and
           the number can never describe different sets. */

        taughtPaths={taughtPathsList}
        takenPaths={takenPaths}
        testimonials={await publicTestimonials(profile.id)}
        community={await getCommunitySignalForProfile(profile.id)}
        growth={{
          points: growthMe.points,
          /*
            ⚠⚠⚠ `rankFor` APPLIES RULING 6 — no rank while the board is hidden.
            ⚠ SUPERSEDED, quoted not deleted (`E164`):
            //   rank: growthRows.find((r) => r.personId === profile.person.personId)?.rank ?? null,
            ⚠⚠ THAT PRINTED `#1 this month` ON A ONE-PERSON BOARD nobody is
            shown. `null` covers both "board hidden" and "not on it", and
            neither is rank 0.
          */
          rank: rankFor(growthRows, profile.person.personId),
        }}
        score={await ownerScore(profile.id)}
      />
      </div>
    </>
  );
}

/**
 * ⚠ The owner's score breakdown, or `null` when the input cannot be built.
 * ⚠⚠ NULL RENDERS NO CARD — better than a ring of zeroes that asserts a
 * provider has answered nothing.
 */
async function ownerScore(profileId: string) {
  const input = await buildCompletenessInput(profileId);
  return input ? computeProfileScore(input) : null;
}
