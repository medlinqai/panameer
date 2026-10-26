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
      label: "Orders to Accept",
      detail: "waiting on your acceptance",
      href: "/orders",
      icon: "ClipboardCheck",
    },
    null,
    "the Order model"
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
      label: "Availability Requests Awaiting You",
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
export type AppKey = "request" | "shop" | "estimate" | "order" | "settlement" | "payment" | "connect" | "learn";
/** JR-E006: one line per thing to act on — title + number, detail (P-number until the Order is released, amount, start), due, its own button. */
export type AttentionLine = { key: string; what: string; detail: string; dueAt: string | null; href: string; action: string };
export type AttentionItem = { id: string; what: string; app: AppKey; appLabel: string; due: string | null; dueAt: string | null; href: string; action: string; /** Scott 10-23: which job(s) — "Oracle Application Manager + 2 more". */ sub?: string; jobIds?: string[]; /** JR-E006 */ title?: string; n?: number; lines?: AttentionLine[]; /** HT-E006: sort tier override (Profile / Set-Up / Connect follow the stage). */ tier?: number };
export type AppCounts = {
  side: "buyer" | "provider";
  request: { total: number; jobs: number; requests: number; interviews: number; tests: number };
  /** SA-E001: Shop — offers waiting on you, purchases (WOs to accept / deliveries to approve) or sales (to accept / to deliver). */
  shop: { total: number; offers: number; purchases: number; sales: number };
  /** HB-E008: Estimate — buyer: estimates in to review, requests expiring; provider: to price, changes requested, due soon. */
  estimate: { total: number };
  order: { total: number };
  settlement: { total: number };
  payment: { total: number };
  connect: { total: number };
  learn: { total: number };
  items: AttentionItem[];
};
export const APP_HOME: Record<"buyer" | "provider", Record<AppKey, string>> = {
  buyer: { request: "/hire/overview", shop: "/shop", estimate: "/estimate", order: "/orders/overview", settlement: "/payments/payment-requests", payment: "/pay", connect: "/connect", learn: "/learn?tab=mine" },
  provider: { request: "/find-work", shop: "/shop", estimate: "/estimate", order: "/orders/overview", settlement: "/payments/payment-requests", payment: "/payments", connect: "/connect", learn: "/learn?tab=mine" },
};
const APP_LABEL: Record<AppKey, string> = { request: "Hire", shop: "Shop", estimate: "Estimate", order: "Orders", settlement: "Settlements", payment: "Payments", connect: "Connect", learn: "Learn" };
const DAY_MS = 86_400_000;
const dueText = (d: Date | null | undefined) => (d ? d.toLocaleString("en-US", { timeZone: "America/New_York", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : null);

export async function appCounts(viewer: { userId: string }, side: "buyer" | "provider"): Promise<AppCounts> {
  const me = await prisma.person.findUnique({ where: { user_id: viewer.userId }, select: { id: true } });
  const zero = { total: 0 };
  const empty: AppCounts = { side, request: { total: 0, jobs: 0, requests: 0, interviews: 0, tests: 0 }, shop: { total: 0, offers: 0, purchases: 0, sales: 0 }, estimate: zero, order: zero, settlement: zero, payment: zero, connect: zero, learn: zero, items: [] };
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
  const { estimateCounts } = await import("@/lib/estimate-events");
  const ec = await estimateCounts(id, side === "buyer" ? "buyer" : "seller");
  const estimate = { total: ec.total };
  const add = (app: AppKey, n: number, what: string, href: string, action: string, due?: Date | null, jobIds?: (string | null | undefined)[]) => { if (n > 0) items.push({ id: `${app}:${what}`, title: what, n, what: n > 1 ? `${what} (${n})` : what, app, appLabel: app === "request" && side === "provider" ? "Jobs" : APP_LABEL[app], due: dueText(due), dueAt: due ? due.toISOString() : null, href, action, jobIds: [...new Set((jobIds ?? []).filter((x): x is string => !!x))] }); return n; };
  const lined = (app: AppKey, what: string, lines: AttentionLine[]) => { const i = items.find((x) => x.id === `${app}:${what}`); if (i) i.lines = lines; };
  const iso = (d: Date | null | undefined) => (d ? d.toISOString() : null);
  const money = (c: number | null | undefined) => (c == null ? null : `$${Math.round(c / 100).toLocaleString("en-US")}`);
  const startText = (d: Date | null | undefined) => (d ? `starts ${d.toLocaleDateString("en-US", { timeZone: "UTC", month: "short", day: "numeric" })}` : null);
  const jobTitles = async (ids: (string | null | undefined)[]) => { const u = [...new Set(ids.filter((x): x is string => !!x))]; return new Map(u.length ? (await prisma.job.findMany({ where: { id: { in: u } }, select: { id: true, title: true, job_number: true } })).map((j) => [j.id, j]) : []); };
  /** P-number until the Order is released (or the viewer may see the name). */
  const whoOf = async (personIds: string[]) => {
    const { providerNumbers, identityVisibleTo, providerLabel } = await import("@/lib/provider-number");
    const u = [...new Set(personIds)];
    if (!u.length) return (_: string) => "";
    const profiles = await prisma.providerProfile.findMany({ where: { person_id: { in: u } }, select: { id: true, person_id: true, person: { select: { first_name: true, last_name: true } } } });
    const nums = await providerNumbers(profiles.map((p) => p.id));
    const seen = await identityVisibleTo(viewer as Parameters<typeof identityVisibleTo>[0], u).catch(() => new Set<string>());
    return (pid: string) => { const p = profiles.find((x) => x.person_id === pid); return p ? (seen.has(pid) ? `${p.person.first_name} ${p.person.last_name}`.trim() : providerLabel(nums.get(p.id)).replace(/^Provider /, "")) : ""; };
  };
  const orderLines = async (os: { id: string; order_number: string; description: string | null; not_to_exceed_cents: number | null; period_start: Date | null; provider_person_id: string; buyer_person_id: string; created_at: Date }[], side2: "buyer" | "provider") => {
    const who = side2 === "buyer" ? await whoOf(os.map((o) => o.provider_person_id)) : null;
    return os.map((o) => ({ key: o.id, what: `${o.order_number} · ${o.description || "Order"}`, detail: [who ? who(o.provider_person_id) : null, money(o.not_to_exceed_cents), startText(o.period_start)].filter(Boolean).join(" · "), dueAt: null, href: `/orders/${o.id}`, action: "Review" }));
  };
  // HT-E006: Profile (seller) or Set-Up (buyer) and Connect — high before the first released Order, below Orders after.
  const stageGroups = async () => {
    const { dashView, profileChecklist, accountChecklist } = await import("@/lib/dashboard/views");
    const { firstOrder } = await dashView(id, side);
    const tierOf = firstOrder ? 3 : 1.5;
    const list = side === "buyer" ? await accountChecklist(id) : await profileChecklist(id);
    const missing = list.filter((i) => i.n === 0);
    const groupName = side === "buyer" ? "Set-Up" : "Profile";
    if (missing.length) items.push({ id: `setup:${groupName}`, title: groupName, n: missing.length, what: groupName, app: "connect", appLabel: groupName, due: null, dueAt: null, href: side === "buyer" ? "/company" : "/profile", action: "Open", tier: tierOf,
      lines: missing.map((i) => ({ key: i.label, what: i.action === "Ask" ? "Ask for a Recommendation" : i.action === "Connect" ? `Connect Your ${i.label.replace(" Connection", "")}` : `Add Your ${i.label}`, detail: i.why, dueAt: null, href: i.href, action: i.action })) });
    const lines = (await connectLines(viewer.userId, id)).map((x) => x.line);
    if (lines.length) items.push({ id: "connect:stage", title: "Connect", n: lines.length, what: "Connect", app: "connect", appLabel: "Connect", due: null, dueAt: null, href: "/connect/connections", action: "Open", tier: tierOf + 0.1, lines });
  };
  // WK-E007: a Completed Order (last 30 days) — the buyer recommends the seller; the seller asks the buyer for a recommendation.
  const afterCompleted = async () => {
    const since = new Date(now.getTime() - 30 * DAY_MS);
    const done = await prisma.workOrder.findMany({ where: { ...(side === "buyer" ? { buyer_person_id: id } : { provider_person_id: id }), status: { in: ["CLOSED", "FINALLY_CLOSED"] }, updated_at: { gte: since } }, orderBy: { updated_at: "desc" }, take: 10, select: { id: true, order_number: true, provider_person_id: true, buyer_person_id: true } });
    if (!done.length) return;
    const people = new Map((await prisma.person.findMany({ where: { id: { in: done.flatMap((o) => [o.provider_person_id, o.buyer_person_id]) } }, select: { id: true, first_name: true, last_name: true, company: { select: { name: true } }, user: { select: { email: true } }, providerProfile: { select: { id: true } } } })).map((p) => [p.id, p]));
    const me = people.get(id) ?? (await prisma.person.findUnique({ where: { id }, select: { id: true, first_name: true, last_name: true, company: { select: { name: true } }, user: { select: { email: true } }, providerProfile: { select: { id: true } } } }));
    const lines: AttentionLine[] = [];
    for (const o of done) {
      const other = people.get(side === "buyer" ? o.provider_person_id : o.buyer_person_id);
      if (!other) continue;
      const name = `${other.first_name} ${other.last_name}`.trim();
      // Skip when it already happened: the buyer gave one to this seller, or the seller already asked this buyer.
      const ppId = side === "buyer" ? other.providerProfile?.id : me?.providerProfile?.id;
      const email = side === "buyer" ? me?.user?.email : other.user?.email;
      if (ppId && email && (await prisma.recommendationRequest.count({ where: { provider_profile_id: ppId, contact_email: { equals: email, mode: "insensitive" }, status: side === "buyer" ? "SUBMITTED" : { in: ["SENT", "SUBMITTED"] } } }))) continue;
      lines.push(side === "buyer"
        ? { key: o.id, what: `Recommend ${name}`, detail: `${o.order_number} is complete`, dueAt: null, href: "/connect/recommendations", action: "Recommend" }
        : { key: o.id, what: `Ask ${other.company?.name ?? name} for a Recommendation`, detail: `${o.order_number} is complete`, dueAt: null, href: "/connect/recommendations", action: "Ask" });
    }
    if (lines.length) items.push({ id: "order:recommend", title: side === "buyer" ? "Recommend Your Provider" : "Ask for a Recommendation", n: lines.length, what: "Recommendations", app: "order", appLabel: "Orders", due: null, dueAt: null, href: "/connect/recommendations", action: "Open", tier: 3, lines });
  };
  const ORDER_SEL = { id: true, order_number: true, description: true, not_to_exceed_cents: true, period_start: true, provider_person_id: true, buyer_person_id: true, created_at: true } as const;
  // Name the job(s) each item is about — one query for all of them.
  const titled = async () => {
    const ids = [...new Set(items.flatMap((i) => i.jobIds ?? []))];
    if (!ids.length) return;
    const titles = new Map((await prisma.job.findMany({ where: { id: { in: ids } }, select: { id: true, title: true } })).map((j) => [j.id, j.title.trim()]));
    for (const i of items) { const t = (i.jobIds ?? []).map((x) => titles.get(x)).filter(Boolean) as string[]; if (t.length) i.sub = t.length > 1 ? `${t[0]} + ${t.length - 1} more` : t[0]; delete i.jobIds; }
  };

  if (side === "buyer") {
    const [toReview, closing, expired, confirm, todays, testsIn, approvals, woAccept, settle, pay] = await Promise.all([
      prisma.proposal.findMany({ where: { status: "SUBMITTED", job: { buyer_person_id: id }, proposalRequest: { sourcingEvent: { status: { in: ["OPEN", "CLOSED"] } } } }, orderBy: { submitted_at: "desc" }, select: { proposalRequest: { select: { sourcingEvent: { select: { id: true, job_id: true, deadline_at: true } } } } } }),
      prisma.sourcingEvent.findMany({ where: { created_by_person_id: id, status: "OPEN", deadline_at: { gt: now, lte: soon } }, select: { id: true, job_id: true, deadline_at: true } }),
      prisma.sourcingEvent.findMany({ where: { created_by_person_id: id, status: "OPEN", deadline_at: { lte: now } }, orderBy: { deadline_at: "asc" }, select: { id: true, job_id: true, deadline_at: true } }),
      prisma.interviewRequest.count({ where: { requested_by_person_id: id, status: "SLOTS_OFFERED" } }),
      prisma.interviewRequest.count({ where: { requested_by_person_id: id, status: "SCHEDULED", response: { lines: { some: { starts_at: today } } } } }),
      prisma.testRequest.count({ where: { requested_by_person_id: id, status: "COMPLETED", updated_at: { gte: new Date(now.getTime() - 7 * DAY_MS) } } }),
      prisma.workRequest.findMany({ where: { job: { buyer_person_id: id }, status: "PENDING_APPROVAL", NOT: { approval_channel: "ERP" } }, orderBy: { submitted_at: "asc" }, select: { id: true, wr_number: true, job_id: true, title: true, submitted_at: true } }),
      prisma.workOrder.findMany({ where: { buyer_person_id: id, status: "ISSUED", buyer_accepted_at: null }, orderBy: { created_at: "asc" }, select: ORDER_SEL }),
      prisma.workOrder.findMany({ where: { buyer_person_id: id }, select: { id: true } }).then((os) => prisma.paymentRequest.count({ where: { status: "SUBMITTED", work_order_id: { in: os.map((o) => o.id) } } })),
      prisma.workOrder.findMany({ where: { buyer_person_id: id }, select: { id: true } }).then((os) => prisma.paymentRequest.count({ where: { status: "APPROVED", work_order_id: { in: os.map((o) => o.id) } } })),
    ]);
    const ev = toReview[0]?.proposalRequest?.sourcingEvent;
    const jobs = add("request", toReview.length, "Responses to Review", ev ? `/work-requests/${ev.job_id}?tab=responses` : "/hire/overview?tab=jobs", "Review", ev?.deadline_at, toReview.map((x) => x.proposalRequest?.sourcingEvent?.job_id))
      + add("request", closing.length, "Answers Due in 24 h", closing[0] ? `/work-requests/${closing[0].job_id}?tab=responses` : "/hire/overview?tab=jobs", "Open", closing[0]?.deadline_at, closing.map((x) => x.job_id))
      + add("request", expired.length, "Deadline Passed — Pick or Extend", "/hire/overview?tab=jobs", "Decide");
    {
      const t = await jobTitles([...toReview.map((x) => x.proposalRequest?.sourcingEvent?.job_id), ...closing.map((x) => x.job_id), ...expired.map((x) => x.job_id), ...approvals.map((x) => x.job_id)]);
      const byJob = new Map<string, { n: number; due: Date | null }>();
      for (const x of toReview) { const e = x.proposalRequest?.sourcingEvent; if (!e) continue; const c = byJob.get(e.job_id) ?? { n: 0, due: e.deadline_at }; c.n++; byJob.set(e.job_id, c); }
      const jl = (jobId: string) => t.get(jobId)?.title || "Job";
      lined("request", "Responses to Review", [...byJob].map(([jobId, c]) => ({ key: jobId, what: jl(jobId), detail: `${c.n} said Available`, dueAt: iso(c.due), href: `/work-requests/${jobId}?tab=responses`, action: "Compare" })));
      lined("request", "Answers Due in 24 h", closing.map((e) => ({ key: e.id, what: jl(e.job_id), detail: t.get(e.job_id)?.job_number ?? "", dueAt: iso(e.deadline_at), href: `/work-requests/${e.job_id}?tab=responses`, action: "Open" })));
      lined("request", "Deadline Passed — Pick or Extend", expired.map((e) => ({ key: e.id, what: jl(e.job_id), detail: t.get(e.job_id)?.job_number ?? "", dueAt: iso(e.deadline_at), href: `/work-requests/${e.job_id}?tab=responses`, action: "Decide" })));
      lined("request", "Request Approvals", approvals.map((w) => ({ key: w.id, what: `${w.wr_number ?? "Request"} · ${w.job_id ? jl(w.job_id) : w.title || "Request"}`, detail: w.job_id ? `for ${t.get(w.job_id)?.job_number ?? "Job"}` : "", dueAt: null, href: w.job_id ? `/work-requests/${w.job_id}?tab=work-order` : "/orders", action: "Approve" })));
    }
    // HB-E006: each app lists only its own tasks — Work Orders (accept, release, changes) belong to Orders.
    const requests = add("request", approvals.length, "Request Approvals", "/hire/overview?tab=requests", "Approve");
    add("order", woAccept.length, "Orders to Accept", "/orders/overview", "Accept");
    lined("order", "Orders to Accept", await orderLines(woAccept, "buyer"));
    const interviews = add("request", confirm, "Interview Times to Confirm", "/hire/overview?tab=interviews", "Confirm") + add("request", todays, "Interviews Today", "/hire/overview?tab=interviews", "Join");
    const tests = add("request", testsIn, "Test Results In", "/hire/overview?tab=tests", "See Results");
    add("shop", sc.offers, "Counter-Offers Waiting on You", "/shop?tab=offers", "Answer");
    add("shop", sc.purchases, "Purchases Needing You", "/shop?tab=purchases", "Open");
    add("estimate", ec.toReview, "Estimates In to Review", "/estimate", "Review");
    add("settlement", settle, "Settlements to Approve", APP_HOME.buyer.settlement, "Approve");
    add("payment", pay, "Payments Due", APP_HOME.buyer.payment, "Pay");
    add("connect", connect, "Unread Messages", "/messages", "Read");
    await stageGroups();
  await afterCompleted();
  await titled();
    // PI-E007: punched in → the punch-in cart comes first.
    const p = await (await import("@/lib/erp/punchin-live")).currentPunchin().catch(() => null);
    if (p?.state === "live") items.unshift({ id: "punchin:cart", what: `Punch-in Cart · ${p.count} item${p.count === 1 ? "" : "s"}`, app: "shop", appLabel: APP_LABEL.shop, due: null, dueAt: null, href: "/shop?tab=cart", action: `Return to ${p.erpName}` });
    return { side, request: { total: jobs + requests + interviews + tests, jobs, requests, interviews, tests }, shop, estimate, order: { total: woAccept.length }, settlement: { total: settle }, payment: { total: pay }, connect: { total: connect }, learn: { total: learn }, items };
  }

  const [dueSoon, toOffer, todays, testsToTake, woAccept, drafts, paidIn] = await Promise.all([
    prisma.proposalRequest.findMany({ where: { provider_person_id: id, status: { in: ["ISSUED", "VIEWED"] }, OR: [{ responds_by: null }, { responds_by: { gt: now } }], bid: null }, orderBy: { responds_by: "asc" }, select: { id: true, job_id: true, responds_by: true } }),
    prisma.interviewRequest.findMany({ where: { provider_person_id: id, status: "REQUESTED" }, select: { id: true, job_id: true, slot_minutes: true } }),
    prisma.interviewRequest.count({ where: { provider_person_id: id, status: "SCHEDULED", response: { lines: { some: { starts_at: today } } } } }),
    prisma.testRequest.count({ where: { provider_person_id: id, status: { in: ["ISSUED", "IN_PROGRESS"] } } }),
    prisma.workOrder.findMany({ where: { provider_person_id: id, status: "ISSUED", provider_accepted_at: null, buyer_accepted_at: { not: null } }, orderBy: { created_at: "asc" }, select: ORDER_SEL }),
    prisma.paymentRequest.count({ where: { provider_person_id: id, status: { in: ["DRAFT", "REJECTED"] } } }),
    prisma.paymentRequest.count({ where: { provider_person_id: id, status: "APPROVED" } }),
  ]);
  const requests = add("request", dueSoon.length, "Someone Wants to Buy Your Services — Are You Available?", dueSoon[0] ? `/find-work/${dueSoon[0].job_id}` : "/find-work?tab=invitations", "Respond", dueSoon[0]?.responds_by, dueSoon.map((x) => x.job_id));
  const interviews = add("request", toOffer.length, toOffer.some((i) => i.slot_minutes) ? "A Buyer Wants to Interview You — Pick a Time" : "Interview Times to Offer", toOffer[0] ? `/find-work/${toOffer[0].job_id}#interview` : "/find-work?tab=interviews", toOffer.some((i) => i.slot_minutes) ? "Pick a Time" : "Offer Times", null, toOffer.map((x) => x.job_id)) + add("request", todays, "Interviews Today", "/find-work?tab=interviews", "Join");
  const tests = add("request", testsToTake, "Tests to Take", "/find-work?tab=tests", "Take");
  // Scott 10-23: written questions from a buyer wait on the provider too.
  const qs = await prisma.questionAnswer.findMany({ where: { provider_person_id: id, submitted_at: null }, orderBy: { created_at: "asc" }, select: { id: true, questionSet: { select: { job_id: true, due_at: true } } } });
  const questions = add("request", qs.length, "A Buyer Has Questions for You", qs[0] ? `/find-work/${qs[0].questionSet.job_id}#questions` : "/find-work", "Answer", qs[0]?.questionSet.due_at, qs.map((x) => x.questionSet.job_id));
  {
    const t = await jobTitles([...dueSoon.map((x) => x.job_id), ...toOffer.map((x) => x.job_id), ...qs.map((x) => x.questionSet.job_id)]);
    const jl = (jobId: string) => t.get(jobId)?.title || "Job";
    lined("request", "Someone Wants to Buy Your Services — Are You Available?", dueSoon.map((r) => ({ key: r.id, what: jl(r.job_id), detail: t.get(r.job_id)?.job_number ?? "", dueAt: iso(r.responds_by), href: `/find-work/${r.job_id}`, action: "Respond" })));
    const ivTitle = toOffer.some((i) => i.slot_minutes) ? "A Buyer Wants to Interview You — Pick a Time" : "Interview Times to Offer";
    lined("request", ivTitle, toOffer.map((i) => ({ key: i.id, what: jl(i.job_id), detail: i.slot_minutes ? `${i.slot_minutes} min` : "", dueAt: null, href: `/find-work/${i.job_id}#interview`, action: i.slot_minutes ? "Pick a Time" : "Offer Times" })));
    lined("request", "A Buyer Has Questions for You", qs.map((q) => ({ key: q.id, what: jl(q.questionSet.job_id), detail: t.get(q.questionSet.job_id)?.job_number ?? "", dueAt: iso(q.questionSet.due_at), href: `/find-work/${q.questionSet.job_id}#questions`, action: "Answer" })));
  }
  const myOrders = (await prisma.workOrder.findMany({ where: { provider_person_id: id }, select: { id: true } })).map((o) => o.id);
  const changes = myOrders.length ? await prisma.workOrderRevision.count({ where: { status: "PENDING", work_order_id: { in: myOrders } } }) : 0;
  const order = add("order", woAccept.length, "Orders to Accept", "/orders/overview", "Accept") + add("order", changes, "Change Orders to Answer", "/orders/overview", "Answer");
  lined("order", "Orders to Accept", await orderLines(woAccept, "provider"));
  add("shop", sc.offers, "Offers to Answer", "/shop?tab=offers", "Answer");
  add("shop", sc.sales, "Product Sales Needing You", "/shop?tab=sales", "Open");
  add("estimate", ec.toPrice, "Estimates to Price", "/estimate", "Price");
  add("settlement", drafts, "Payment Requests to Submit", APP_HOME.provider.settlement, "Submit");
  add("payment", paidIn, "Payments on the Way", APP_HOME.provider.payment, "See");
  add("connect", connect, "Unread Messages", "/messages", "Read");
  await stageGroups();
  await afterCompleted();
  await titled();
  return { side, request: { total: requests + interviews + tests + questions, jobs: 0, requests, interviews: interviews + questions, tests }, shop, estimate, order: { total: order }, settlement: { total: drafts }, payment: { total: paidIn }, connect: { total: connect }, learn: { total: learn }, items };
}

/** HT-E006/E007: everything in Connect that waits on this person — one line each, with its group. */
export async function connectLines(userId: string, personId: string): Promise<{ group: "Requests to Connect" | "Recommendations" | "Mentors & Groups"; line: AttentionLine }[]> {
  const now = new Date();
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
  const [conns, mentors, recs, groups] = await Promise.all([
    prisma.connection.findMany({ where: { to_user_id: userId, status: "PENDING", kind: "COLLEAGUE" }, orderBy: { created_at: "desc" }, take: 20, select: { id: true, from_user_id: true, created_at: true } }),
    prisma.connection.findMany({ where: { to_user_id: userId, status: "PENDING", kind: "MENTOR" }, orderBy: { created_at: "desc" }, take: 20, select: { id: true, from_user_id: true, created_at: true } }),
    u?.email ? prisma.recommendationRequest.findMany({ where: { contact_email: { equals: u.email, mode: "insensitive" }, status: "SENT", expires_at: { gt: now } }, take: 20, select: { id: true, sent_at: true, providerProfile: { select: { person: { select: { first_name: true, last_name: true } } } } } }) : [],
    prisma.groupMembership.findMany({ where: { person_id: personId, route: "INVITED", state: "PENDING" }, take: 20, select: { id: true, board: { select: { title: true } } } }),
  ]);
  const people = new Map((await prisma.person.findMany({ where: { user_id: { in: [...conns, ...mentors].map((c) => c.from_user_id) } }, select: { user_id: true, first_name: true, last_name: true, title: true, company: { select: { name: true } } } })).map((p) => [p.user_id, p]));
  const nameOf = (uid: string) => { const p = people.get(uid); return p ? `${p.first_name} ${p.last_name}`.trim() : "Someone"; };
  const ago = (d: Date) => { const n = Math.floor((now.getTime() - d.getTime()) / DAY_MS); return n <= 0 ? "Today" : `${n} day${n === 1 ? "" : "s"} ago`; };
  return [
    ...conns.map((c) => { const p = people.get(c.from_user_id); return { group: "Requests to Connect" as const, line: { key: c.id, what: `${nameOf(c.from_user_id)} Wants to Connect`, detail: [p?.title, p?.company?.name].filter(Boolean).join(" · "), dueAt: null, href: "/connect/connections", action: "Accept" } }; }),
    ...recs.map((r) => ({ group: "Recommendations" as const, line: { key: r.id, what: `Recommend ${`${r.providerProfile.person.first_name} ${r.providerProfile.person.last_name}`.trim()}`, detail: `Asked ${ago(r.sent_at)}`, dueAt: null, href: "/connect/recommendations", action: "Write" } })),
    ...mentors.map((c) => ({ group: "Mentors & Groups" as const, line: { key: c.id, what: `${nameOf(c.from_user_id)} Asked You to Mentor Them`, detail: `Asked ${ago(c.created_at)}`, dueAt: null, href: "/connect/mentors", action: "Reply" } })),
    ...groups.map((g) => ({ group: "Mentors & Groups" as const, line: { key: g.id, what: `Join ${g.board.title}`, detail: "Group invitation", dueAt: null, href: "/connect/groups", action: "Join" } })),
  ];
}
