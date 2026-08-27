/**
 * "Needs Your Attention" — the provider dashboard's action strip
 * (brief_sp_dashboard WS-A/WS-C).
 *
 * NINE CARDS, ONE COUNT-SOURCE. Every card is declared here with the query that
 * produces its count, so a card that cannot be counted yet returns `null` and
 * simply does not render. When its model lands, one function body changes and
 * the card lights up — nothing in the strip component moves.
 *
 * ACTIONABLE CARDS, NOT STAT TILES, and the difference is the whole point. A
 * stat tile reports a number and asks nothing; these appear only when there is
 * something to DO, carry one tap to the exact filtered view, and disappear once
 * the count is zero. A dashboard of permanent zeros trains people to stop
 * looking at it.
 *
 * NULL vs 0 IS LOAD-BEARING:
 *   null → this card CANNOT be counted (no model). It never renders, in either
 *          mode, and it is not "0 items" — we do not know.
 *   0    → counted, and there is nothing to do. Card hides; contributes to the
 *          calm state.
 *   n>0  → the card renders, in the order below.
 * Collapsing those two into one number is how "you have 0 unread messages"
 * appears on a product with no messaging.
 */
import { prisma } from "@/lib/prisma";

export type AttentionCardId =
  | "paid"
  | "work-orders"
  | "weeks-to-bill"
  | "offers"
  | "invites"
  | "new-matches"
  | "connections"
  | "messages"
  | "courses";

export type AttentionCard = {
  id: AttentionCardId;
  label: string;
  /** Filled with the count, e.g. "3 work orders to accept". */
  detail: string;
  href: string;
  /** Lucide name, rendered by RailIcon's map. */
  icon: string;
  count: number;
  /**
   * The celebration card is styled and behaves differently — green rather than
   * neutral, and dismissible, because good news you cannot dismiss becomes
   * nagging by the third day.
   */
  tone?: "celebrate";
};

/**
 * Why a card is not showing, for the dashboard's own diagnostics and for the
 * report this brief asks for. Never rendered to a provider — "we can't count
 * this" is our problem, not theirs.
 */
export type AttentionGap = { id: AttentionCardId; label: string; waitingOn: string };

export type AttentionResult = {
  cards: AttentionCard[];
  /** Cards that cannot be counted at all yet, with what they wait on. */
  gaps: AttentionGap[];
};

/**
 * THE ORDER IS MONEY → CELEBRATION → PIPELINE → ENGAGEMENT → GROWTH, and it is
 * fixed here rather than sorted at render. It encodes a judgement about what a
 * provider should see first when several fire at once, and a component that
 * re-sorted by count would put "12 courses" above "you got paid".
 */
export async function getAttentionCards(input: {
  personId: string | null;
  profileId: string | null;
  userId: string | null;
}): Promise<AttentionResult> {
  const cards: AttentionCard[] = [];
  const gaps: AttentionGap[] = [];

  const add = (card: Omit<AttentionCard, "count">, count: number | null, waitingOn?: string) => {
    if (count === null) {
      gaps.push({ id: card.id, label: card.label, waitingOn: waitingOn ?? "its model" });
      return;
    }
    if (count > 0) cards.push({ ...card, count });
  };

  /* 1 — MONEY, and the celebration. No Payment model exists. */
  add(
    {
      id: "paid",
      label: "You Got Paid!",
      detail: "A payment landed",
      href: "/finances",
      icon: "Wallet",
      tone: "celebrate",
    },
    null,
    "the Payments model (no payment record exists to celebrate)"
  );

  /* 2 — Work orders awaiting acceptance. No WorkOrder model. */
  add(
    {
      id: "work-orders",
      label: "Work Orders to Accept",
      detail: "waiting on your acceptance",
      href: "/contracts",
      icon: "ClipboardCheck",
    },
    null,
    "the Work Order model"
  );

  /* 3 — Unbilled work. Needs timesheets/payment requests; neither exists. */
  add(
    {
      id: "weeks-to-bill",
      label: "Weeks to Bill",
      detail: "ready to bill",
      href: "/finances/payment-requests",
      icon: "CalendarClock",
    },
    null,
    "the timesheet / payment-request model"
  );

  /* 4 — Offers on this provider's packages. `Package` exists; an OFFER on one
     does not — there is no model recording a buyer's interest in a package. */
  add(
    {
      id: "offers",
      label: "Offers to Accept",
      detail: "on your services",
      href: "/services/offers",
      icon: "Tag",
    },
    null,
    "an offer model (Package exists; nothing records an offer against one)"
  );

  /* 5 — Invitations to propose. NO MODEL — see the note in `countInvites`. */
  add(
    {
      id: "invites",
      label: "Invites Awaiting Proposal",
      detail: "buyers want your rate",
      href: "/find-work/invitations",
      icon: "Briefcase",
    },
    null,
    "a work-invitation model (CoordinatorInvite is representation, not work)"
  );

  /* 6 — New matches since last visit. REAL query; see below. */
  add(
    {
      id: "new-matches",
      label: "New Matches",
      detail: "new since your last visit",
      href: "/dashboard#work-feed",
      icon: "Search",
    },
    profileId(input) ? await countNewMatches(input.profileId as string) : null,
    "a provider profile"
  );

  /* 7 — Connection requests. No connection model. */
  add(
    {
      id: "connections",
      label: "Connection Requests",
      detail: "people want to connect",
      href: "/community",
      icon: "Users",
    },
    null,
    "a connection model"
  );

  /* 8 — Unread messages. No messaging model at all (Phase 2 finding). */
  add(
    {
      id: "messages",
      label: "Unread Messages",
      detail: "unread",
      href: "/messages",
      icon: "MessageSquare",
    },
    null,
    "the messaging model"
  );

  /* 9 — Courses in progress. REAL data. */
  add(
    {
      id: "courses",
      label: "Courses to Watch",
      detail: "in progress",
      href: "/learn?tab=mine",
      icon: "GraduationCap",
    },
    input.userId ? await countCoursesToWatch(input.userId) : null,
    "a signed-in learner"
  );

  return { cards, gaps };
}

function profileId(input: { profileId: string | null }) {
  return input.profileId;
}

/**
 * NEW MATCHES — posted work requests that touch this provider's skills and
 * appeared since they last looked.
 *
 * REAL QUERY, CURRENTLY ZERO. `WorkRequest` and `WorkRequestSkill` both exist
 * and this counts them properly; no buyer has posted one yet, so it returns 0
 * and the card hides. That is the correct behaviour and NOT a stub — the day a
 * buyer posts, this card appears with no code change.
 *
 * "Since your last visit" reads `dashboard_seen_at`, stamped when the dashboard
 * renders. A provider who has never visited sees everything posted as new,
 * which is right: it is all new to them.
 */
async function countNewMatches(profileId: string): Promise<number> {
  const profile = await prisma.providerProfile.findUnique({
    where: { id: profileId },
    select: {
      dashboard_seen_at: true,
      skills: { select: { skill_id: true } },
    },
  });
  if (!profile) return 0;
  const skillIds = profile.skills.map((s) => s.skill_id);
  if (skillIds.length === 0) return 0;

  return prisma.workRequest.count({
    where: {
      status: "POSTED",
      skills: { some: { skill_id: { in: skillIds } } },
      ...(profile.dashboard_seen_at
        ? { posted_at: { gt: profile.dashboard_seen_at } }
        : {}),
    },
  });
}

/**
 * COURSES TO WATCH — enrolled paths with lessons still unwatched.
 *
 * REAL DATA, and the only card with any today. Counts ENROLLMENTS rather than
 * lessons: "3 courses to watch" is a resumable thing, "47 lessons" is a wall.
 * An enrollment whose every lesson is complete is finished, not pending, so it
 * drops out on its own — which is what makes the card self-clearing.
 */
async function countCoursesToWatch(userId: string): Promise<number> {
  const enrollments = await prisma.learnEnrollment.findMany({
    where: { user_id: userId },
    select: {
      learning_path_id: true,
      learningPath: {
        select: {
          courses: { select: { sections: { select: { _count: { select: { lessons: true } } } } } },
        },
      },
    },
  });
  if (enrollments.length === 0) return 0;

  let pending = 0;
  for (const e of enrollments) {
    const total = e.learningPath.courses.reduce(
      (n, c) => n + c.sections.reduce((m, s) => m + s._count.lessons, 0),
      0
    );
    if (total === 0) continue;

    /*
      A LessonProgress ROW IS A COMPLETION — `completed_at` is non-nullable, so
      the row's existence is the fact and filtering on it being non-null was
      both redundant and a type error. Counted per PATH rather than globally:
      counting a user's completions across the catalog would let progress on one
      path mark another finished, which only shows up once somebody enrolls in a
      second course.
    */
    const done = await prisma.lessonProgress.count({
      where: {
        user_id: userId,
        lesson: { section: { course: { learning_path_id: e.learning_path_id } } },
      },
    });
    if (done < total) pending++;
  }
  return pending;
}
