import { prisma } from "@/lib/prisma";
import { growthScore, windowRange, type GrowthWindow } from "@/lib/growth-score";
/* ⚠⚠⚠ ONE INSTRUCTOR PREDICATE AND ONE FORUM QUERY, IMPORTED NOT COPIED.
   ⚠ `check:forums` §3 and `check:community` GUARD 2 both went red on this file
   for the same reason: it had hand-rolled its own copies of logic that already
   existed elsewhere. ⚠⚠ BOTH GATES WERE RIGHT AND THIS MODULE WAS WRONG. */
import { teachesPathWhere } from "@/lib/learn-home";
import { countThreadsWaitingOn } from "@/lib/forums";
import { type Figure, type TrendPeriod, trendBuckets, countInBuckets } from "@/lib/figure";

/*
  ⚠⚠ RE-EXPORTED, NOT REDEFINED. `Figure`, `isCounted`, `TrendPeriod` and
  `trendBuckets` moved to `lib/figure.ts` so a CLIENT component can import them
  without dragging `pg` into the browser bundle — see that file's header.
  ⚠ Every existing importer of `@/lib/statistics` keeps working; there is still
  exactly ONE definition of each.
*/
export { isCounted, trendBuckets } from "@/lib/figure";
export type { Figure, TrendPeriod } from "@/lib/figure";


export type StatWindow = Extract<GrowthWindow, "month" | "all">;

/**
 * ⚠⚠ EVERY FIGURE ON THE PAGE, WITH ITS SOURCE NAMED IN ONE PLACE.
 * ⚠ Grouped the way the page groups them so a reader can hold both at once.
 */
export type Statistics = {
  window: StatWindow;
  /* ⚠⚠⚠ USAGE ONLY — NO COMPLETION (`E603` WS-A correction 2). Scott,
     2026-09-23: *"Profile completion and application usage are different
     things. Completion belongs to the score page. Statistics measures what the
     application DID with the profile."*
     ⚠ SUPERSEDED, quoted not deleted (`E164`):
     //   profile: { views: Figure; score: Figure; shownInSearch: Figure; rateSeen: Figure }; */
  profile: { views: Figure; shownInSearch: Figure; rateSeen: Figure };
  network: {
    colleagues: Figure;
    invitesSent: Figure;
    joined: Figure;
    growthScore: Figure;
    /* ⚠⚠ NETWORK'S FIGURES ARE DATED, SO THE CARD EARNS A **TREND** BACK
       (`E603` correction 3) — `ColleagueInvite.created_at`. ⚠ Buckets oldest
       first, the same shape as `lessonSeries` so one Sparkline draws both and
       there is no second charting path to keep in step.
       ⚠⚠⚠ IT IS `inviteSeries`, NOT `weeklyInvites`, AND THE RENAME IS THE
       POINT: under `ytd` THE BUCKETS ARE CALENDAR MONTHS. A field called
       `weekly…` holding months is `E585` in a variable name — one concept
       stated in two places and kept in step by hand.
       ⚠ SUPERSEDED, quoted not deleted (`E164`):
       //   weeklyInvites: number[] | { uncounted: string }; */
    inviteSeries: number[] | { uncounted: string };
  };
  learning: {
    lessonsCompleted: Figure;
    pathsEnrolled: Figure;
    certifications: Figure;
    pathsTaught: Figure;
    /** ⚠ Buckets oldest first, grain set by the period. `LessonProgress
     *  .completed_at` exists, so this is countable — the brief's open question,
     *  answered by measurement.
     *  ⚠ SUPERSEDED, quoted not deleted (`E164`):
     *  //   weeklyLessons: number[] | { uncounted: string }; */
    lessonSeries: number[] | { uncounted: string };
  };
  /* ⚠⚠⚠ CORRECTED 2026-09-24 (`E621` WS-B) — THIS DOCBLOCK WAS STALE, AND A
     STATED RULE THAT CONTRADICTS THE CODE IS THE MORE DANGEROUS HALF.

     ⚠⚠ **`work` IS RENDERED.** Measured: `StatisticsCards.tsx:284` draws
     `s.work.interviews` on the Work card's front face and `:307–311` draws
     `interviews` / `interviewsTaken` / `interviewsDeclined` on its back; `:457`
     reads `interviews` for the credit line. ⚠ And `/stats`'s own older
     `Interviews` tile was **RETIRED** in the same brief that wrote this comment
     (`page.tsx:902` — *"ITS DETAIL MOVED, NOT DELETED"*), so the sentence below
     stopped being true almost immediately and nobody noticed.

     ⚠⚠⚠ SO THE QUERIES REACH A SCREEN, AND THE "ROOM WITH NO DOOR" READING
     WOULD HAVE HAD SOMEBODY DELETE THEM. ⚠ Kept as the record (`E164`):
     //   ⚠⚠⚠ MEASURED AND REPORTED, NOT BUILT AND NOT DELETED (`E603` WS-A):
     //   **NOTHING RENDERS `work`.** `StatisticsCards` draws Profile, Network,
     //   Learning and Teaching; the Work figures on `/stats` come from the page's
     //   OWN older cards (`Earnings (12 Months)`, `Job Success Score`, `Proposals`,
     //   `Interviews`), which this brief did not touch.
     //   ⚠⚠ SO THESE FIVE FIGURES COST FIVE QUERIES PER PAGE LOAD AND REACH NO
     //   SCREEN. ⚠ That is `E579`'s shape inverted — not a door onto a wall, but a
     //   room with no door. ⚠⚠⚠ IT IS KEPT RATHER THAN REMOVED because the mockup
     //   has a Work card and WS-B/WS-C may render it; whether it ships is Scott's
     //   call, not a tidy-up.
     ⚠ Still true and worth keeping: the unscoped `workOrders` count below was
     found by asking who renders this group. */
  work: {
    /* ⚠⚠⚠ RECEIVED MEANS **ISSUED** (Scott, 2026-09-23). ⚠ SUPERSEDED, quoted
       not deleted (`E164`): this counted every `BidRequest` including
       `issued_at: null`, i.e. requests **nobody ever sent** — the member was
       shown invitations that do not exist yet. ⚠⚠ THE OLD `/stats` TILE HAD
       THE FILTER RIGHT ALL ALONG; my new card dropped it. */
    requestsReceived: Figure;
    /* ⚠⚠⚠ COUNTED, FROM `ProviderBid`. ⚠ SUPERSEDED, quoted not deleted
       (`E164`): //   proposalsSent: { uncounted: "No Proposal model exists" }
       ⚠⚠ THAT CLAIM WAS FALSE AND THE PAGE ALREADY DISPROVED IT — the old tile
       has been counting `providerBid` all along. **The model is named
       `ProviderBid`, not `Proposal`.** An absent NAME is not an absent THING;
       search for the behaviour, not the noun.
       ⚠ `submitted_at: { not: null }` — SENT means SUBMITTED. An unsubmitted
       bid is a draft, and a draft is not a proposal. */
    proposalsSent: Figure;
    /** ⚠ The back-face cut: requests issued to them, answered or not. */
    invitationsToPropose: Figure;
    /** ⚠⚠ THE TOTAL — every interview request aimed at them, whatever became
     *  of it. The two subsets below are drawn FROM this, never added to it. */
    interviews: Figure;
    /** ⚠ `COMPLETED`. */
    interviewsTaken: Figure;
    /** ⚠ `DECLINED` + `CANCELLED`. ⚠⚠ THE SCHEMA HAS NO `EXPIRED`, so the label
     *  must never say "expired" — it would name a state that cannot occur. */
    interviewsDeclined: Figure;
    workOrders: Figure;
    earnings: Figure;
    /*
      ⚠⚠⚠ `orderSeries` IS DELETED (Scott, 2026-09-23). It was computed on every
      page load and drawn NOWHERE once the Work card's back became a BREAKDOWN
      rather than a trend. ⚠ *"Unrendered code is unreviewed code — that is
      exactly how the unscoped `workOrders` survived."* ⚠⚠ If a Work trend
      returns, it is rebuilt then.
      ⚠ SUPERSEDED, quoted not deleted (`E164`):
      //   THE SERIES IS WORK ORDERS STARTED, not requests received: a request is
      //   something a BUYER does TO the member, so a trend of it charts somebody
      //   else's behaviour. Same bucketing as the other two series.
      //   orderSeries: number[] | { uncounted: string };
    */
  };
  teaching: {
    teaches: boolean;
    learners: Figure;
    lessonsByThem: Figure;
    questions: Figure;
    questionsWaiting: Figure;
  };
};

/*
  ⚠⚠⚠ THE THREE THINGS NOTHING COUNTS, AND WHY — NOT ESTIMATED, NOT ZEROED.

  ⚠ `shownInSearch` / `rateSeen`: **MEASURED 2026-09-23 — NO TABLE MATCHING
  `search`, `impression` OR `shown` EXISTS.** Nothing logs a search result, so
  there is no number to show. ⚠⚠ THE SMALLEST HONEST LOGGER WOULD BE ONE ROW PER
  RESULT SHOWN (viewer, provider, surface, time) — **NOT BUILT: it is a write on
  every search, and that is Scott's call, not an implementation detail.**
*/
const NO_SEARCH_LOG = "Needs a search-results log — nothing records one today";

async function countWindowed(
  window: StatWindow,
  field: string,
  /* ⚠ `providerBid` added by `E621` WS-A and `interviewRequest` by WS-B — each
     time because a writer was built, never to make a dash tidier. The union is
     deliberate: it names every model this helper may count, so a typo cannot
     silently become a runtime `undefined.count`. */
  model:
    | "profileView"
    | "connection"
    | "colleagueInvite"
    | "lessonProgress"
    | "learnEnrollment"
    | "providerBid"
    | "interviewRequest",
  where: Record<string, unknown>
): Promise<number> {
  const { from } = windowRange(window === "all" ? "all" : "month");
  /* ⚠ `windowRange` IS `E599`'s, REUSED. A second definition of "this month"
     would be two calendars — and the Grow page and this page would disagree
     about the same member in the same minute. */
  const dated = from ? { ...where, [field]: { gte: from } } : where;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (prisma as any)[model].count({ where: dated });
}

export async function getStatistics(
  personId: string,
  userId: string,
  providerProfileId: string | null,
  window: StatWindow = "month",
  /** ⚠ The TREND period is not the page WINDOW. The front face shows figures as
   *  they stand (`window`); the back face shows history over `trend`. Two
   *  different questions, two different parameters — collapsing them into one
   *  would make the period links silently re-count the front faces too. */
  trend: TrendPeriod = "90d"
): Promise<Statistics> {
  /* ⚠ SUPERSEDED, quoted not deleted (`E164`) — a hand-rolled SECOND COPY of
     `teachesPathWhere`, which `check:forums` §3 exists to catch:
     //   const teachesWhere = {
     //     OR: [
     //       { expert_person_id: personId },
     //       { courses: { some: { sections: { some: { lessons: { some: { expert_person_id: personId } } } } } } },
     //     ],
     //   };
     ⚠⚠ THE PREDICATE IS EXPORTED ONCE, FROM `learn-home.ts`, and `E383`
     extracted it precisely so a second copy could not drift. ⚠⚠⚠ A COPY THAT
     AGREES TODAY IS STILL A SECOND DEFINITION — and this one would have locked
     a teacher out of her own lessons the moment the rule changed. */
  const teachesWhere = teachesPathWhere(personId);

  const [taughtPaths, score] = await Promise.all([
    prisma.learningPath.findMany({ where: teachesWhere, select: { id: true } }),
    growthScore(personId, window === "all" ? "all" : "month"),
  ]);
  const pathIds = taughtPaths.map((p) => p.id);

  /* ── the first-degree colleague set, needed twice ───────────────────────── */
  const firstDegree = await prisma.connection.findMany({
    where: {
      kind: "COLLEAGUE",
      status: "ACCEPTED",
      OR: [{ from_user_id: userId }, { to_user_id: userId }],
      ...(windowRange(window === "all" ? "all" : "month").from
        ? { created_at: { gte: windowRange(window === "all" ? "all" : "month").from! } }
        : {}),
    },
    select: { id: true },
  });

  const [
    views,
    invitesSent,
    joined,
    lessons,
    enrolled,
    certs,
    bids,
    proposalsSent,
    interviews,
    interviewsTaken,
    interviewsDeclined,
  ] = await Promise.all([
      providerProfileId
        ? countWindowed(window, "viewed_on", "profileView", { profile_id: providerProfileId })
        : Promise.resolve(0),
      countWindowed(window, "created_at", "colleagueInvite", { inviter_person_id: personId }),
      countWindowed(window, "accepted_at", "colleagueInvite", {
        inviter_person_id: personId,
        status: "ACCEPTED",
        accepted_person_id: { not: null },
      }),
      countWindowed(window, "completed_at", "lessonProgress", { user_id: userId }),
      countWindowed(window, "created_at", "learnEnrollment", { user_id: userId }),
      /*
        ⚠⚠⚠ BY `user_id`, AND THE COLUMN NULLABILITY IS THE WHOLE ARGUMENT.
        `Certification.user_id` is NOT NULL; `provider_profile_id` is NULLABLE.
        ⚠ So scoping by the profile UNDERCOUNTS every certification whose
        profile id was never set, and returns 0 for a member with no provider
        profile even when they hold some.
        ⚠⚠ MEASURED 2026-09-23: 5 certifications, 0 with a null profile id, and
        61 people hold exactly one provider profile each — **so the two queries
        agree today by accident of the data, not by construction.** That is
        precisely the disagreement that cannot be seen until it bites.
        ⚠ SUPERSEDED, quoted not deleted (`E164`):
        //   providerProfileId
        //     ? prisma.certification.count({ where: { provider_profile_id: providerProfileId } })
        //     : Promise.resolve(0),
        ⚠⚠⚠ THIS IS NOW THE **ONLY** COMPUTATION OF THIS FIGURE. `/stats`'s
        Profile tile renders the same value rather than counting again.
      */
      prisma.certification.count({ where: { user_id: userId } }),
      /* ⚠⚠ ISSUED ONLY — an unissued request was never sent to anybody. */
      prisma.bidRequest.count({
        where: { provider_person_id: personId, issued_at: { not: null } },
      }),
      /*
        ── ⚠⚠⚠ PROPOSALS SENT — NOW A REAL COUNT (`P2-A8-E621` WS-A item 6) ──

        ⚠ IT WAS A DASH READING *"Proposals aren't recorded yet — nothing
        creates one"*, and that was TRUE. ⚠⚠ RULING 24: it was true **because
        nobody had built the writer**, and citing it as the reason not to build
        one is circular. `lib/proposals.ts` is that writer, so the figure is
        countable now — the writer test is satisfied, not waived.

        ⚠⚠ `submitted_at: { not: null }` IS THE WHOLE DEFINITION. WS-A item 1:
        *"`submitted_at` is the column Proposals Sent counts."* A `DRAFT`
        proposal was never sent to anybody, exactly as an unissued `BidRequest`
        above was not. ⚠⚠⚠ A WITHDRAWN ONE STILL COUNTS: they did send it, and
        the withdrawal is a later fact — the row is kept rather than deleted
        precisely so that stays true.
      */
      countWindowed(window, "submitted_at", "providerBid", {
        provider_person_id: personId,
        submitted_at: { not: null },
      }),
      /*
        ⚠⚠⚠ FOUR QUERIES DELETED — THEY COUNTED TABLES NOTHING WRITES.
        ⚠ Every one returned a true `0` and would have returned a true `0`
        forever, because no code creates a `ProviderBid` or an
        `InterviewRequest`. ⚠⚠ THEY ARE REMOVED RATHER THAN LEFT COMPUTING,
        because **unrendered code is unreviewed code** — the rule that has now
        caught the unscoped `workOrders` count and `orderSeries` in this same
        file.
        ⚠ SUPERSEDED, quoted not deleted (`E164`):
        //   prisma.interviewRequest.count({ where: { provider_person_id: personId } }),
        //   prisma.providerBid.count({
        //     where: { provider_person_id: personId, submitted_at: { not: null } },
        //   }),
        //   prisma.interviewRequest.count({
        //     where: { provider_person_id: personId, status: "COMPLETED" },
        //   }),
        //   prisma.interviewRequest.count({
        //     where: { provider_person_id: personId, status: { in: ["DECLINED", "CANCELLED"] } },
        //   }),
        ⚠⚠⚠ THREE OF THE FOUR ARE BACK, WINDOWED, BECAUSE `lib/interviews.ts`
        NOW WRITES THEM (`E621` WS-B). ⚠ The fourth stayed deleted — it was a
        duplicate `providerBid` count, and `proposalsSent` above is the one
        computation of that figure.
      */
      /*
        ── ⚠⚠ INTERVIEWS — EVERY REQUEST AIMED AT THEM ─────────────────────
        ⚠ WINDOWED ON `created_at`, WHICH IS WHEN THE BUYER ASKED. ⚠⚠ The
        writer test is satisfied rather than waived: `requestInterview()` does
        `interviewRequest.create`, and the dash it replaces said in as many
        words *"nothing creates a request"* — which was true, and is not now.
      */
      countWindowed(window, "created_at", "interviewRequest", {
        provider_person_id: personId,
      }),
      /*
        ⚠⚠ TAKEN — WINDOWED ON `completed_at`, THE COLUMN THE EVENT ITSELF
        WRITES. `completeInterview()` sets `status: "COMPLETED"` and
        `completed_at` in the same update, so the date and the state cannot
        disagree. ⚠ Both are filtered, not just the date: a row with a
        `completed_at` and some later status would otherwise be counted as taken.
      */
      countWindowed(window, "completed_at", "interviewRequest", {
        provider_person_id: personId,
        status: "COMPLETED",
        completed_at: { not: null },
      }),
      /*
        ⚠⚠⚠ DECLINED — WINDOWED ON `created_at`, AND THAT IS A DELIBERATE
        CHOICE WITH A REASON, NOT AN OVERSIGHT.
        ⚠ **No column records WHEN an interview was declined.** `closeInterview`
        moves the status and nothing dates it. ⚠⚠ The only other candidate is
        `updated_at`, which is `@updatedAt` — so ANY later edit to the row would
        drag the decline into a month it did not happen in, and the figure would
        change without anything happening. ⚠⚠⚠ Counting by when the buyer ASKED
        is a definition that stays true forever; counting by `updated_at` is one
        that silently rewrites history.
        ⚠ So this reads: *of the interviews requested in this window, how many
        were declined or cancelled.* ⚠⚠ A dated `declined_at` column is REPORTED
        AS OWED rather than added — a schema edit for a nicety is not this
        brief's window (`E621` owns it for the chain, one edit at a time).
      */
      countWindowed(window, "created_at", "interviewRequest", {
        provider_person_id: personId,
        status: { in: ["DECLINED", "CANCELLED"] },
      }),
    ]);

  /* ── the two series, BOTH BUCKETED BY THE SELECTED PERIOD ───────────────
     ⚠⚠ `since` IS DERIVED FROM THE BUCKETS, NOT HARD-CODED. A query window that
     did not match the buckets would either starve the first bucket or fetch
     rows with nowhere to land — and the second is how a total stops matching
     its own line.
     ⚠ SUPERSEDED, quoted not deleted (`E164`) — eight fixed weeks, which made
     `90 Days` and `YTD` draw the identical line:
     //   const weekMs = 7 * 86_400_000;
     //   const since = new Date(Date.now() - 8 * weekMs);
     //   const weeklyLessons = Array.from({ length: 8 }, (_, i) => {
     //     const lo = new Date(since.getTime() + i * weekMs);
     //     const hi = new Date(lo.getTime() + weekMs);
     //     return rows.filter((r) => r.completed_at >= lo && r.completed_at < hi).length;
     //   });                                                                   */
  const buckets = trendBuckets(trend);
  const since = buckets[0].lo;

  const [lessonRows, inviteRows] = await Promise.all([
    prisma.lessonProgress.findMany({
      where: { user_id: userId, completed_at: { gte: since } },
      select: { completed_at: true },
    }),
    prisma.colleagueInvite.findMany({
      where: { inviter_person_id: personId, created_at: { gte: since } },
      select: { created_at: true },
    }),
  ]);
  /* ⚠ SUPERSEDED, quoted not deleted (`E164`) — the work-order series, deleted
     because nothing draws it:
     //   const orderRows = await prisma.workOrder.findMany({
     //     where: { provider_person_id: personId, created_at: { gte: since } },
     //     select: { created_at: true },
     //   });
     //   const orderSeries = countInBuckets(orderRows.map((r) => r.created_at), buckets);
  */
  const lessonSeries = countInBuckets(
    lessonRows.map((r) => r.completed_at).filter((d): d is Date => d !== null),
    buckets
  );
  const inviteSeries = countInBuckets(
    inviteRows.map((r) => r.created_at),
    buckets
  );

  /* ── teaching ───────────────────────────────────────────────────────────── */
  const teaches = pathIds.length > 0;
  const [learners, lessonsByThem, questions, questionsWaiting] = teaches
    ? await Promise.all([
        prisma.learnEnrollment
          .findMany({
            where: { learning_path_id: { in: pathIds } },
            select: { user_id: true },
            distinct: ["user_id"],
          })
          .then((r) => r.length),
        prisma.lessonProgress.count({
          where: { lesson: { section: { course: { learning_path_id: { in: pathIds } } } } },
        }),
        prisma.forumThread.count({ where: { board: { learning_path_id: { in: pathIds } } } }),
        /* ⚠⚠ THE QUERY LIVES IN `lib/forums.ts` — see its header for Scott's
           definition and for why `check:community` GUARD 2 moved it there. */
        countThreadsWaitingOn(personId, pathIds),
      ])
    : [0, 0, 0, 0];

  return {
    window,
    profile: {
      views: providerProfileId ? views : { uncounted: "You have no provider profile yet" },
      shownInSearch: { uncounted: NO_SEARCH_LOG },
      rateSeen: { uncounted: NO_SEARCH_LOG },
    },
    network: {
      colleagues: firstDegree.length,
      invitesSent,
      joined,
      growthScore: score.points,
      inviteSeries,
    },
    learning: {
      lessonsCompleted: lessons,
      pathsEnrolled: enrolled,
      certifications: certs,
      pathsTaught: pathIds.length,
      lessonSeries,
    },
    work: {
      /*
        ⚠⚠⚠ THE WRITER TEST, APPLIED — SCOTT'S CORRECTION OF HIS OWN RULING, 2026-09-23.

        ⚠ THE RULE: *"a figure is countable when the state it counts HAS A WRITER,
        not when something upstream of it does."* ⚠⚠ I FLIPPED THREE FIGURES TO
        COUNTED WITHOUT APPLYING IT, and this brief's own Work premise check is
        what measured the truth:
          · **`ProviderBid` — no `providerBid.create` EXISTS ANYWHERE.**
          · **`InterviewRequest` — no `interviewRequest.create` EXISTS ANYWHERE.**
          · **`WorkOrder` — no `workOrder.create` EXISTS ANYWHERE.** `orders.ts`
            can only `updateMany` an order that nothing ever built, so even
            `ACCEPTED` and `RELEASED` are unreachable code.
        ⚠⚠⚠ A ZERO HERE WOULD CLAIM THE MECHANISM WORKS AND NOBODY HAS USED IT.
        None of these mechanisms exist. **That is the difference between a
        measured zero and an absence, and it is the whole point of the type.**

        ⚠ `requestsReceived` STAYS A COUNTED ZERO, and that was CONFIRMED rather
        than assumed: `work-request-invite.ts:116` does `bidRequest.create` with
        `issued_at: new Date()` and `status: "ISSUED"`, and `inviteProviders` is
        reachable from `/api/work-requests/[id]/invite/route.ts`. **A real writer,
        on a real route, setting the exact column this figure filters on.**

        ⚠ SUPERSEDED, quoted not deleted (`E164`):
        //   requestsReceived: bids,
        //   proposalsSent,
        //   invitationsToPropose: bids,
        //   interviews,
        //   interviewsTaken,
        //   interviewsDeclined,
      */
      requestsReceived: bids,
      /* ⚠ SUPERSEDED, quoted not deleted (`E164`) — true until `E621` built the
         writer whose absence it named:
         //   proposalsSent: { uncounted: "Proposals aren't recorded yet — nothing creates one" }, */
      proposalsSent,
      invitationsToPropose: bids,
      /* ⚠ SUPERSEDED, quoted not deleted (`E164`) — all three were true until
         `E621` WS-B built `lib/interviews.ts`, the writer whose absence they
         named. ⚠⚠ RULING 24: *"nothing writes it"* is a reason the figure was
         uncountable, never a reason not to build the writer:
         //   interviews: { uncounted: "Interviews aren't recorded yet — nothing creates a request" },
         //   interviewsTaken: { uncounted: "Interviews aren't recorded yet — nothing creates a request" },
         //   interviewsDeclined: { uncounted: "Interviews aren't recorded yet — nothing creates a request" }, */
      interviews,
      interviewsTaken,
      interviewsDeclined,
      /*
        ⚠⚠⚠ SCOPED TO THIS PROVIDER. ⚠ SUPERSEDED, quoted not deleted (`E164`):
        //   workOrders: await prisma.workOrder.count(),
        ⚠⚠ THAT COUNTED **EVERY WORK ORDER ON THE PLATFORM** and presented the
        total as one member's figure — no `where` at all. ⚠ It read as correct
        because `WorkOrder` holds ZERO rows, so the bug renders `0` today and
        would start lying on the first order anybody wrote.
        ⚠⚠ A ZERO THAT IS RIGHT BY ACCIDENT IS NOT A PASSING FIGURE. It was
        found by asking what renders `s.work` — see the dead-group note below —
        not by the number looking wrong.
        ⚠ `provider_person_id` is REQUIRED on the model and indexed, so the
        scoped count is the cheap one as well as the correct one.
      */
      /*
        ── ⚠⚠⚠ WORK ORDERS — NOW A REAL COUNT (`E621` WS-D) ─────────────────
        ⚠ IT READ *"Work orders aren't created yet"*, and that was TRUE: measured
        at the premise check, **`workOrder.create` existed nowhere in `src/`.**
        ⚠⚠ `lib/work-orders.ts` is that writer — `hire()` and
        `acceptPurchaseOrder()` both create one — so the writer test is SATISFIED
        rather than waived (ruling 24).
        ⚠⚠⚠ SCOPED, AND THE SCOPE IS THE PART THAT WAS ALREADY RIGHT: the quote
        below kept `provider_person_id` because an unscoped count once presented
        **every work order on the platform** as one member's figure. ⚠ Restored
        WITH its scope, never without.
        ⚠ SUPERSEDED, quoted not deleted (`E164`):
        //   workOrders: { uncounted: "Work orders aren't created yet" },
      */
      workOrders: await prisma.workOrder.count({
        where: { provider_person_id: personId },
      }),
      /*
        ⚠⚠⚠ EARNINGS IS A DASH, NOT `$0.00`, AND THE MOCKUP DISAGREES.
        ⚠ The mockup renders `$0.00`. ⚠⚠ THE PAGE'S STANDING DECISION SAYS NOT
        TO, in terms: *"'$0 earned' is a claim we have not earned the right to
        make."* ⚠⚠⚠ AND SCOTT'S OWN RULING FOR THIS BRIEF AGREES — *"a real zero
        and an unknown must not look the same"* — because **no order has ever
        settled**: `WorkOrder`, `SettlementRequest` and `Payment` all hold ZERO
        rows, so `$0.00` would report a result where there is no mechanism.
        ⚠ The RULING is followed over the mockup's pixels, and the conflict is
        reported at the gate rather than resolved silently.
      */
      /*
        ⚠⚠⚠ THE STRING NAMES THE TRUNCATION, NOT THE MEMBER'S ACTION.
        ⚠ SCOTT, 2026-09-23: *"A promise about what will start counting is a
        claim about a mechanism. Don't make one for a mechanism that doesn't
        exist."*
        ⚠⚠ RE-VERIFIED BY BEHAVIOUR, NOT BY NAME (2026-09-23): the ONLY
        occurrences of `"PAID"` in `src/` are a READ filter in `settlements.ts`
        and two gate assertions. **Nothing writes it.** There is no `Payout`
        model at all — only `PayoutMethod` — and no `payment.create` anywhere.
        A `SettlementRequest` reaches `APPROVED` and the chain stops.
        ⚠ SUPERSEDED, quoted not deleted (`E164`) — both said the same false
        thing, that finishing paid work starts the counter:
        //   earnings: { uncounted: "Starts counting when an order settles — none has" },
        //   the old tile: "This starts counting once you complete your first paid work order."
      */
      earnings: { uncounted: "Settlement isn't finished yet — no order can reach paid" },
    },
    teaching: {
      teaches,
      learners,
      lessonsByThem,
      questions,
      questionsWaiting,
    },
  };
}
