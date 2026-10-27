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
export type AppKey = "request" | "shop" | "estimate" | "order" | "settlement" | "payment" | "connect" | "learn" | "profile";
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
  buyer: { request: "/hire/overview", shop: "/shop", estimate: "/estimate", order: "/orders/overview", settlement: "/payments/payment-requests", payment: "/pay", connect: "/connect", learn: "/learn?tab=mine", profile: "/company" },
  provider: { request: "/work/home", shop: "/shop", estimate: "/work/estimates", order: "/orders/overview", settlement: "/payments/payment-requests", payment: "/payments", connect: "/connect", learn: "/learn?tab=mine", profile: "/profile" },
};
const APP_LABEL: Record<AppKey, string> = { request: "Hire", shop: "Shop", estimate: "Estimate", order: "Orders", settlement: "Settlements", payment: "Payments", connect: "Connect", learn: "Learn", profile: "Profile" };
const DAY_MS = 86_400_000;
const dueText = (d: Date | null | undefined) => (d ? d.toLocaleString("en-US", { timeZone: "America/New_York", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : null);

// Speed (10-27): working out every line costs ~2–3 s, so it runs at most once per person per side every 5 minutes
// (that's also when the Worklist sync runs); the Worklist itself is re-read on every call, so done items clear at once.
const DERIVE_TTL_MS = 5 * 60_000;
const derived = new Map<string, { at: number; c: AppCounts }>();
export async function appCounts(viewer: { userId: string }, side: "buyer" | "provider"): Promise<AppCounts> {
  const key = `${viewer.userId}:${side}`;
  const hit = derived.get(key);
  if (hit && hit.at > Date.now() - DERIVE_TTL_MS) {
    const me = await prisma.person.findUnique({ where: { user_id: viewer.userId }, select: { id: true } });
    if (!me) return hit.c;
    const items = await (await import("@/lib/todo")).todoGroups(me.id, side);
    const p = side === "buyer" ? hit.c.items.find((i) => i.id === "punchin:cart") : null;
    return { ...hit.c, items: p ? [p, ...items] : items };
  }
  const c = await deriveAppCounts(viewer, side);
  derived.set(key, { at: Date.now(), c });
  return c;
}

async function deriveAppCounts(viewer: { userId: string }, side: "buyer" | "provider"): Promise<AppCounts> {
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
    // NC-E002: "Accept Order from Lopez Holdings · $92,880" — P-number until released, never the order's system number.
    const who = side2 === "buyer" ? await whoOf(os.map((o) => o.provider_person_id)) : null;
    const buyers = side2 === "provider" ? new Map((await prisma.person.findMany({ where: { id: { in: os.map((o) => o.buyer_person_id) } }, select: { id: true, first_name: true, last_name: true, company: { select: { name: true } } } })).map((p) => [p.id, p.company?.name ?? `${p.first_name} ${p.last_name}`.trim()])) : null;
    return os.map((o) => ({ key: o.id, what: [`Accept Order from ${who ? who(o.provider_person_id) || "the Provider" : buyers?.get(o.buyer_person_id) ?? "the Buyer"}`, money(o.not_to_exceed_cents)].filter(Boolean).join(" · "), detail: [o.description, startText(o.period_start)].filter(Boolean).join(" · "), dueAt: null, href: `/orders/${o.id}`, action: "Review" }));
  };
  // HT-E006: Profile (seller) or Set-Up (buyer) and Connect — high before the first released Order, below Orders after.
  const stageGroups = async () => {
    const { dashView, profileChecklist, accountChecklist } = await import("@/lib/dashboard/views");
    const { firstOrder } = await dashView(id, side);
    const tierOf = firstOrder ? 3 : 1.5;
    const list = side === "buyer" ? await accountChecklist(id) : await profileChecklist(id);
    const missing = list.filter((i) => i.n === 0);
    const groupName = side === "buyer" ? "Set-Up" : "Profile";
    if (missing.length) items.push({ id: `setup:${groupName}`, title: groupName, n: missing.length, what: groupName, app: "profile", appLabel: groupName, due: null, dueAt: null, href: side === "buyer" ? "/company" : "/profile", action: "Open", tier: tierOf,
      lines: missing.map((i) => ({ key: i.label, what: i.action === "Ask" ? "Ask for a Recommendation" : i.action === "Connect" ? `Connect Your ${i.label.replace(" Connection", "")}` : `Add Your ${i.label}`, detail: i.why, dueAt: null, href: i.href, action: i.action })) });
    const cl = await connectLines(viewer.userId, id);
    // NC-E001: accept a connection, write a requested recommendation, answer a mentor request (group invites are news).
    for (const g of ["Requests to Connect", "Recommendations", "Mentors & Groups"] as const) {
      const ls = cl.filter((x) => x.group === g && x.line.action !== "Join").map((x) => x.line);
      if (ls.length) items.push({ id: `connect:${g}`, title: g, n: ls.length, what: g, app: "connect", appLabel: "Connect", due: null, dueAt: null, href: ls[0].href, action: "Open", tier: tierOf + 0.1, lines: ls });
    }
  };
  // Scott 10-27: a Completed Order puts "Recommend {seller}" on the buyer's Worklist and "Ask {buyer} for a Recommendation"
  // on the seller's; each clears when done (the buyer's recommendation is submitted / the seller's request is sent).
  const afterCompleted = async () => {
    const done = await prisma.workOrder.findMany({ where: { ...(side === "buyer" ? { buyer_person_id: id } : { provider_person_id: id }), status: { in: ["CLOSED", "FINALLY_CLOSED"] } }, orderBy: { updated_at: "desc" }, take: 20, select: { id: true, provider_person_id: true, buyer_person_id: true } });
    if (!done.length) return;
    const sel = { id: true, first_name: true, last_name: true, company: { select: { name: true } }, user: { select: { email: true } }, providerProfile: { select: { id: true } } } as const;
    const people = new Map((await prisma.person.findMany({ where: { id: { in: [id, ...done.flatMap((o) => [o.provider_person_id, o.buyer_person_id])] } }, select: sel })).map((p) => [p.id, p]));
    const me = people.get(id);
    const seen = new Set<string>();
    const lines: AttentionLine[] = [];
    for (const o of done) {
      const otherId = side === "buyer" ? o.provider_person_id : o.buyer_person_id;
      const other = people.get(otherId);
      if (!other || seen.has(otherId)) continue;
      seen.add(otherId);
      const ppId = side === "buyer" ? other.providerProfile?.id : me?.providerProfile?.id;
      const email = side === "buyer" ? me?.user?.email : other.user?.email;
      if (!ppId || !email) continue;
      const already = await prisma.recommendationRequest.count({ where: { provider_profile_id: ppId, contact_email: { equals: email, mode: "insensitive" }, status: side === "buyer" ? "SUBMITTED" : { in: ["SENT", "SUBMITTED"] } } });
      if (already) continue;
      const name = `${other.first_name} ${other.last_name}`.trim();
      lines.push(side === "buyer"
        ? { key: o.id, what: `Recommend ${name}`, detail: "", dueAt: null, href: `/recommend-order/${o.id}`, action: "Recommend" }
        : { key: o.id, what: `Ask ${other.company?.name ?? name} for a Recommendation`, detail: "", dueAt: null, href: "/connect/recommendations", action: "Ask" });
    }
    const title = side === "buyer" ? "Recommend Your Provider" : "Ask for a Recommendation";
    if (lines.length) items.push({ id: `order:${title}`, title, n: lines.length, what: title, app: "order", appLabel: "Orders", due: null, dueAt: null, href: "/connect/recommendations", action: "Open", tier: 3, lines });
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
      prisma.interviewRequest.findMany({ where: { requested_by_person_id: id, status: "SLOTS_OFFERED" }, select: { id: true, job_id: true } }),
      prisma.interviewRequest.count({ where: { requested_by_person_id: id, status: "SCHEDULED", response: { lines: { some: { starts_at: today } } } } }),
      prisma.testRequest.count({ where: { requested_by_person_id: id, status: "COMPLETED", updated_at: { gte: new Date(now.getTime() - 7 * DAY_MS) } } }),
      prisma.workRequest.findMany({ where: { job: { buyer_person_id: id }, status: "PENDING_APPROVAL", NOT: { approval_channel: "ERP" } }, orderBy: { submitted_at: "asc" }, select: { id: true, wr_number: true, job_id: true, title: true, submitted_at: true } }),
      prisma.workOrder.findMany({ where: { buyer_person_id: id, status: "ISSUED", buyer_accepted_at: null }, orderBy: { created_at: "asc" }, select: ORDER_SEL }),
      prisma.workOrder.findMany({ where: { buyer_person_id: id }, select: { id: true } }).then((os) => prisma.paymentRequest.count({ where: { status: "SUBMITTED", work_order_id: { in: os.map((o) => o.id) } } })),
      prisma.workOrder.findMany({ where: { buyer_person_id: id }, select: { id: true } }).then((os) => prisma.paymentRequest.count({ where: { status: "APPROVED", work_order_id: { in: os.map((o) => o.id) } } })),
    ]);
    // NC-E001/E002: only actions, one line each — Compare once all answers are in; Answer Date Passed → Extend · Close.
    const askedBy = new Map((await prisma.proposalRequest.groupBy({ by: ["sourcing_event_id"], where: { sourcing_event_id: { in: [...new Set([...toReview.map((x) => x.proposalRequest?.sourcingEvent?.id), ...expired.map((e) => e.id)].filter((x): x is string => !!x))] }, status: { not: "DRAFT" } }, _count: { _all: true } })).map((g) => [g.sourcing_event_id, g._count._all]));
    const inBy = new Map((await prisma.proposal.groupBy({ by: ["job_id"], where: { job_id: { in: expired.map((e) => e.job_id) }, status: { notIn: ["DRAFT", "WITHDRAWN"] } }, _count: { _all: true } })).map((g) => [g.job_id, g._count._all]));
    const jobs = toReview.length + closing.length + expired.length;
    add("request", 1, "Compare Answers", "/hire/overview?tab=jobs&slice=comparing", "Compare");
    add("request", expired.length, "Answer Date Passed", "/hire/overview?tab=jobs", "Extend|Close");
    {
      const t = await jobTitles([...toReview.map((x) => x.proposalRequest?.sourcingEvent?.job_id), ...expired.map((x) => x.job_id), ...approvals.map((x) => x.job_id), ...confirm.map((x) => x.job_id)]);
      lined("request", "Interview Times to Confirm", confirm.map((i) => ({ key: i.id, what: `Pick an Interview Time · ${t.get(i.job_id)?.title || "Job"}`, detail: "", dueAt: null, href: `/work-requests/${i.job_id}?tab=interviews`, action: "Pick" })));
      const byEv = new Map<string, { job: string; n: number; due: Date | null }>();
      for (const x of toReview) { const e = x.proposalRequest?.sourcingEvent; if (!e) continue; const c = byEv.get(e.id) ?? { job: e.job_id, n: 0, due: e.deadline_at }; c.n++; byEv.set(e.id, c); }
      const jl = (jobId: string) => t.get(jobId)?.title || "Job";
      const all = [...byEv].filter(([ev, c]) => c.n >= (askedBy.get(ev) ?? Infinity));
      lined("request", "Compare Answers", all.map(([ev, c]) => ({ key: ev, what: `Compare Answers · ${jl(c.job)} · All ${c.n} In`, detail: "", dueAt: iso(c.due), href: `/work-requests/${c.job}?tab=responses`, action: "Compare" })));
      const cmp = items.find((i) => i.id === "request:Compare Answers");
      if (cmp && !all.length) items.splice(items.indexOf(cmp), 1); else if (cmp) { cmp.n = all.length; cmp.what = "Compare Answers"; }
      lined("request", "Answer Date Passed", expired.map((e) => ({ key: e.id, what: `Answer Date Passed · ${jl(e.job_id)} · ${inBy.get(e.job_id) ?? 0} of ${askedBy.get(e.id) ?? 0} Answered`, detail: "", dueAt: iso(e.deadline_at), href: `/work-requests/${e.job_id}`, action: "Extend|Close" })));
      lined("request", "Request Approvals", approvals.map((w) => ({ key: w.id, what: `Approve Request · ${w.job_id ? jl(w.job_id) : w.title || "Request"}`, detail: "", dueAt: null, href: w.job_id ? `/work-requests/${w.job_id}?tab=work-order` : "/orders", action: "Approve" })));
    }
    // HB-E006: each app lists only its own tasks — Work Orders (accept, release, changes) belong to Orders.
    const requests = add("request", approvals.length, "Request Approvals", "/hire/overview?tab=requests", "Approve");
    add("order", woAccept.length, "Orders to Accept", "/orders/overview", "Accept");
    lined("order", "Orders to Accept", await orderLines(woAccept, "buyer"));
    const interviews = add("request", confirm.length, "Interview Times to Confirm", "/hire/overview?tab=interviews", "Pick") + todays;
    const tests = testsIn;
    add("shop", sc.offers, "Answer Counter-Offers", "/shop?tab=offers", "Answer");
    add("estimate", ec.toReview, "Compare Estimates", "/estimate", "Compare");
    add("settlement", settle, "Approve Invoices", APP_HOME.buyer.settlement, "Approve");
    // Purchases, payments due, messages, learning and "Recommend" after an Order are news or live elsewhere (NC-E001).
    void pay;
    await stageGroups();
    await afterCompleted();
    await titled();
    // WK-E008: the Worklist is the one source — write these lines into it, then read the panel back from it.
    const { syncTodo, todoGroups } = await import("@/lib/todo");
    await syncTodo(id, "buyer", items);
    const wl = await todoGroups(id, "buyer");
    items.length = 0;
    items.push(...wl);
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
  const requests = add("request", dueSoon.length, "Availability Requests", "/work/jobs?stage=They%20Requested", "Respond", dueSoon[0]?.responds_by, dueSoon.map((x) => x.job_id));
  const interviews = add("request", toOffer.length, "Interview Times to Pick", "/work/jobs?stage=You%20Interviewed", "Pick", null, toOffer.map((x) => x.job_id)) + todays;
  const tests = testsToTake;
  // Scott 10-23: written questions from a buyer wait on the provider too.
  const qs = await prisma.questionAnswer.findMany({ where: { provider_person_id: id, submitted_at: null }, orderBy: { created_at: "asc" }, select: { id: true, questionSet: { select: { job_id: true, due_at: true } } } });
  const questions = add("request", qs.length, "Questions to Answer", qs[0] ? `/find-work/${qs[0].questionSet.job_id}#questions` : "/find-work", "Answer", qs[0]?.questionSet.due_at, qs.map((x) => x.questionSet.job_id));
  {
    const t = await jobTitles([...dueSoon.map((x) => x.job_id), ...toOffer.map((x) => x.job_id), ...qs.map((x) => x.questionSet.job_id)]);
    const jl = (jobId: string) => t.get(jobId)?.title || "Job";
    const buyerOf = new Map((await prisma.job.findMany({ where: { id: { in: dueSoon.map((r) => r.job_id) } }, select: { id: true, buyer: { select: { company: { select: { name: true } } } } } })).map((j) => [j.id, j.buyer?.company?.name ?? null]));
    lined("request", "Availability Requests", dueSoon.map((r) => ({ key: r.id, what: ["Answer Availability Request", jl(r.job_id), buyerOf.get(r.job_id)].filter(Boolean).join(" · "), detail: "", dueAt: iso(r.responds_by), href: `/find-work/${r.job_id}`, action: "Respond" })));
    lined("request", "Interview Times to Pick", toOffer.map((i) => ({ key: i.id, what: `Pick an Interview Time · ${jl(i.job_id)}`, detail: "", dueAt: null, href: `/find-work/${i.job_id}#interview`, action: "Pick" })));
    lined("request", "Questions to Answer", qs.map((q) => ({ key: q.id, what: `Answer the Buyer's Questions · ${jl(q.questionSet.job_id)}`, detail: "", dueAt: iso(q.questionSet.due_at), href: `/find-work/${q.questionSet.job_id}#questions`, action: "Answer" })));
  }
  const myOrders = (await prisma.workOrder.findMany({ where: { provider_person_id: id }, select: { id: true } })).map((o) => o.id);
  const changes = myOrders.length ? await prisma.workOrderRevision.count({ where: { status: "PENDING", work_order_id: { in: myOrders } } }) : 0;
  const order = add("order", woAccept.length, "Orders to Accept", "/orders/overview", "Review") + add("order", changes, "Review Change Orders", "/orders/overview", "Review");
  lined("order", "Orders to Accept", await orderLines(woAccept, "provider"));
  add("shop", sc.offers, "Respond to Offers", "/shop?tab=offers", "Respond");
  add("shop", sc.sales, "Accept Product Orders", "/shop?tab=sales", "Review");
  // Estimates and tests are one line each in workLines; drafts to submit, payouts and messages aren't on the action list (NC-E001).
  void ec; void paidIn;
  await stageGroups();
  await afterCompleted();
  const pp = await prisma.providerProfile.findUnique({ where: { person_id: id }, select: { id: true } });
  items.push(...(await (await import("@/lib/work-app")).workLines(id, pp?.id ?? null).catch(() => [])));
  await titled();
  // WK-E008: the Worklist is the one source — write these lines into it, then read the panel back from it.
  const { syncTodo, todoGroups } = await import("@/lib/todo");
  await syncTodo(id, "provider", items);
  const wl = await todoGroups(id, "provider");
  items.length = 0;
  items.push(...wl);
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
