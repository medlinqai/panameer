import type { Figure } from "@/lib/figure";
import { PROVIDER_NAV } from "@/lib/nav";
import { profileTabLabel } from "@/lib/profile-tabs";

export const USAGE_GOALS = {
  profile: 50,
  learn: 20,
  connect: 25,
  work: 10,
  shop: 10,
  orders: 10,
  earnings: 10_000,
  pay: 10_000,
} as const;

export type UsageLevel = "none" | "low" | "medium" | "strong";

export const USAGE_LEVEL_LABEL: Record<UsageLevel, string> = {
  none: "None",
  low: "Low",
  medium: "Medium",
  strong: "Strong",
};

export const USAGE_LEVELS: UsageLevel[] = ["none", "low", "medium", "strong"];

export function levelFor(figure: Figure, goal: number | null): UsageLevel | null {
  if (!isNum(figure)) return null;
  if (goal == null || goal <= 0) return null;
  if (figure <= 0) return "none";
  const share = figure / goal;
  if (share >= 2 / 3) return "strong";
  if (share >= 1 / 3) return "medium";
  return "low";
}

export type UsageSub = { label: string; figure: Figure };

export type UsageArea = {
  key: string;
  eyebrow: string;
  label: string;
  figure: Figure;
  goal: number | null;
  money?: boolean;
  subs: [UsageSub, UsageSub];
  href: string;
  go: string;
  tip: string;
  counts: string;
};

function navLabel(href: string): string {
  return PROVIDER_NAV.find((n) => n.href === href)?.label ?? href;
}

const isNum = (f: Figure): f is number => typeof f === "number";

function plural(n: number, one: string, many: string): string {
  return `${n.toLocaleString("en-US")} ${n === 1 ? one : many}`;
}

/** THE HOVER LINE, DERIVED FROM THE FIGURE IT DESCRIBES. */
function tipFor(f: Figure, one: string, many: string): string {
  return isNum(f) ? plural(f, one, many) : `Not counted — ${f.uncounted}`;
}

export type UsageInput = {
  /** Profile views, the Profile gauge's needle (Scott's answer 5). */
  views: Figure;
  /** The Search Score, a SUPPORTING figure here — not the needle (Scott's answer 5). */
  searchScore: Figure;
  shownInSearch: Figure;
  lessonsDone: Figure;
  coursesCompleted: Figure;
  learnersInPaths: Figure;
  colleagues: Figure;
  invitesSent: Figure;
  joinedFromInvites: Figure;
  workRequests: Figure;
  proposalsSent: Figure;
  interviews: Figure;
  serviceProducts: Figure;
  offersReceived: Figure;
  drafts: Figure;
  activeOrders: Figure;
  ordersCompleted: Figure;
  awaitingApproval: Figure;
  earnings: Figure;
  payoutsPending: Figure;
  invoicesOpen: Figure;
  checksPassing: Figure;
  checksFailing: Figure;
  /** Usage v4: settled earnings in dollars (sum of the member's payouts). */
  payEarnings: Figure;
  paidOut: Figure;
};

/** THE EIGHT GAUGES */
export function usageAreas(u: UsageInput): UsageArea[] {
  const healthTotal =
    isNum(u.checksPassing) && isNum(u.checksFailing)
      ? u.checksPassing + u.checksFailing
      : null;

  return [
    {
      key: "profile",
      // From the TAB row, not the band — Profile is an Account-menu destination and
      eyebrow: profileTabLabel("/profile"),
      label: "Profile Views",
      figure: u.views,
      goal: USAGE_GOALS.profile,
      // THE SCORE IS A SUPPORTING FIGURE, NOT THE NEEDLE (Scott, 2026-09-30, answer 5).
      subs: [
        { label: "Search Score", figure: u.searchScore },
        { label: "Shown in Search", figure: u.shownInSearch },
      ],
      href: "/profile",
      go: profileTabLabel("/profile"),
      tip: tipFor(u.views, "profile view", "profile views"),
      counts: "profile views",
    },
    {
      key: "learn",
      eyebrow: navLabel("/learn"),
      label: "Lessons Done",
      figure: u.lessonsDone,
      goal: USAGE_GOALS.learn,
      subs: [
        { label: "Courses Done", figure: u.coursesCompleted },
        { label: "Learners in Your Paths", figure: u.learnersInPaths },
      ],
      href: "/learn",
      go: navLabel("/learn"),
      tip: tipFor(u.lessonsDone, "lesson completed", "lessons completed"),
      counts: "lessons completed",
    },
    {
      key: "connect",
      eyebrow: navLabel("/connect"),
      label: "Colleagues",
      figure: u.colleagues,
      goal: USAGE_GOALS.connect,
      subs: [
        { label: "Invites Sent", figure: u.invitesSent },
        { label: "Joined From Invites", figure: u.joinedFromInvites },
      ],
      // gauge at it would cost every click a round trip to reach the same page. The
      href: "/connect/community",
      go: navLabel("/connect"),
      tip: tipFor(u.colleagues, "colleague", "colleagues"),
      counts: "colleagues",
    },
    {
      key: "work",
      // SCOTT'S *"HIRE"* IS THIS ITEM. `Hire` is the buyer's label for the same
      eyebrow: navLabel("/find-work"),
      label: "Work Requests",
      figure: u.workRequests,
      goal: USAGE_GOALS.work,
      subs: [
        { label: "Proposals Sent", figure: u.proposalsSent },
        { label: "Interviews", figure: u.interviews },
      ],
      href: "/find-work",
      go: navLabel("/find-work"),
      tip: tipFor(u.workRequests, "work request received", "work requests received"),
      counts: "work requests",
    },
    {
      key: "shop",
      eyebrow: navLabel("/shop"),
      label: "Service Products",
      figure: u.serviceProducts,
      goal: USAGE_GOALS.shop,
      subs: [
        { label: "Offers Received", figure: u.offersReceived },
        { label: "Drafts", figure: u.drafts },
      ],
      href: "/shop",
      go: navLabel("/shop"),
      tip: tipFor(u.serviceProducts, "published service product", "published service products"),
      counts: "service products",
    },
    {
      key: "orders",
      eyebrow: navLabel("/orders"),
      label: "Active Orders",
      figure: u.activeOrders,
      goal: USAGE_GOALS.orders,
      subs: [
        { label: "Completed", figure: u.ordersCompleted },
        { label: "Awaiting Approval", figure: u.awaitingApproval },
      ],
      href: "/orders",
      go: navLabel("/orders"),
      tip: tipFor(u.activeOrders, "work order", "work orders"),
      counts: "work orders",
    },
    {
      key: "earnings",
      // THERE IS NO `Get Paid` MENU ITEM TO READ — removed it, so this eyebrow
      eyebrow: "Earnings",
      label: "Earnings",
      figure: u.earnings,
      // NO SCALE, BECAUSE THERE IS NOTHING TO SCALE (Scott, 2026-09-30, answer 4
      goal: null,
      money: true,
      subs: [
        { label: "Payouts", figure: u.payoutsPending },
        { label: "Invoices Open", figure: u.invoicesOpen },
      ],
      href: "/orders",
      go: navLabel("/orders"),
      tip: tipFor(u.earnings, "dollar settled", "dollars settled"),
      counts: "dollars settled",
    },
    {
      key: "pay",
      eyebrow: "Pay",
      label: "Earnings",
      figure: u.payEarnings,
      goal: USAGE_GOALS.pay,
      money: true,
      subs: [
        { label: "Paid Out", figure: u.paidOut },
        { label: "Awaiting Approval", figure: u.awaitingApproval },
      ],
      href: "/payments",
      go: "Payments",
      tip: tipFor(u.payEarnings, "dollar settled", "dollars settled"),
      counts: "dollars settled",
    },
    {
      key: "health",
      eyebrow: profileTabLabel("/account-health"),
      label: "Checks Passing",
      figure: u.checksPassing,
      // A REAL TOTAL, NOT AN ASPIRATION — every check that exists. `null` when either
      goal: healthTotal,
      subs: [
        { label: "Checks Passing", figure: u.checksPassing },
        { label: "Checks Failing", figure: u.checksFailing },
      ],
      href: "/account-health",
      go: profileTabLabel("/account-health"),
      tip:
        healthTotal != null && isNum(u.checksPassing)
          ? `${u.checksPassing} of ${healthTotal} checks passing`
          : tipFor(u.checksPassing, "check passing", "checks passing"),
      counts: "checks passing",
    },
  ];
}

/** THE FLOWER — SEVEN CELLS, 2-3-2, PROFILE IN THE CENTRE */
export function usageHoneyCells(areas: UsageArea[]) {
  const by = (k: string) => areas.find((a) => a.key === k)!;
  const cell = (a: UsageArea) => ({
    key: a.key,
    label: a.eyebrow,
    figure: a.figure,
    counts: a.counts,
    href: a.href,
    level: levelFor(a.figure, a.goal),
  });

  // ROW 1 (2) · ROW 2 (3, PROFILE IN THE MIDDLE) · ROW 3 (2) — the mockup's own shape.
  return [
    cell(by("learn")),
    cell(by("connect")),

    cell(by("earnings")),
    cell(by("profile")),
    cell(by("work")),

    cell(by("orders")),
    cell(by("shop")),
  ];
}

/** THE HEADER'S SUMMARY SENTENCE, DERIVED WS-B) */
/** Usage v4: the six hex cells, in the mockup's order. */
export const HIVE_KEYS = ["profile", "connect", "learn", "work", "shop", "pay"] as const;
// The honeycomb shows every area, 3 + 3 + 3 (P2-E008); the summary still reads HIVE_KEYS.
export const HIVE_CELL_KEYS = ["profile", "connect", "learn", "work", "shop", "orders", "earnings", "pay", "health"] as const;
export function usageHiveCells(areas: UsageArea[]) {
  return HIVE_CELL_KEYS.filter((k) => areas.some((x) => x.key === k)).map((k) => {
    const a = areas.find((x) => x.key === k)!;
    return { key: a.key, label: a.eyebrow, figure: a.figure, href: a.href, level: levelFor(a.figure, a.goal), money: a.money };
  });
}

export function usageSummary(areas: UsageArea[]): string {
  const activity = areas.filter((a) => (HIVE_KEYS as readonly string[]).includes(a.key));
  const counted = activity.filter(
    (a): a is UsageArea & { figure: number } => isNum(a.figure)
  );

  if (counted.length === 0) {
    return "No area on this page can be counted yet, so there is nothing to compare.";
  }

  const sorted = [...counted].sort((a, b) => b.figure - a.figure);
  const top = sorted[0];
  /* EVERY measured zero, not just the lowest one — the mockup names three. */
  const quiet = counted.filter((a) => a.figure === 0);

  // THE ONE PLAIN NEXT STEP
  const STEP: Record<string, string> = {
    work: "A complete profile and a colleague who can vouch for you are what buyers look at first.",
    connect: "Inviting a colleague is the quickest way to start a network here.",
    learn: "A lesson or two is the fastest way to show what you know.",
    shop: "Listing one service product gives buyers something to buy.",
    orders: "Orders follow work requests, so that is the thread to pull first.",
    profile: "Profile views come from being findable — the Score tab says what is missing.",
    pay: "Earnings follow work orders, so work is the thread to pull first.",
  };

  const names = (xs: UsageArea[]) =>
    xs.length === 1
      ? xs[0].eyebrow
      : `${xs.slice(0, -1).map((a) => a.eyebrow).join(", ")} and ${xs[xs.length - 1].eyebrow}`;

  // EVERY COUNTED AREA AT ZERO — no busiest to name, so it says so and goes straight to
  if (top.figure === 0) {
    const step = STEP[quiet[0]?.key ?? ""] ?? "";
    return `Nothing has been counted in any area yet.${step ? ` ${step}` : ""}`;
  }

  const quietPart = quiet.length
    ? ` The quiet ${quiet.length === 1 ? "one is" : "ones are"} ${names(quiet)}.`
    : "";
  // The step speaks to the FIRST quiet area, in the page's own order, so it is stable
  const step = quiet.length ? STEP[quiet[0].key] ?? "" : "";

  return (
    `Your busiest area is ${top.eyebrow}, with ` +
    `${plural(top.figure, top.counts.replace(/s$/, ""), top.counts)}.` +
    quietPart +
    (step ? ` ${step}` : "")
  );
}
