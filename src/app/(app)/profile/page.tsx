import { redirect } from "next/navigation";
import { getSessionViewer } from "@/lib/session";
import { EmployeeProfile } from "@/components/profile/EmployeeProfile";
import { ConnectProfile } from "@/components/community/ConnectProfile";
import { getOwnProviderProfileView } from "@/lib/provider-profile-view";
import { getPathsTaughtByProfile, getPathsTakenBy } from "@/lib/learn-home";
import { getUsageStats } from "@/lib/usage-stats";
import { countProfileViews } from "@/lib/profile-views";
import { publicTestimonials } from "@/lib/recommendations";
import { getCommunitySignalForProfile } from "@/lib/community-signal";
import { getMyCommunity } from "@/lib/connections";
import { buildCompletenessInput } from "@/lib/onboarding";
import { computeProfileScore } from "@/lib/completeness";

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
  const [taughtPathsList, takenPaths, mine] = await Promise.all([
    getPathsTaughtByProfile(profile.id),
    getPathsTakenBy(viewer.userId),
    getMyCommunity(viewer),
  ]);
  const colleagues = mine.colleagues.length;

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
      <h1 className="mb-3 text-[13px] font-bold uppercase tracking-[0.08em] text-ink-2">
        My Profile
      </h1>
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
      <ConnectProfile
        p={profile}
        /* ⚠⚠ `Viewing Me`, WITH DATA BEHIND IT AT LAST (`P0-E595` A2). One row
           per viewer per day, counted all time — the `Counters` decision, not a
           window nobody ruled on. ⚠ This is the OWNER's own page, which is the
           only place the figure is shown. */
        profileViews={await countProfileViews(profile.id)}
        /* ⚠⚠ SEVEN, NOT ALL OF THEM (`P2-A3-E596` WS-D). The card is a summary
           with a door; `/community/colleagues` is the list. ⚠ Sliced from the
           SAME `mine.colleagues` the count above comes from, so the faces and
           the number can never describe different sets. */

        taughtPaths={taughtPathsList}
        takenPaths={takenPaths}
        usage={await getUsageStats(
          profile.person.personId,
          profile.id,
          taughtPathsList.length + takenPaths.length,
          colleagues
        )}
        testimonials={await publicTestimonials(profile.id)}
        community={await getCommunitySignalForProfile(profile.id)}
        colleagueCount={colleagues}
        score={await ownerScore(profile.id)}
      />
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
