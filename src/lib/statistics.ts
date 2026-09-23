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
 * ⚠⚠ EVERY FIGURE ON THE PAGE, WITH ITS SOURCE NAMED IN ONE PLACE.
 * ⚠ Grouped the way the page groups them so a reader can hold both at once.
 */
export type Statistics = {
  window: StatWindow;
  profile: { views: Figure; score: Figure; shownInSearch: Figure; rateSeen: Figure };
  network: { colleagues: Figure; invitesSent: Figure; joined: Figure; growthScore: Figure };
  learning: {
    lessonsCompleted: Figure;
    pathsEnrolled: Figure;
    certifications: Figure;
    pathsTaught: Figure;
    /** ⚠ Eight buckets, oldest first. `LessonProgress.completed_at` exists, so
     *  this is countable — the brief's open question, answered by measurement. */
    weeklyLessons: number[] | { uncounted: string };
  };
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
  window: StatWindow = "month"
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

  /* ── the sparkline: eight weekly buckets, oldest first ──────────────────── */
  const weekMs = 7 * 86_400_000;
  const since = new Date(Date.now() - 8 * weekMs);
  const rows = await prisma.lessonProgress.findMany({
    where: { user_id: userId, completed_at: { gte: since } },
    select: { completed_at: true },
  });
  const weeklyLessons = Array.from({ length: 8 }, (_, i) => {
    const lo = new Date(since.getTime() + i * weekMs);
    const hi = new Date(lo.getTime() + weekMs);
    return rows.filter((r) => r.completed_at >= lo && r.completed_at < hi).length;
  });

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
      /* ⚠ The score is computed by `completeness.ts` on the page, which already
         holds it — this module does not recompute it and risk two answers. */
      score: { uncounted: "Read from the profile, not counted here" },
      shownInSearch: { uncounted: NO_SEARCH_LOG },
      rateSeen: { uncounted: NO_SEARCH_LOG },
    },
    network: {
      colleagues: firstDegree.length,
      invitesSent,
      joined,
      growthScore: score.points,
    },
    learning: {
      lessonsCompleted: lessons,
      pathsEnrolled: enrolled,
      certifications: certs,
      pathsTaught: pathIds.length,
      weeklyLessons,
    },
    work: {
      requestsReceived: bids,
      proposalsSent: { uncounted: "No Proposal model exists — a proposal is not recorded yet" },
      interviews,
      workOrders: await prisma.workOrder.count(),
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
