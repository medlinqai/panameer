import Link from "next/link";
import { PageTabs } from "@/components/casing/PageTabs";
import { PatternHeader } from "@/components/casing/PatternHeader";
import { UsageCards } from "@/components/console/UsageCards";
/* ⚠ `P2-A1.1-E744` — these left with the four cards below the gauges; the components stay on disk. */
import { BuyerStatistics } from "@/components/console/StatisticsCards";
import { getStatistics } from "@/lib/statistics";
/* ⚠ `E730` WS-B/WS-C — the areas are defined once, in `lib/usage-areas.ts`, and this
   page renders them twice (comb + gauges). */
import { usageAreas, usageHoneyCells, usageSummary } from "@/lib/usage-areas";
/* `UsageGauges` (v1, one gauge per area) stays on disk after `E815`
   replaced it with the six rows of four; nothing renders it. */
import { Honeycomb } from "@/components/console/Honeycomb";
import { computeProfileScore } from "@/lib/completeness";
import { buildCompletenessInput } from "@/lib/onboarding";
import {
  accountAccessLines,
  accountStandingLines,
  accountCheckCounts,
} from "@/lib/account-standing";
/* ⚠ `P2-A1.1-E744` — these four left with the cards this lane removed; every
   module stays on disk and `ProfileChecklist` imports what it needs itself. */
import { type Figure } from "@/lib/figure";
import type { TrendPeriod } from "@/components/console/StatCardBacks";
import { tabSequenceFor } from "@/lib/nav";
import { profileTabs, profileTabLabel, ACCOUNT_MENU_NAME } from "@/lib/profile-tabs";
import { prisma } from "@/lib/prisma";
import { guardPage } from "@/lib/guard";
import { ownedProviderProfile } from "@/lib/access";
/* ⚠⚠ `VISIBILITY_THRESHOLD` IS NO LONGER IMPORTED (`E659`). Its two live uses
   were the visibility gate `E590` removed and the sentence that printed that
   gate to the member; both are now `E164` quotes, and a quote needs no import.
   ⚠⚠⚠ `69d` — A DELETION LEAVES RESIDUE. Left in place this would have been an
   orphaned import with a GREEN BUILD and lint 35 → 36, which is exactly how
   `E645` and `E647` shipped. **Checked before committing (`76a`), not after.**
   ⚠ The constant itself stays in `completeness.ts` — it is still the meter's
   own number, and this page simply no longer gates on it.
   ⚠ SUPERSEDED, quoted not deleted (`E164`):
   //   import { missingRequired, VISIBILITY_THRESHOLD } from "@/lib/completeness"; */
import { missingRequired } from "@/lib/completeness";
/* ⚠ `StatValue` IS NO LONGER IMPORTED (`E563` WS-A). Both of its callers —
   `Profile Metrics`'s headline and the `Rising Talent` count — are superseded
   above; the merged meter is written out because `StatValue` renders MAGENTA and
   `E433` puts a figure in INK. ⚠ The component itself stays: `StatValue` is
   still the right thing for a tile whose value is a plain measured number. */
/* ⚠ `NotTrackedYet` IS NO LONGER IMPORTED — its two callers, `Earnings` and
   `Job Success Score`, are retired above. ⚠⚠ THE COMPONENT STAYS ON DISK
   (`E164`): it is still the right thing for a tile whose figure genuinely has
   no source, and `StatFigureRow` is its replacement only where a `Figure`
   carries its own reason.
   ⚠ SUPERSEDED, quoted not deleted (`E164`):
   //   import { NotTrackedYet, StatRow, StatTile } from "@/components/console/StatTile"; */

/**
 * MY STATS (J2.4 WS-D / E010).
 *
 * Six tiles from the brief — 12-month earnings, Job Success Score, Proposals,
 * Profile metrics, Client relationships, Rising Talent — and NO Connects tile,
 * per the standing decision that Connects are removed everywhere.
 *
 * TWO OF THE SIX HAVE REAL DATA. Profile metrics reads the profile; Rising
 * Talent is derived from things the schema actually knows. The other four —
 * earnings, job success, proposals, client relationships — all depend on
 * contracts and payments, which are Phase 2 and have no models yet. Those
 * render `NotTrackedYet` rather than zeroes: a provider shown "Job Success 0%"
 * would reasonably think they had failed at something, and "$0 earned" is a
 * claim we have not earned the right to make.
 *
 * Server component. Every number here comes from one query on the viewer's own
 * profile, resolved through `ownedProviderProfile` — no id crosses the wire.
 */
/* ⚠ `E730` WS-A — the tab label has read `Usage` since `E603`; the TITLE still said
   `My Stats`, so the browser tab and the tab row disagreed about the name of the same
   page. ⚠ SUPERSEDED, quoted not deleted (`E164`):
   //   export const metadata = { title: "My Stats · Panameer" }; */
export const metadata = { title: "Usage · Panameer" };

/* ⚠⚠ ONE READING OF THE PARAM, AND ANYTHING UNRECOGNISED IS THE DEFAULT. A URL
   is user input: `?period=banana` must not throw and must not silently widen a
   window.
   ⚠⚠⚠ THE FRONT-FACE SWITCH IS GONE (`E603` correction 4) — the BACK face owns
   every time window now, so this param drives the TREND back, not the figures.
   ⚠ SUPERSEDED, quoted not deleted (`E164`):
   //   function periodOf(sp: { period?: string }): StatWindow {
   //     return sp.period === "all" ? "all" : "month";
   //   }
   ⚠ The front figures are simply "as they stand today", which is why they need
   no tag and no switch. */
function trendOf(sp: { period?: string }): TrendPeriod {
  return sp.period === "ytd" ? "ytd" : "90d";
}

export default async function MyStatsPage({
  searchParams,
}: {
  /* ⚠ The period is a URL param, so a view is shareable and survives a
     refresh (`E603` WS-A item 3). */
  searchParams: Promise<{ period?: string }>;
}) {
  /* ⚠ `authenticated` (`P2-J1.1-E040`) — ⚠ SUPERSEDED, quoted:
     `guardPage("canProvideServices")`. The null-profile empty state below is
     what makes this safe, and it was already here. */
  const viewer = await guardPage("authenticated");

  const profile = await prisma.providerProfile.findFirst({
    where: ownedProviderProfile(viewer),
    select: {
      id: true,
      completeness: true,
      status: true,
      paused_at: true,
      validation_status: true,
      /* ⚠ `E563` WS-C — the sourcing documents key on the PERSON, not the
         profile. `ProposalRequest.provider_person_id` and
         `InterviewRequest.provider_person_id` are both person ids. */
      person_id: true,
      /* ⚠⚠⚠ `rating: true` IS GONE — IT WAS SELECTED AND NEVER USED.
         ⚠ SCOTT, 2026-09-23: *"Unrendered code is unreviewed code, and an
         unused select is how the expression gets written by accident."* An
         unused field in a `select` is an invitation: the value is already in
         scope, so rendering it is one expression and no new query.
         ⚠⚠ `ProviderProfile.rating` HAS NO RUNTIME WRITER — its only value is
         `4.90`, hardcoded at `prisma/seed.ts:260`. Rendering it anywhere a
         member or a buyer can see would be a FABRICATED RATING.
         ⚠ `check:statistics` §30 now fails the build if any component reads it
         while no writer exists.
         ⚠ SUPERSEDED, quoted not deleted (`E164`):
         //   rating: true, */
      updated_at: true,
      created_at: true,
      onboarding_completed_at: true,
      /*
        ⚠⚠ WIDENED BY `E563` WS-B item 7 — the fields `missingRequired` needs to
        NAME the gaps rather than merely count them.
        ⚠ THE SHAPE MIRRORS `provider-profile-view.ts:254` FIELD FOR FIELD, and
        that is deliberate: the profile's status strip and this card answer the
        same question, and two surfaces that compute one answer from two
        different inputs is how they start disagreeing.
      */
      /* ⚠ `headline` COLUMN IS GONE (`E595` WS-B) — the title is on the person. */
      role_type_id: true,
      hourly_rate_cents: true,
      rate_min_cents: true,
      rate_max_cents: true,
      onsite_rate_cents: true,
      remote_rate_cents: true,
      skills: { select: { id: true } },
      /* ⚠⚠ WIDENED BY `E730` WS-B — the two fields the Account Health gauge's checks
         read. ⚠⚠⚠ ADDED TO THE EXISTING SELECT RATHER THAN QUERIED SEPARATELY: the
         gauge needs two booleans, and a second round trip for two booleans the page
         is already fetching a row for is a query nobody needs. */
      available_for_messages: true,
      person: {
        select: {
          phone: true,
          /* ⚠ `title` — the profile's title lives on the PERSON since `E595` WS-B. */
          title: true,
          photo_url: true,
          site: { select: { addresses: { select: { id: true } } } },
          /* ⚠ `E730` WS-B — `accountStandingLines` reads email verification. */
          user: { select: { email_verified: true } },
        },
      },
      _count: {
        select: {
          skills: true,
          employers: true,
          projects: true,
          serviceProducts: true,
        },
      },
    },
  });


  /* ⚠ COUNTED ON THE USER, NOT THE PROFILE (`P1-J3-E019`). A credential belongs to
     the person, so a seller's own stats include a `LEARN` credential they earned
     before they were a seller — which has no `provider_profile_id` at all. */
  /*
    ⚠⚠ THE GUARD MOVED UP (`E563` WS-C). It used to sit below the queries that
    follow; the WS-C counts need `profile.id` and `profile.person_id`, so the
    null case has to be settled BEFORE them rather than after. ⚠ Behaviour is
    unchanged for a provider — only the order of a check that already existed.
  */
  if (!profile) {
    /*
      ── ⚠⚠⚠ A BUYER HAS STATISTICS TOO (`E603` WS-A item 5) ────────────────

      ⚠ MEASURED AT THE PREMISE CHECK: this branch rendered ONE SENTENCE and no
      tab row, for every member without a provider profile. ⚠⚠ THAT WAS WRONG
      IN THE OTHER DIRECTION — a buyer HAS colleagues, sends invites and takes
      lessons, and was shown none of it.
      ⚠ SUPERSEDED, quoted not deleted (`E164`):
      //   return (
      //     <p className="text-ink-2">
      //       This account has no provider profile, so there is nothing to measure yet.
      //     </p>
      //   );
      ⚠⚠ THE SELLER CARDS BELOW STILL DO NOT RENDER — they need the profile this
      branch does not have, which is the rule stated in `StatisticsCards`: a
      card renders when the viewer HAS the thing it measures.
    */
    const person = await prisma.person.findFirst({
      where: { user_id: viewer.userId },
      select: { id: true },
    });
    if (!person) {
      return (
        <p className="text-ink-2">
          This account has no profile yet, so there is nothing to measure.
        </p>
      );
    }
    const sp = await searchParams;
    const s = await getStatistics(person.id, viewer.userId, null, "all", trendOf(sp));
    return (
      <>
        <PageTabs
          wrap
          eyebrow={ACCOUNT_MENU_NAME}
          sequence={tabSequenceFor("/profile")}
          tabs={profileTabs(viewer)}
          current="/usage"
        />
        <div className="mx-auto max-w-5xl space-y-4">
          {/*
            ── ⚠⚠ RULING 23 ON THE BUYER BRANCH TOO ──────────────────────────

            ⚠⚠⚠ **THE FIGURES ARE NOT THE SELLER'S.** `profile.views` is
            `{ uncounted: "No provider profile" }` down here **by construction**
            — this branch is reached precisely because there is no provider
            profile. ⚠ Leading a header with a dash whose reason is *"you are
            not the kind of member this figure is for"* is the `E562` defect:
            a page stating its absences before its facts.
            ⚠⚠ So the three chosen are ones a buyer genuinely has, all counted,
            all with writers: colleagues, lessons done, certificates.
            ⚠ **TWO WOULD HAVE BEEN FINE** (ruling 45(1) — it must not require
            three). These three are real; none is padding.
          */}
          <PatternHeader
            eyebrow={profileTabLabel("/usage")}
            headline="How your account is doing"
            /* ⚠ THE PAGE'S OWN SENTENCE, MOVED NOT REWRITTEN — it already said
               the dash rule in the member's words. */
            lede="Anything marked “—” isn’t being counted yet, and says why."
            figures={[
              { label: "Colleagues", value: s.network.colleagues },
              { label: "Lessons Done", value: s.learning.lessonsCompleted },
              { label: "Certificates", value: s.learning.certifications },
            ]}
            /* ⚠⚠ NO `primary`, AND THAT IS RULING 45(4) RATHER THAN AN
               OVERSIGHT: the cards below carry their own doors, and a button
               repeating a link already on the page is `E579` in a nicer coat. */
          />
          <BuyerStatistics s={s} period={trendOf(sp)} />
        </div>
      </>
    );
  }

  /*
    ⚠⚠⚠ THE CERTIFICATION COUNT IS COMPUTED ONCE, IN `getStatistics`, AND READ
    HERE. ⚠ It was computed in TWO places with DIFFERENT SCOPING COLUMNS —
    `{ user_id }` here and `{ provider_profile_id }` on the Learning card.
    ⚠⚠ `Certification.user_id` IS NOT NULL AND `provider_profile_id` IS
    NULLABLE, so the profile-scoped one UNDERCOUNTS and returns 0 for a member
    with no provider profile. **This one was the correct one**; the Learning
    card now uses it, and this line no longer queries.
    ⚠ MEASURED 2026-09-23: 5 certifications, 0 with a null profile id, 61 people
    holding exactly one profile each — **so the two agreed today by accident of
    the data, not by construction.**
    ⚠ SUPERSEDED, quoted not deleted (`E164`):
    //   const certificationCount = await prisma.certification.count({
    //     where: { user_id: viewer.userId },
    //   });
  */

  /* ⚠ ONE CALL, THE SAME MODULE THE BUYER BRANCH USES — two shapes of this page
     asking two different questions is how the figures start to disagree. */
  const sp = await searchParams;
  /* ⚠ `"all"` — the FRONT face shows figures as they stand, with no window
     (`E603` correction 4). The trend back does the windowing. */
  const stats = await getStatistics(
    profile.person_id,
    viewer.userId,
    profile.id,
    "all",
    /* ⚠⚠ THE PERIOD REACHES THE QUERY, NOT JUST THE PILL. Until this argument
       existed the trend back drew the SAME EIGHT WEEKS under both periods, so
       `YTD` moved the highlight and nothing else. */
    trendOf(sp)
  );

  /* ⚠⚠ THE ONE COMPUTATION, READ BY BOTH SURFACES. ⚠ `certCount` is what the
     `Profile` tile's inventory renders and what `Your Learning` renders — one
     number, two renders, which is allowed; two counts would not be. */
  /* ⚠ `certCount` WENT WITH THE `Profile` TILE (`P2-A1.1-E744`). Its comment
     said it was *"read by BOTH surfaces"* — the tile and `Your Learning` — and
     ⚠⚠ ONLY THE TILE HAS GONE. `ProfileChecklist` takes the figure as a prop so
     the rule survives the move: one number, two renders, never two counts.
     ⚠ SUPERSEDED, quoted not deleted (`E164`):
     //   const certCount = isCounted(stats.learning.certifications)
     //     ? stats.learning.certifications
     //     : 0; */

  /* ⚠ OWNER-SCOPED INSIDE THE HELPER — the profile is resolved from the
     session, never from a parameter (`E563` WS-B item 8). */
  /* ⚠ `attestations` FED `ConfirmExperience`, WHICH THIS LANE UNMOUNTED
     (`P2-A1.1-E744`). ⚠⚠ The read is dropped with its only reader rather than
     left running for nobody — a query whose result nothing renders is a page
     paying for a card it no longer shows.
     ⚠ SUPERSEDED, quoted not deleted (`E164`):
     //   const attestations = await readAttestations(viewer); */

  /*
    ── ⚠⚠ THE WS-C COUNTS (`P2-J2-E563`) ─────────────────────────────────────

    ⚠⚠ THESE ARE REAL COUNTS OF REAL ROWS, and today every sourcing one is
    ZERO — measured 2026-09-19: `ProposalRequest` 0, `Proposal` 0,
    `InterviewRequest` 0, across the WHOLE database. ⚠ That is a TRUE zero, not
    an untracked one, and the distinction decides how each tile renders:
      · a model exists and the count is 0 → PRINT 0. The Counters decision is
        LOCKED: *"a real count of what is in the database… Count it and print
        it."* ⚠⚠ A provider who has sent no proposals has sent no proposals.
      · nothing counts it at all → `NotTrackedYet` and a dash. That is
        `Earnings` and `Job Success Score`, and item 13 keeps them that way.
    ⚠ DO NOT convert these to dashes when they read 0; that hides a real answer.

    ── ⚠⚠⚠ THE `E366` AGGREGATION BAN APPLIES HERE AND IT IS ENFORCED ────────

    ⚠⚠ *"A recorded refusal becomes a scarlet letter on a marketplace."*
    `check:sourcing` FAILS THE BUILD on a named decline counter in any file that
    also handles a sourcing document — and this file now does.
    ⚠ SO: no `prisma.proposalRequest.count()` filtered to `DECLINED`, no `groupBy`
    over a bid document, and NO IDENTIFIER matching `declineCount` /
    `declineRate` / `responsivenessScore` / `acceptanceRate` and friends.
    ⚠⚠ THE INVITATION COUNT IS DELIBERATELY BLIND TO THE ANSWER — it counts what
    was ISSUED. The brief: *"An invitation counts even when declined — a buyer
    asking directly is the signal, not the answer."* ⚠ That is the opposite of a
    decline counter and stays that way.
  */
  /*
    ── ⚠⚠⚠ FIVE QUERIES REMOVED — EACH WAS A **SECOND COMPUTATION** (`E603`) ──

    ⚠ SCOTT'S RULE, CORRECTING HIS OWN EARLIER WORDING, 2026-09-23: *"The rule
    is NO FIGURE IS COMPUTED TWICE, not rendered twice. Two renders of one
    computation cannot drift; two computations of one concept are free to
    disagree, and will."*
    ⚠⚠ `invitationsToPropose`, `proposalsSent`, `interviewsOffered`,
    `interviewsTaken` and `interviewsClosed` are ALL computed in
    `getStatistics` now and read off `stats.work` below. ⚠⚠⚠ THE PACKAGE COUNTS
    STAY — `Service Products` is genuinely uncovered by the new cards and is
    the only place either figure is computed.
    ⚠ SUPERSEDED, quoted not deleted (`E164`):
    //   const [
    //       publishedProducts,
    //       draftProducts,
    //       invitationsToPropose,
    //       proposalsSent,
    //       interviewsOffered,
    //       interviewsTaken,
    //       interviewsClosed,
    //     ] = await Promise.all([
    //       prisma.package.count({
    //         where: { provider_profile_id: profile.id, status: "PUBLISHED" },
    //       }),
    //       prisma.package.count({
    //         where: { provider_profile_id: profile.id, status: "DRAFT" },
    //       }),
    //     [inner comment paraphrased per rule 12 — it cannot be copied,
    //      because a quoted `* /` closes the comment that quotes it:
    //      OFFERED is every request aimed at this provider, whatever
    //      became of it, i.e. the denominator. The schema has NO EXPIRED
    //      state, so the label read DECLINED + CANCELLED and the query
    //      counted exactly those two.]
    //       prisma.proposalRequest.count({
    //         where: { provider_person_id: profile.person_id, issued_at: { not: null } },
    //       }),
    //       prisma.proposal.count({
    //         where: {
    //           provider_person_id: profile.person_id,
    //           submitted_at: { not: null },
    //         },
    //       }),
    //       prisma.interviewRequest.count({
    //         where: { provider_person_id: profile.person_id },
    //       }),
    //       prisma.interviewRequest.count({
    //         where: { provider_person_id: profile.person_id, status: "COMPLETED" },
    //       }),
    //       prisma.interviewRequest.count({
    //         where: {
    //           provider_person_id: profile.person_id,
    //           status: { in: ["DECLINED", "CANCELLED"] },
    //         },
    //       }),
    //     ]);
  */
  /*
    ── ⚠⚠ THE GAUGES' OWN THREE COUNTS (`P2-A1.1-E730` WS-C) ──────────────────

    ⚠ The other twenty-odd figures come from `getStatistics`, which has already run.
    ⚠⚠ THESE THREE ARE NOT IN IT, so they are counted here, in the SAME
    `Promise.all` as the product counts rather than in a second round trip.
    ⚠⚠⚠ EACH WAS CHECKED FOR A WRITER, NOT FOR A COLUMN (counting rule 1):
      · `ServiceProductOffer` — written by `createServiceProductOffer`
        (`service-product-offers.ts`). Countable.
      · `SettlementRequest{SUBMITTED}` — written by `requestSettlement`
        (`settlements.ts`). Countable; it is the one money-adjacent figure on this
        page that HAS a writer, which is why it is a number and earnings is a dash.
      · ⚠⚠ `WorkOrder{CLOSED}` IS **NOT** COUNTED AND IS NOT QUERIED. Measured:
        nothing in the tree writes `CLOSED` or `ACTIVE` — the writers stop at
        `RELEASED` — so a `count` would return a true 0 that MEANS "unknown". ⚠⚠⚠ A
        QUERY WHOSE ZERO CANNOT BE DISTINGUISHED FROM AN UNMEASURED STATE IS WORSE
        THAN NO QUERY, because the zero looks like a result. It is passed as
        `{ uncounted }` below instead.
  */
  const [publishedProducts, draftProducts, offersReceived, awaitingApproval] =
    await Promise.all([
      prisma.serviceProduct.count({
        where: { provider_profile_id: profile.id, status: "PUBLISHED" },
      }),
      prisma.serviceProduct.count({
        where: { provider_profile_id: profile.id, status: "DRAFT" },
      }),
      /* ⚠ `provider_person_id` IS ON THE OFFER ITSELF and is indexed with `status`
         (`@@index([provider_person_id, status])`), so this needs no join. ⚠⚠ Read off
         the schema rather than guessed — an offer is scoped to the PERSON, like the
         settlement below, not to the profile like the products above. */
      prisma.serviceProductOffer.count({
        where: { provider_person_id: profile.person_id },
      }),
      prisma.settlementRequest.count({
        where: { provider_person_id: profile.person_id, status: "SUBMITTED" },
      }),
    ]);

  /*
    ── ⚠⚠ THE ACCOUNT HEALTH FIGURES, FROM `/account-health`'s OWN ROWS ───────

    ⚠ `accountAccessLines` + `accountStandingLines` + `accountCheckCounts` are the
    SHARED helpers in `lib/account-standing.ts`. ⚠⚠⚠ THEY WERE A LOCAL LITERAL ON
    THE HEALTH PAGE AND WERE **MOVED** THERE IN THIS COMMIT, NOT COPIED — a second
    copy would be `E585` on a figure two tabs of one row both print, and the
    Account Health gauge would have disagreed with the Account Health page.
    ⚠ The gauge's SCALE is `passing + failing`, a real total rather than a goal.
  */
  const healthChecks = accountCheckCounts([
    accountAccessLines({ availableForMessages: profile.available_for_messages }),
    accountStandingLines({
      status: profile.status,
      emailVerified: !!profile.person.user?.email_verified,
    }),
  ]);

  /*
    ── ⚠⚠⚠ THE SEARCH SCORE, FROM THE ONE DEFINITION (`E730` WS-B/WS-C) ───────

    ⚠ `computeProfileScore` over `buildCompletenessInput` is EXACTLY what
    `/community/score` renders, so the figure on this page and the figure on that
    page are the same number by construction. ⚠⚠ RE-DERIVING IT HERE FROM
    `criteria` WOULD BE `E585` ON A SCORE THE MEMBER CAN SEE ON TWO TABS OF ONE
    ROW — they would disagree the first time a weight changed.
    ⚠⚠⚠ IT IS A SUPPORTING FIGURE, NOT A GAUGE NEEDLE (Scott, 2026-09-30): the
    Profile gauge measures PROFILE VIEWS. ⚠ That keeps `E603`'s ruling intact —
    *"Completion belongs to the score page; Statistics measures what the
    application DID with the profile"* — because the needle is what the
    application did, and the score is reported beside it rather than over it.
  */
  /* ⚠⚠ IT RETURNS `null` IF THE PROFILE VANISHED BETWEEN THE TWO READS, which is
     a race this page cannot otherwise observe. ⚠⚠⚠ THE FALLBACK IS `{ uncounted }`,
     NOT `0` — a score of zero is a RESULT and would read as "your profile earns
     nothing", which is the fabricated-figure defect on the one number a member is
     most likely to act on. */
  const scoreInput = await buildCompletenessInput(profile.id);
  const searchScore: Figure = scoreInput
    ? computeProfileScore(scoreInput).total
    : { uncounted: "The profile could not be read" };

  /*
    ── ⚠⚠⚠ THE AREAS, ONCE (`E730` WS-B/WS-C) ────────────────────────────────

    ⚠ ONE ARRAY FEEDS BOTH THE COMB AND THE GAUGES. ⚠⚠ Two lists would disagree
    the first time one changed, and they would disagree **side by side on one
    screen** — see `lib/usage-areas.ts`'s own docblock.

    ⚠⚠⚠ THE FOUR `{ uncounted }` FIGURES ARE PASSED AS SUCH, NOT AS ZERO, and each
    reason names WHERE THE CHAIN STOPS rather than apologising:
      · `coursesCompleted` — `LearnEnrollment` records no completion at all; only
        per-lesson progress exists.
      · `shownInSearch` — `getStatistics` already says so; its reason is reused
        rather than re-worded.
      · `ordersCompleted` — nothing writes `CLOSED`; the writers stop at `RELEASED`.
      · `earnings`, `payoutsPending`, `invoicesOpen` — settlement reaches `APPROVED`
        and nothing writes `PAID`; there is no `Payment` row and no `Invoice` model
        in the schema at all.
    ⚠⚠ `stats.work.earnings` IS ALREADY `{ uncounted }` AND IS REUSED — this page
    does not form a second opinion about whether earnings can be counted.
  */
  /* `E824` — the cards read `stats`, which the page already has. The v2 figure
     reader stays in `lib/usage-figures.ts`, unused by this page. */

  const areas = usageAreas({
    views: stats.profile.views,
    searchScore,
    shownInSearch: stats.profile.shownInSearch,
    lessonsDone: stats.learning.lessonsCompleted,
    coursesCompleted: { uncounted: "A course completion is not recorded" },
    learnersInPaths: stats.teaching.learners,
    colleagues: stats.network.colleagues,
    invitesSent: stats.network.invitesSent,
    joinedFromInvites: stats.network.joined,
    workRequests: stats.work.requestsReceived,
    proposalsSent: stats.work.proposalsSent,
    interviews: stats.work.interviews,
    serviceProducts: publishedProducts,
    offersReceived,
    drafts: draftProducts,
    activeOrders: stats.work.workOrders,
    ordersCompleted: { uncounted: "Nothing closes a work order yet" },
    awaitingApproval,
    earnings: stats.work.earnings,
    payoutsPending: { uncounted: "No payout is ever created" },
    invoicesOpen: { uncounted: "There is no invoice record" },
    checksPassing: healthChecks.passing,
    checksFailing: healthChecks.failing,
  });

  /*
    ⚠⚠ `meetsRequired` IS NOW REQUIRED (`P2-J3-E590` WS-A0). This call site was
    one of the five that fell back to `completeness >= 80` — the second gate
    `E585` recorded. ⚠ SUPERSEDED, quoted not deleted (`E164`):
    // const visible = isMarketplaceVisible({
    //   status: profile.status,
    //   completeness: profile.completeness,
    //   paused_at: profile.paused_at,
    // });
    ⚠ NO QUERY CHANGE WAS NEEDED HERE — `E563` WS-B already widened this select
    for `missingRequired`, so every field the predicate reads was in memory and
    this page was answering the wrong question with the right data.
  */
  /*
    ── ⚠⚠ THREE LOCALS WENT WITH THE `Profile` TILE (`P2-A1.1-E744`) ────────

    ⚠ `visible`, `validated` and `validationRequested` were read ONLY by the
    four-criteria checklist. ⚠⚠ They move to `ProfileChecklist`, which takes
    them as props — so the dashboard that mounts it supplies them, and this
    page stops computing a visibility verdict it no longer shows.
    ⚠⚠⚠ **NOTHING ABOUT THE VISIBILITY RULE CHANGED.** `isMarketplaceVisible`
    and `providerMeetsRequired` are untouched; only this caller is gone.
    ⚠ SUPERSEDED, quoted not deleted (`E164`):
    //   const visible = isMarketplaceVisible({
    //     status: profile.status,
    //     completeness: profile.completeness,
    //     paused_at: profile.paused_at,
    //     meetsRequired: providerMeetsRequired(profile),
    //   });
    //   const validated = profile.validation_status === "VALIDATED";
    //   (REQUESTED is its own state, not a flavour of unmet - Scott, 2026-09-19:
    //    a provider who has asked must not be told again to ask.)
    //   const validationRequested = profile.validation_status === "REQUESTED";
  */

  /* ⚠ NAMES THE GAPS. `E562` WS-B's strip does the same from the same fields —
     see the note on the widened select above. */
  const gaps = missingRequired({
    /* SOURCE IS Person.title SINCE E595 WS-B. */
    headline: profile.person.title,
    role_type_id: profile.role_type_id,
    skills: profile.skills,
    photoUrl: profile.person.photo_url,
    hasAddress: (profile.person.site?.addresses?.length ?? 0) > 0,
    hasPhone: Boolean(profile.person.phone?.trim()),
    hourly_rate_cents: profile.hourly_rate_cents,
    rate_min_cents: profile.rate_min_cents,
    rate_max_cents: profile.rate_max_cents,
    onsite_rate_cents: profile.onsite_rate_cents,
    remote_rate_cents: profile.remote_rate_cents,
  });

  /*
    ── ⚠⚠ THE FOUR CRITERIA MOVED OUT (`P2-A1.1-E744`, lane 1) ──────────────

    ⚠ The `criteria` builder and `metCount` lived here and were rendered by the
    `Profile` tile this lane removed. ⚠⚠ They are NOT deleted — Scott asked for
    the checklist to be kept, unmounted, for the dashboard:
    **`src/components/console/ProfileChecklist.tsx`** now holds
    `buildProfileCriteria()` and the card, moved with their own comments.
    ⚠⚠⚠ **THE RULES ARE UNCHANGED** — this is an extraction, not a rewrite.
  */


  return (
    <>
      {/* ⚠⚠ THE PROFILE TAB ROW (`P2-A2-E600` WS-A) — one row for every page
          under the avatar, using the same words as the menu. */}
      <PageTabs
        wrap
        eyebrow={ACCOUNT_MENU_NAME}
        sequence={tabSequenceFor("/profile")}
        tabs={profileTabs(viewer)}
        current="/usage"
      />
    {/*
      ── ⚠⚠⚠ `.account-surface` (`P2-A1.1-E731`) ───────────────────────────────

      ⚠ **SCOTT: *"Wrap `/usage` in `.account-surface`, so headings are Montserrat like
      Profile."*** ⚠⚠ The headline rendered in the DISPLAY face (Comfortaa) because
      `PatternHeader`'s `<h2>` carries `font-display` and nothing overrode it here.
      ⚠⚠⚠ `globals.css` SCOPES `:is(h1, h2, h3, h4)` TO THIS CLASS AND WINS ON
      SPECIFICITY, NOT ON ORDER — so the wrapper is the whole fix and no component
      changes. ⚠ `/profile` and `/providers/[id]` already use it; this makes the third
      Account Information page agree with them.
    */}
    {/*
      ── ⚠⚠⚠ THE PAGE PAINTS ITSELF WHITE (`P2-A1.1-E745`, lane 2 item 1) ──────

      ⚠ **SCOTT, 2026-10-02: *"No boxes, no grey page. White throughout, like
      `/profile`."***
      ⚠⚠ **MEASURED: THE GREY IS THE APP SHELL'S `bg-canvas`**, not this page's —
      `rgb(250,250,250)` light, `rgb(11,8,23)` dark — and `/profile` sits on the
      same canvas. ⚠⚠⚠ **SO "LIKE /profile" CANNOT BE COPIED FROM /profile:** what
      reads as white there is `.account-surface`, the white CONTENT panel over the
      canvas. This page does the same thing, one level out, so the whole column is
      one surface with thin lines in it.
      ⚠ `bg-surface`, never `bg-white` — Scott named the theme token himself, and
      a hard-coded white is the `E723` dark-mode defect.
      ⚠⚠ **THE SHELL IS UNTOUCHED.** Changing `bg-canvas` would restyle every
      signed-in page, and the brief is explicit: *"This page only. Other pages
      change as Scott walks them."*
      ⚠ SUPERSEDED, quoted not deleted (`E164`):
      //   <div className="account-surface pm-usage">
    */}
    <div className="account-surface pm-usage -mx-4 bg-surface px-4 pb-10 sm:-mx-6 sm:px-6">
    <div className="mx-auto max-w-5xl">
      {/*
        ── ⚠⚠⚠ THE PATTERN HEADER (ruling 23) ─────────────────────────────────

        ⚠ RULING 23: the `statistics_2026-09-23.html` mockup is the standard for
        all six Account Information pages. ⚠⚠⚠ **THIS IS THE PAGE THAT MOCKUP
        WAS DRAWN FOR, AND IT WAS THE LAST ONE WITHOUT THE HEADER** — `/learn`,
        `/community` and the score page all mount `PatternHeader` already.

        ⚠⚠ **THE THREE FIGURES ARE THE THREE THIS PAGE CAN HONESTLY COUNT**, and
        each was checked for a WRITER rather than for a column (counting rule 1):
          · `profile.views` — `model ProfileView` with a real writer,
            `recordProfileView` (`profile-views.ts`), which `createMany`s on the
            public profile route. ⚠ It is `{ uncounted }` only when there is no
            provider profile, which cannot happen in this branch.
          · `network.colleagues` — `firstDegree.length`, a counted set.
          · `learning.lessonsCompleted` — `LessonProgress.completed_at`.
        ⚠⚠⚠ **DELIBERATELY NOT CHOSEN: `shownInSearch` AND `rateSeen`.** Both
        are `{ uncounted: NO_SEARCH_LOG }` — there is no search log — so a header
        built from them would lead the page with two dashes. ⚠ They still render
        on the Profile card below **with their reason**, which is where an
        uncounted figure belongs: reported, not promoted.
        ⚠⚠ **AND NOT `completeness`** — Scott, 2026-09-23: *"Completion belongs
        to the score page. Statistics measures what the application DID with the
        profile."* ⚠ `E603` took it off the cards and left it on this page; the
        header must not put it back.

        ⚠ The lede is the page's OWN sentence, moved rather than rewritten.
      */}
      <div className="mb-6">
        <PatternHeader
          /*
            ⚠⚠ `open` — NO BOX (`P2-A1.1-E745`, lane 2 item 2). Scott: *"the
            honeycomb on the left and the summary on the right, open on the page,
            one line underneath. No box."*
            ⚠⚠⚠ **OPT-IN, SO THE FIVE OTHER `PatternHeader` CALLERS DO NOT MOVE** —
            the brief's *"This page only"*.
          */
          open
          /* ⚠ `USAGE` — the tab row's own word, looked up rather than typed. */
          eyebrow={profileTabLabel("/usage").toUpperCase()}
          /*
            ⚠ SCOTT, 2026-09-30, verbatim. ⚠⚠ IT IS ABOUT THE MEMBER'S SURROUNDINGS
            RATHER THAN A VERDICT ON THEM — the old headline, *"How your profile is
            performing"*, graded the member; this one reports activity, which is what
            a Usage page measures.
            ⚠ SUPERSEDED, quoted not deleted (`E164`):
            //   headline="How your profile is performing"
          */
          headline="What's Happening Around You"
          /* ⚠ THE LEDE IS GONE (Scott, 2026-10-01). ⚠⚠ It explained the dash convention in
             the abstract, above figures that then explain themselves: every uncounted
             figure on this page carries its OWN reason, in words, where it sits. ⚠⚠⚠ A
             general note about dashes is a caption for a rule the page already states
             seven times, and the mockup goes straight from headline to figures.
             ⚠ SUPERSEDED, quoted not deleted (`E164`):
             //   lede="Anything marked “—” isn’t being counted yet — those tiles fill in
             //   once transactions go live on Panameer." */
          /*
            ⚠⚠ THE HONEYCOMB IS THE PICTURE (`E730` WS-B), nine cells, tessellated.
            ⚠⚠⚠ `chrome={false}` STRIPS ITS OWN SECTION, BORDER, HEADING AND LEDE —
            without that, a bordered card with an `<h2>` nests inside this bordered
            panel and the page reads as two cards and two headings for one thing.
            ⚠ It is REUSED, not rebuilt: `E603`'s component, with a layout prop.
            ⚠⚠ AND IT IS NO LONGER MOUNTED INSIDE `StatisticsCards` — it moved here
            rather than being drawn twice.
          */
          picture={
            <Honeycomb
              layout="flower"
              chrome={false}
              cells={usageHoneyCells(areas)}
            />
          }
          figures={[
            { label: "Profile Views", value: stats.profile.views },
            { label: "Colleagues", value: stats.network.colleagues },
            { label: "Lessons Done", value: stats.learning.lessonsCompleted },
          ]}
          /*
            ⚠⚠ THE MOVE IS DERIVED FROM THIS PAGE'S OWN FIGURES, never canned in
            the component (its own contract). ⚠⚠⚠ IT NAMES THE ONE THING THAT IS
            ACTUALLY OUTSTANDING, and `gaps` is already computed above for the
            `Finish Your Profile` card — **one computation, two renders**, which
            is allowed; two computations of "what is missing" would be `E585`.
            ⚠ When nothing is outstanding it says so rather than inventing a
            next move — ruling 53c's instinct applied to a sentence.
          */
          /*
            ── ⚠⚠⚠ THE SUMMARY SENTENCE, DERIVED (`E730` WS-B) ─────────────────

            ⚠ SCOTT: *"The summary sentence says 'Your busiest area is …'"* and
            *"The summary names the busiest and quietest areas from the real
            figures, not fixed text."*
            ⚠⚠ `usageSummary` READS THE SAME `areas` ARRAY THE COMB AND THE GAUGES
            DRAW, so it cannot name an area the page is not showing.
            ⚠⚠⚠ ONLY COUNTED FIGURES VOTE — an uncountable area is not a quiet one,
            it is an unmeasured one, and calling Earnings "quietest" would report a
            result where nothing was measured. That is `BusiestLine`'s rule, applied
            to the header's sentence instead of restated.
            ⚠ THE OLD `move` IS NOT LOST — what was still needed on the profile now
            rides on the `Finish My Profile` button's own condition below.
            ⚠ SUPERSEDED, quoted not deleted (`E164`):
            //   move={ gaps.length > 0
            //     ? `Still needed on your profile: ${gaps.join(" · ")}.`
            //     : visible ? "Your profile is live in the marketplace." : null }
          */
          move={usageSummary(areas)}
          /* ⚠ The mockup's figure order and its square actions (`E731`). Both are opt-in
             props, so the other three `PatternHeader` pages are byte-unchanged. */
          figureLead
          squareActions
          /*
            ── ⚠⚠⚠ TWO BUTTONS, AND THEY COLLIDE WITH RULING 45(4) ────────────

            ⚠ SCOTT, 2026-09-30: *"two buttons: **Finish My Profile** (solid ink)
            and **Invite a Colleague** (white, ink border), square, as in the
            mockup."*
            ⚠⚠⚠ RULING 45(4) SAYS THE ACTION SLOT IS *"never a repeat of a link
            already on the page"*, AND THIS PAGE ALREADY HAS A `Finish Your Profile`
            CARD. ⚠⚠ **RAISED WITH SCOTT RATHER THAN DECIDED EITHER WAY** (rule 13:
            the newest dated statement is the live one, and a silent overwrite of an
            older ruling is the same failure as silently obeying it).
            ⚠ WHAT IS BUILT, AND WHY IT IS THE NARROWER READING: the button carries
            the SAME CONDITION as the card — it renders only when something is
            genuinely outstanding — so a complete provider sees neither, and the
            duplication exists only in the state where the action is real.
            ⚠⚠ `Invite a Colleague` IS NOT A REPEAT: measured, there is no invite
            door anywhere on this page.
          */
          /*
            INVITE A COLLEAGUE IS THE BLACK SQUARE BUTTON (`E815`, Scott
            2026-10-03). It was the white secondary. "Finish My Profile" takes
            the secondary slot when there is anything to finish, so no door is
            lost — it is still on the page, just no longer the loudest thing on
            a page about how much you are using Panameer.
            Superseded, quoted not deleted:
            //   primary={gaps.length > 0 ? { label: "Finish My Profile", href: "/profile" } : undefined}
            //   secondary={{ label: "Invite a Colleague", href: "/community" }}
          */
          primary={{ label: "Invite a Colleague", href: "/community" }}
          secondary={
            gaps.length > 0 ? { label: "Finish My Profile", href: "/profile" } : undefined
          }
          /*
            ── ⚠⚠⚠ NO BUTTON, AND I WROTE ONE FIRST ────────────────────────

            ⚠ I gave this `primary={{ label: "See Your Profile Score", href:
            "/community/score" }}` and then found **that exact link already on
            this page**, inside the `Profile` tile below. ⚠⚠ RULING 45(4): the
            action slot is *"never a repeat of a link already on the page"*, and
            `E579` — *a button that repeats a nearby link is the same failure in
            a nicer coat.*
            ⚠⚠⚠ **AND THE TILE'S LINK IS THE ONE THAT MUST SURVIVE:** `E603`
            replaced the completeness figure with *"the door it was sitting on
            top of"* precisely so the score page kept an entrance from here.
            Promoting a copy of it into the header would leave two doors to one
            room and no new way anywhere.
            ⚠ **EVERY OTHER DOOR THIS PAGE OWES IS ALSO ALREADY ON IT** —
            `Finish Your Profile`, `Manage Service Products`, `Check your
            profile`. ⚠⚠ So the honest header has **no action**, which the
            component supports by design: *"a page with no honest action shows
            none."*
          */
        />
      </div>

      {/*
        ── ⚠⚠⚠ THE GAUGES (`P2-A1.1-E730` WS-C) ──────────────────────────────

        ⚠ EIGHT CARDS — the seven areas plus Account Health, so the grid is 4 + 4
        with no empty slot. ⚠⚠ ONE `Gauge` COMPONENT, USED EIGHT TIMES (`E585`):
        eight hand-drawn dials would drift in their ARC MATHS, and two cards showing
        the same fraction would point their needles at different angles.
        ⚠⚠⚠ THEY READ THE SAME `areas` ARRAY THE COMB IN THE HEADER DRAWS, so a cell
        and its gauge cannot disagree about the same member in the same render —
        not because they are kept in step, but because there is only one of them.
      */}
      {/*
        R-E016 (`E824`) — SCOTT'S 09-23 LAYOUT IN TODAY'S STYLE, approved
        2026-10-04 against `usage_mockup_current_style_2026-10-04.html`: rounded
        bordered cards in two columns, each a list of label + number rows.

        THE 24 DIALS ARE RETIRED FROM THIS PAGE. `Gauge.tsx` stays on disk — it
        is used elsewhere — and so do `UsageRows` and the v2 metric config,
        unrendered. Every figure here comes from the SAME writers; nothing was
        recounted for the new layout.
        ⚠ SUPERSEDED, quoted not deleted:
        //   <UsageRows figures={figures} isProvider={isProvider} />
      */}
      <UsageCards stats={stats} searchScore={searchScore} />

      {/*
        ── ⚠⚠ THE TWO ACTIONS, AT THE TOP (`P2-J2-E563` WS-B) ────────────────

        ⚠ Scott, 2026-09-17, on what he wants providers to do: *"ONE — complete
        their profile. TWO — check their 'have you done this for > 3 years'
        related to auto-service product creation."* ⚠⚠ THEY SIT ABOVE THE TILES
        BECAUSE THAT IS THE ORDER HE NAMED THEM IN — the measurements are what
        you read after you have done the two things.

        ⚠ `Finish Your Profile` RENDERS ONLY WHEN THERE IS SOMETHING TO FINISH.
        A permanent card telling a complete provider to complete their profile
        is the "states its absences twice" defect `E562` removed from the
        profile page.
      */}
      {gaps.length > 0 && (
        <section className="mb-4 rounded-brand border border-line bg-white p-5">
          <h2 className="font-display text-[16px] font-bold">
            Finish Your Profile
          </h2>
          <p className="mt-2 text-[14px] leading-relaxed text-ink-2">
            {/* ⚠⚠ IT NAMES THEM. A card that says "something is missing"
                without saying WHAT is the invisible-profile bug itself — the
                same sentence `E562` WS-B's strip carries, for the same reason. */}
            Still needed: {gaps.join(" · ")}.
          </p>
          <Link
            href="/join/provider?step=finish"
            className="mt-4 inline-block rounded-full bg-magenta px-5 py-2.5 text-[14.5px] font-bold text-white transition-colors hover:bg-magenta-dark"
          >
            Finish Your Profile
          </Link>
        </section>
      )}


      {/*
        ── ⚠⚠⚠ THE FOUR CARDS BELOW THE GAUGES ARE GONE (`P2-A1.1-E744`, lane 1)

        ⚠ SCOTT, 2026-10-02, of the cards under the gauges: *"do we need this any
        more?"* — **no.** Removed from this page: **Confirm Your Experience**,
        **Service Products**, **Profile** (the four-criteria checklist and the
        Skills / Companies / Projects / Certifications counts) and **Teaching**.
        ⚠⚠ **THE GAUGES REPLACE THE COUNTS.** ⚠ This supersedes super run 3's
        *"Teaching stays."*

        ⚠⚠⚠ **TWO ARE KEPT AS COMPONENTS, UNMOUNTED, BECAUSE SCOTT ASKED:**
        *"Keep the checklist and Confirm Your Experience components, unmounted.
        They move to the dashboard's 'next moves' section later."*
          · `ConfirmExperience` — `components/console/ConfirmExperience.tsx`,
            already a component; unmounting it was one deleted line.
          · `ProfileChecklist` — **`components/console/ProfileChecklist.tsx`,
            NEW.** ⚠⚠ The checklist was NOT a component: `criteria` was built
            inline in this file and rendered inline inside a `StatTile`, so
            *"keep the checklist"* had nothing to keep. **It is EXTRACTED, not
            rewritten** — builder and markup moved with their own comments.

        ⚠⚠ **`Service Products` AND `Teaching` ARE NOT KEPT** — only the two
        Scott named are moving.
        ⚠ The grid also held `E164` quotes of tiles retired long ago (`Earnings
        (12 Months)`, `Job Success Score`, `Proposals`, `Client Relationships`,
        `Interviews`). ⚠⚠⚠ **THOSE WERE QUOTES OF ALREADY-RETIRED CODE AND THEY
        WENT WITH THE GRID; THEY ARE IN GIT AT `ebc2851`.** Scott ruled the same
        narrow exception for `ProviderProfileView.tsx` (`E598`) — a quote of a
        quote is history, and history is what the repository holds.

        ⚠ **THE FOOTER LINE WENT TOO** — *"Something look wrong? Check your
        profile."* ⚠⚠ The brief says remove it *"only if nothing else on the page
        needs it"*: measured, nothing does — every gauge carries its own
        `Go to …` link.
      */}



    </div>
    {/* ⚠ closes `.account-surface` */}
    </div>
    </>
  );
}
