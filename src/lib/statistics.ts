import { prisma } from "@/lib/prisma";
import { growthScore, windowRange, type GrowthWindow } from "@/lib/growth-score";
import { teachesPathWhere } from "@/lib/learn-home";
import { countThreadsWaitingOn } from "@/lib/forums";
import { type Figure, type TrendPeriod, trendBuckets, countInBuckets } from "@/lib/figure";

export { isCounted, trendBuckets } from "@/lib/figure";
export type { Figure, TrendPeriod } from "@/lib/figure";

export type StatWindow = Extract<GrowthWindow, "month" | "all">;

export type Statistics = {
  window: StatWindow;
  profile: { views: Figure; shownInSearch: Figure; rateSeen: Figure };
  network: {
    colleagues: Figure;
    invitesSent: Figure;
    joined: Figure;
    growthScore: Figure;
    inviteSeries: number[] | { uncounted: string };
  };
  learning: {
    lessonsCompleted: Figure;
    pathsEnrolled: Figure;
    certifications: Figure;
    pathsTaught: Figure;
    lessonSeries: number[] | { uncounted: string };
  };
  work: {
    requestsReceived: Figure;
    proposalsSent: Figure;
    invitationsToPropose: Figure;
    interviews: Figure;
    interviewsTaken: Figure;
    interviewsDeclined: Figure;
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

const NO_SEARCH_LOG = "Needs a search-results log — nothing records one today";

async function countWindowed(
  window: StatWindow,
  field: string,
  model:
    | "profileView"
    | "connection"
    | "colleagueInvite"
    | "lessonProgress"
    | "learnEnrollment"
    | "proposal"
    | "interviewRequest",
  where: Record<string, unknown>
): Promise<number> {
  const { from } = windowRange(window === "all" ? "all" : "month");
  const dated = from ? { ...where, [field]: { gte: from } } : where;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (prisma as any)[model].count({ where: dated });
}

export async function getStatistics(
  personId: string,
  userId: string,
  providerProfileId: string | null,
  window: StatWindow = "month",
  trend: TrendPeriod = "90d"
): Promise<Statistics> {
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
      prisma.certification.count({ where: { user_id: userId } }),
      prisma.proposalRequest.count({
        where: { provider_person_id: personId, issued_at: { not: null } },
      }),
      countWindowed(window, "submitted_at", "proposal", {
        provider_person_id: personId,
        submitted_at: { not: null },
      }),
      countWindowed(window, "created_at", "interviewRequest", {
        provider_person_id: personId,
      }),
      countWindowed(window, "completed_at", "interviewRequest", {
        provider_person_id: personId,
        status: "COMPLETED",
        completed_at: { not: null },
      }),
      countWindowed(window, "created_at", "interviewRequest", {
        provider_person_id: personId,
        status: { in: ["DECLINED", "CANCELLED"] },
      }),
    ]);

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
        countThreadsWaitingOn(personId, pathIds),
      ])
    : [0, 0, 0, 0];

  return {
    window,
    profile: {
      views: providerProfileId ? views : { uncounted: "No provider profile" },
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
      proposalsSent,
      invitationsToPropose: bids,
      interviews,
      interviewsTaken,
      interviewsDeclined,
      workOrders: await prisma.workOrder.count({
        where: { provider_person_id: personId },
      }),
      earnings: { uncounted: "Not counted yet" },
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
