import { prisma } from "@/lib/prisma";
import { growthScore, windowRange, type GrowthWindow } from "@/lib/growth-score";

/**
 * ── ⚠⚠⚠ THE STATISTICS PAGE'S FIGURES (`P2-A2-E603` WS-A) ────────────────
 *
 * ⚠ SCOTT, 2026-09-23: *"Every figure is counted or it does not render. A figure
 * that can't be counted shows a dash and says why — never a 0. A real zero and
 * an unknown must not look the same."*
 *
 * ⚠⚠ THAT RULE WAS ALREADY THE PAGE'S OWN DOCTRINE AND PREDATES THIS BRIEF.
 * `/stats` has said since `E010`: *"a provider shown 'Job Success 0%' would
 * reasonably think they had failed at something, and '$0 earned' is a claim we
 * have not earned the right to make."* ⚠ This module extends that page; it does
 * not replace it.
 *
 * ── ⚠⚠⚠ THE TYPE IS THE ENFORCEMENT ──────────────────────────────────────
 *
 * ⚠ A figure is `number` (counted) or `{ uncounted: string }` (a dash and the
 * reason). ⚠⚠ THERE IS NO THIRD STATE AND NO `null` THAT A RENDERER COULD TURN
 * INTO `0` BY ACCIDENT — the component cannot print a dash without a reason,
 * and cannot print a number that was never counted. **The compiler carries the
 * rule, not a convention.**
 */
export type Figure = number | { uncounted: string };

/** ⚠ `true` for a real, measured zero — which RENDERS as `0`, deliberately. */
export const isCounted = (f: Figure): f is number => typeof f === "number";

export type StatWindow = Extract<GrowthWindow, "month" | "all">;

/**
 * ── ⚠⚠⚠ THE TREND PERIOD IS DEFINED HERE, NOT IN A COMPONENT ─────────────
 *
 * ⚠ Only the two periods Scott named. No others, ever — a period nobody asked
 * for is a window somebody has to explain.
 * ⚠⚠ IT LIVES BESIDE THE BUCKETING THAT IMPLEMENTS IT. `StatCardBacks` re-exports
 * it so the components are unchanged, but **the period and the query that
 * answers it are one file apart, not one layer apart.**
 */
export type TrendPeriod = "90d" | "ytd";

/**
 * ── ⚠⚠⚠ THE BUCKETS ARE WHAT MAKE THE PERIOD CONTROL REAL ────────────────
 *
 * ⚠⚠⚠ MEASURED DEFECT, FIXED HERE (`E603` WS-A, at the correction renders):
 * the series was EIGHT FIXED WEEKS regardless of the period, so `90 Days` and
 * `YTD` drew **the identical line** — the pill moved, the data did not.
 * ⚠⚠ THAT IS THE SAME DEFECT AS THE FRONT-FACE PERIOD SWITCH SCOTT HAD REMOVED
 * IN CORRECTION 4: a control that reports a change it did not make. A switch
 * that does nothing is worse than no switch, because the member believes the
 * second reading.
 *
 * ⚠ `90d` — THIRTEEN WEEKLY buckets (13 × 7 = 91 days), oldest first.
 * ⚠ `ytd` — ONE CALENDAR MONTH PER BUCKET, January through the current month.
 * ⚠⚠ THE GRAIN CHANGES WITH THE SPAN ON PURPOSE: 39 weekly points across a year
 * is noise at 280px wide, and a year drawn in 13 weeks would not be a year.
 *
 * ⚠⚠ THE BUCKETS ARE HALF-OPEN `[lo, hi)` SO NO ROW IS COUNTED TWICE at a
 * boundary, and the last bucket runs to the END of the current week/month —
 * a row created today lands in it rather than falling off the end.
 */
type Bucket = { lo: Date; hi: Date };

export function trendBuckets(period: TrendPeriod, now: Date = new Date()): Bucket[] {
  if (period === "ytd") {
    const y = now.getFullYear();
    /* ⚠ `now.getMonth()` is 0-based, so +1 is "January through this month". */
    return Array.from({ length: now.getMonth() + 1 }, (_, i) => ({
      lo: new Date(y, i, 1),
      hi: new Date(y, i + 1, 1),
    }));
  }
  /*
    ⚠⚠⚠ THE WINDOW ENDS AT THE END OF **TODAY**, NOT AT THE INSTANT `now`.
    ⚠ CAUGHT BY THIS BRIEF'S OWN GATE: anchoring the last bucket's `hi` to
    `now` makes the range `[lo, now)`, and the buckets are half-open — so a row
    written at this very moment falls PAST the last bucket and is counted by
    nobody, while still being inside the period the pills claim.
    ⚠⚠ ANCHORING TO MIDNIGHT ALSO MAKES THE BUCKETS STABLE WITHIN A DAY: two
    loads a minute apart return the same boundaries, so the line does not creep
    sideways on every refresh.
    ⚠ SUPERSEDED, quoted not deleted (`E164`):
    //   const start = new Date(now.getTime() - 13 * weekMs);
  */
  const weekMs = 7 * 86_400_000;
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const start = new Date(endOfToday.getTime() - 13 * weekMs);
  return Array.from({ length: 13 }, (_, i) => ({
    lo: new Date(start.getTime() + i * weekMs),
    hi: new Date(start.getTime() + (i + 1) * weekMs),
  }));
}

/** ⚠ ONE BUCKETER FOR BOTH SERIES — two would drift, and the two cards would
 *  then disagree about what "90 days" means on the same screen. */
function countInBuckets(dates: Date[], buckets: Bucket[]): number[] {
  return buckets.map((b) => dates.filter((d) => d >= b.lo && d < b.hi).length);
}

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
  /* ⚠⚠⚠ MEASURED AND REPORTED, NOT BUILT AND NOT DELETED (`E603` WS-A):
     **NOTHING RENDERS `work`.** `StatisticsCards` draws Profile, Network,
     Learning and Teaching; the Work figures on `/stats` come from the page's
     OWN older cards (`Earnings (12 Months)`, `Job Success Score`, `Proposals`,
     `Interviews`), which this brief did not touch.
     ⚠⚠ SO THESE FIVE FIGURES COST FIVE QUERIES PER PAGE LOAD AND REACH NO
     SCREEN. ⚠ That is `E579`'s shape inverted — not a door onto a wall, but a
     room with no door. ⚠⚠⚠ IT IS KEPT RATHER THAN REMOVED because the mockup
     has a Work card and WS-B/WS-C may render it; **whether it ships is Scott's
     call, not a tidy-up.** ⚠ The unscoped `workOrders` count below was found
     by asking this question. */
  work: {
    requestsReceived: Figure;
    proposalsSent: Figure;
    interviews: Figure;
    workOrders: Figure;
    earnings: Figure;
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
  model: "profileView" | "connection" | "colleagueInvite" | "lessonProgress" | "learnEnrollment",
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
  const teachesWhere = {
    OR: [
      { expert_person_id: personId },
      { courses: { some: { sections: { some: { lessons: { some: { expert_person_id: personId } } } } } } },
    ],
  };

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

  const [views, invitesSent, joined, lessons, enrolled, certs, bids, interviews] =
    await Promise.all([
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
      providerProfileId
        ? prisma.certification.count({ where: { provider_profile_id: providerProfileId } })
        : Promise.resolve(0),
      prisma.bidRequest.count({ where: { provider_person_id: personId } }),
      prisma.interviewRequest.count({ where: { provider_person_id: personId } }),
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
  const [learners, lessonsByThem, questions] = teaches
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
      ])
    : [0, 0, 0];

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
      requestsReceived: bids,
      proposalsSent: { uncounted: "No Proposal model exists — a proposal is not recorded yet" },
      interviews,
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
      workOrders: await prisma.workOrder.count({ where: { provider_person_id: personId } }),
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
      earnings: { uncounted: "Starts counting when an order settles — none has" },
    },
    teaching: {
      teaches,
      learners,
      lessonsByThem,
      questions,
      /* ⚠ "Waiting on you" needs an answered/unanswered flag on a thread, and
         `ForumThread` carries none. Counted would be a guess. */
      questionsWaiting: { uncounted: "A thread does not record whether it is answered" },
    },
  };
}
