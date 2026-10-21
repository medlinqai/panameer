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
  tone?: "celebrate";
};

export type AttentionGap = { id: AttentionCardId; label: string; waitingOn: string };

export type AttentionResult = {
  cards: AttentionCard[];
  /** Cards that cannot be counted at all yet, with what they wait on. */
  gaps: AttentionGap[];
};

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
      href: "/payments",
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
      href: "/orders",
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
      href: "/payments/payment-requests",
      icon: "CalendarClock",
    },
    null,
    "the timesheet / payment-request model"
  );

  add(
    {
      id: "offers",
      label: "Offers to Accept",
      detail: "on your services",
      href: "/services/offers",
      icon: "Tag",
    },
    null,
    "an offer model (ServiceProduct exists; nothing records an offer against one)"
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
      href: "/connect/community",
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

  return prisma.job.count({
    where: {
      status: "OPEN",
      kind: "JOB",
      skills: { some: { skill_id: { in: skillIds } } },
      ...(profile.dashboard_seen_at
        ? { posted_at: { gt: profile.dashboard_seen_at } }
        : {}),
    },
  });
}

async function countCoursesToWatch(userId: string): Promise<number> {
  const enrollments = await prisma.enrollment.findMany({
    where: { user_id: userId },
    select: {
      learning_path_id: true,
      learningPath: {
        select: {
          courses: { select: { sections: { select: { _count: { select: { lessons: { where: { retired_at: null } } } } } } } },
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

// ── RA-E001: one counts source — per app and per tab, each item something waiting on THIS person ─────────────
export type AppKey = "request" | "shop" | "order" | "settlement" | "payment" | "connect" | "learn";
export type AttentionItem = { id: string; what: string; app: AppKey; appLabel: string; due: string | null; href: string; action: string };
export type AppCounts = {
  side: "buyer" | "provider";
  request: { total: number; jobs: number; requests: number; interviews: number; tests: number };
  /** SA-E001: Shop — offers waiting on you, purchases (WOs to accept / deliveries to approve) or sales (to accept / to deliver). */
  shop: { total: number; offers: number; purchases: number; sales: number };
  order: { total: number };
  settlement: { total: number };
  payment: { total: number };
  connect: { total: number };
  learn: { total: number };
  items: AttentionItem[];
};
export const APP_HOME: Record<"buyer" | "provider", Record<AppKey, string>> = {
  buyer: { request: "/hire/overview", shop: "/shop", order: "/orders/overview", settlement: "/payments/payment-requests", payment: "/pay", connect: "/connect", learn: "/learn?tab=mine" },
  provider: { request: "/find-work", shop: "/shop", order: "/orders/overview", settlement: "/payments/payment-requests", payment: "/payments", connect: "/connect", learn: "/learn?tab=mine" },
};
const APP_LABEL: Record<AppKey, string> = { request: "Hire", shop: "Shop", order: "Orders", settlement: "Settlements", payment: "Payments", connect: "Connect", learn: "Learn" };
const DAY_MS = 86_400_000;
const dueText = (d: Date | null | undefined) => (d ? d.toLocaleString("en-US", { timeZone: "America/New_York", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : null);

export async function appCounts(viewer: { userId: string }, side: "buyer" | "provider"): Promise<AppCounts> {
  const me = await prisma.person.findUnique({ where: { user_id: viewer.userId }, select: { id: true } });
  const zero = { total: 0 };
  const empty: AppCounts = { side, request: { total: 0, jobs: 0, requests: 0, interviews: 0, tests: 0 }, shop: { total: 0, offers: 0, purchases: 0, sales: 0 }, order: zero, settlement: zero, payment: zero, connect: zero, learn: zero, items: [] };
  if (!me) return empty;
  const id = me.id;
  const now = new Date();
  const soon = new Date(now.getTime() + DAY_MS);
  const { nyDayStart } = await import("@/lib/live-work");
  const today = { gte: nyDayStart(now), lt: nyDayStart(now, 1) };
  const { unreadCount } = await import("@/lib/messages");
  const [connect, learn] = await Promise.all([unreadCount(viewer as Parameters<typeof unreadCount>[0]).catch(() => 0), countCoursesToWatch(viewer.userId).catch(() => 0)]);
  const items: AttentionItem[] = [];
  const { shopCounts } = await import("@/lib/shop-app");
  const sc = await shopCounts(id, side === "buyer" ? "buyer" : "seller");
  const shop = { total: sc.total, offers: sc.offers, purchases: sc.purchases, sales: sc.sales };
  const add = (app: AppKey, n: number, what: string, href: string, action: string, due?: Date | null) => { if (n > 0) items.push({ id: `${app}:${what}`, what: n > 1 ? `${what} (${n})` : what, app, appLabel: APP_LABEL[app], due: dueText(due), href, action }); return n; };

  if (side === "buyer") {
    const [toReview, closing, expired, confirm, todays, testsIn, approvals, woAccept, settle, pay] = await Promise.all([
      prisma.proposal.findMany({ where: { status: "SUBMITTED", job: { buyer_person_id: id }, proposalRequest: { sourcingEvent: { status: { in: ["OPEN", "CLOSED"] } } } }, select: { proposalRequest: { select: { sourcingEvent: { select: { id: true, deadline_at: true } } } } } }),
      prisma.sourcingEvent.findMany({ where: { created_by_person_id: id, status: "OPEN", deadline_at: { gt: now, lte: soon } }, select: { id: true, deadline_at: true } }),
      prisma.sourcingEvent.count({ where: { created_by_person_id: id, status: "OPEN", deadline_at: { lte: now } } }),
      prisma.interviewRequest.count({ where: { requested_by_person_id: id, status: "SLOTS_OFFERED" } }),
      prisma.interviewRequest.count({ where: { requested_by_person_id: id, status: "SCHEDULED", response: { lines: { some: { starts_at: today } } } } }),
      prisma.testRequest.count({ where: { requested_by_person_id: id, status: "COMPLETED", updated_at: { gte: new Date(now.getTime() - 7 * DAY_MS) } } }),
      prisma.workRequest.count({ where: { job: { buyer_person_id: id }, status: "PENDING_APPROVAL" } }),
      prisma.workOrder.count({ where: { buyer_person_id: id, status: "ISSUED", buyer_accepted_at: null } }),
      prisma.workOrder.findMany({ where: { buyer_person_id: id }, select: { id: true } }).then((os) => prisma.paymentRequest.count({ where: { status: "SUBMITTED", work_order_id: { in: os.map((o) => o.id) } } })),
      prisma.workOrder.findMany({ where: { buyer_person_id: id }, select: { id: true } }).then((os) => prisma.paymentRequest.count({ where: { status: "APPROVED", work_order_id: { in: os.map((o) => o.id) } } })),
    ]);
    const ev = toReview[0]?.proposalRequest?.sourcingEvent;
    const jobs = add("request", toReview.length, "Proposals to review", ev ? `/hire/sourcing/${ev.id}` : "/hire/overview?tab=jobs", "Review", ev?.deadline_at)
      + add("request", closing.length, "Sourcing Event closing in 24 h", `/hire/sourcing/${closing[0]?.id ?? ""}`, "Open", closing[0]?.deadline_at)
      + add("request", expired, "Sourcing Event expired, no award", "/hire/overview?tab=jobs", "Decide");
    // HB-E006: each app lists only its own tasks — Work Orders (accept, release, changes) belong to Orders.
    const requests = add("request", approvals, "Work Request approvals", "/hire/overview?tab=requests", "Approve");
    add("order", woAccept, "Work Orders to accept", "/orders/overview", "Accept");
    const interviews = add("request", confirm, "Interview times to confirm", "/hire/overview?tab=interviews", "Confirm") + add("request", todays, "Interviews today", "/hire/overview?tab=interviews", "Join");
    const tests = add("request", testsIn, "Test results in", "/hire/overview?tab=tests", "See results");
    add("shop", sc.offers, "Counter-offers waiting on you", "/shop?tab=offers", "Answer");
    add("shop", sc.purchases, "Purchases needing you", "/shop?tab=purchases", "Open");
    add("shop", sc.estimates, "Estimates in to review", "/shop?tab=estimates", "Review");
    add("settlement", settle, "Settlements to approve", APP_HOME.buyer.settlement, "Approve");
    add("payment", pay, "Payments due", APP_HOME.buyer.payment, "Pay");
    add("connect", connect, "Unread messages", "/messages", "Read");
    return { side, request: { total: jobs + requests + interviews + tests, jobs, requests, interviews, tests }, shop, order: { total: woAccept }, settlement: { total: settle }, payment: { total: pay }, connect: { total: connect }, learn: { total: learn }, items };
  }

  const [dueSoon, toOffer, todays, testsToTake, woAccept, drafts, paidIn] = await Promise.all([
    prisma.proposalRequest.findMany({ where: { provider_person_id: id, status: { in: ["ISSUED", "VIEWED"] }, responds_by: { gt: now, lte: soon }, bid: null }, orderBy: { responds_by: "asc" }, select: { job_id: true, responds_by: true } }),
    prisma.interviewRequest.findMany({ where: { provider_person_id: id, status: "REQUESTED" }, select: { job_id: true } }),
    prisma.interviewRequest.count({ where: { provider_person_id: id, status: "SCHEDULED", response: { lines: { some: { starts_at: today } } } } }),
    prisma.testRequest.count({ where: { provider_person_id: id, status: { in: ["ISSUED", "IN_PROGRESS"] } } }),
    prisma.workOrder.findMany({ where: { provider_person_id: id, status: "ISSUED", provider_accepted_at: null }, select: { id: true } }),
    prisma.paymentRequest.count({ where: { provider_person_id: id, status: { in: ["DRAFT", "REJECTED"] } } }),
    prisma.paymentRequest.count({ where: { provider_person_id: id, status: "APPROVED" } }),
  ]);
  const requests = add("request", dueSoon.length, "Requests to propose due in 24 h", dueSoon[0] ? `/find-work/${dueSoon[0].job_id}` : "/find-work?tab=invitations", "Propose", dueSoon[0]?.responds_by);
  const interviews = add("request", toOffer.length, "Interview times to offer", toOffer[0] ? `/find-work/${toOffer[0].job_id}#interview` : "/find-work?tab=interviews", "Offer times") + add("request", todays, "Interviews today", "/find-work?tab=interviews", "Join");
  const tests = add("request", testsToTake, "Tests to take", "/find-work?tab=tests", "Take");
  const myOrders = (await prisma.workOrder.findMany({ where: { provider_person_id: id }, select: { id: true } })).map((o) => o.id);
  const changes = myOrders.length ? await prisma.workOrderRevision.count({ where: { status: "PENDING", work_order_id: { in: myOrders } } }) : 0;
  const order = add("order", woAccept.length, "Work Orders to accept", "/orders/overview", "Accept") + add("order", changes, "Change orders to answer", "/orders/overview", "Answer");
  add("shop", sc.offers, "Offers to answer", "/shop?tab=offers", "Answer");
  add("shop", sc.sales, "Product sales needing you", "/shop?tab=sales", "Open");
  add("shop", sc.estimates, "Estimates to price", "/shop?tab=estimates", "Price");
  add("settlement", drafts, "Payment requests to submit", APP_HOME.provider.settlement, "Submit");
  add("payment", paidIn, "Payments on the way", APP_HOME.provider.payment, "See");
  add("connect", connect, "Unread messages", "/messages", "Read");
  return { side, request: { total: requests + interviews + tests, jobs: 0, requests, interviews, tests }, shop, order: { total: order }, settlement: { total: drafts }, payment: { total: paidIn }, connect: { total: connect }, learn: { total: learn }, items };
}
