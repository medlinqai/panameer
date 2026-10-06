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

/**
 * ⚠⚠ THE HOVER LINE, DERIVED FROM THE FIGURE IT DESCRIBES.
 *
 * ⚠⚠⚠ **AN UNCOUNTED FIGURE GETS ITS REASON, NOT A ZERO SENTENCE.** *"$0 settled this
 * month"* over a figure nobody writes is the fabricated-figure defect in prose, and prose
 * is where it is hardest to spot.
 */
function tipFor(f: Figure, one: string, many: string): string {
  return isNum(f) ? plural(f, one, many) : `Not counted — ${f.uncounted}`;
}

export type UsageInput = {
  /** ⚠ Profile views, the Profile gauge's needle (Scott's answer 5). */
  views: Figure;
  /** ⚠⚠ The Search Score, a SUPPORTING figure here — not the needle (Scott's answer 5). */
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

/**
 * ── ⚠⚠⚠ THE EIGHT GAUGES ────────────────────────────────────────────────────────────────
 *
 * ⚠ **SEVEN AREAS PLUS ACCOUNT HEALTH, so the grid is 4 + 4 with no empty slot** (Scott's
 * decision 2). ⚠⚠ The order is the mockup's and it is not alphabetical — Profile first
 * because it is the one every member has, Earnings last because it is the one nobody can
 * count yet.
 */
export function usageAreas(u: UsageInput): UsageArea[] {
  const healthTotal =
    isNum(u.checksPassing) && isNum(u.checksFailing)
      ? u.checksPassing + u.checksFailing
      : null;

  return [
    {
      key: "profile",
      /* ⚠ From the TAB row, not the band — Profile is an Account-menu destination and
         lights no band application (`E596`), so it has no `PROVIDER_NAV` entry to read. */
      eyebrow: profileTabLabel("/profile"),
      label: "Profile Views",
      figure: u.views,
      goal: USAGE_GOALS.profile,
      /* ⚠⚠⚠ THE SCORE IS A SUPPORTING FIGURE, NOT THE NEEDLE (Scott, 2026-09-30, answer 5).
         ⚠ That keeps `E603`'s ruling intact — *"Completion belongs to the score page.
         Statistics measures what the application DID with the profile"* — because the
         needle measures what the application did (views) and the score is reported beside
         it rather than promoted over it. */
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
      /* ⚠⚠ `/community`, NOT `/connect`. `/connect` is a pure `redirect()` — pointing a
         gauge at it would cost every click a round trip to reach the same page. ⚠ The
         LABEL still comes from the nav item, which is the thing Scott asked not be
         retyped; only the destination is resolved past the redirect. */
      href: "/community",
      go: navLabel("/connect"),
      tip: tipFor(u.colleagues, "colleague", "colleagues"),
      counts: "colleagues",
    },
    {
      key: "work",
      /* ⚠⚠ SCOTT'S *"HIRE"* IS THIS ITEM. `Hire` is the buyer's label for the same
         journey; on the seller's own page the menu says `Work`, and this reads it. */
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
      /* ⚠⚠⚠ THERE IS NO `Get Paid` MENU ITEM TO READ — `E688` removed it, so this eyebrow
         is the ONE on this page that is not a nav lookup. ⚠ It is a literal rather than a
         lookup because the alternative is reading a label off a menu item that does not
         exist, and `navLabel`'s fallback would print `/orders` as the eyebrow. */
      eyebrow: "Earnings",
      label: "Earnings",
      figure: u.earnings,
      /* ⚠⚠⚠ NO SCALE, BECAUSE THERE IS NOTHING TO SCALE (Scott, 2026-09-30, answer 4:
         *"Earnings dashed, with reason"*). ⚠ A `Goal: $10,000` printed under a dash would
         be a target against a figure nobody writes — the gauge would be measuring a
         marketplace that cannot pay anybody yet. ⚠⚠ `USAGE_GOALS.earnings` IS KEPT so the
         scale is one edit away the day settlement reaches `PAID`, and this line is where it
         comes back. */
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
      /* ⚠⚠ A REAL TOTAL, NOT AN ASPIRATION — every check that exists. ⚠ `null` when either
         half is uncountable, because a denominator derived from an unknown is an invented
         number wearing a measurement's clothes. */
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

/**
 * ── ⚠⚠⚠ THE FLOWER — SEVEN CELLS, 2-3-2, PROFILE IN THE CENTRE ──────────────────────────
 *
 * ⚠ **SCOTT, 2026-10-01: *"the flower with Profile in the centre, as in the mockup."***
 *
 * ⚠⚠⚠ **THE MOCKUP'S FLOWER IS SEVEN CELLS IN 2-3-2, AND SEVEN IS NOT A CHOICE — IT IS
 * GEOMETRY.** A hexagonal flower has a centre plus a ring, which is 1 + 6; the next one up
 * is 1 + 6 + 12 = 19. ⚠⚠ **NINE CANNOT MAKE THAT SILHOUETTE.** Nine hexagons tile as a
 * 3×3 rhombus — which is what shipped at `E730` WS-B, and which reads as a block rather
 * than a flower in the 390px screenshot.
 *
 * ⚠⚠ **SO THE SEVEN ARE THE SEVEN AREAS, AND `Search Score` AND `Health` LEAVE THE COMB.**
 * ⚠⚠⚠ **BOTH REMOVALS PAY FOR THEMSELVES RATHER THAN MERELY FITTING:**
 *   · ⚠ `Search Score` **WAS PRINTING TWICE** — as its own cell AND as the Profile gauge's
 *     supporting figure. That was reported at `E730` as a consequence of answers 3 and 5
 *     together, and taking it out of the comb is what resolves it.
 *   · ⚠ `Health` **IS A STATUS, NOT AN ACTIVITY.** It already does not vote for busiest, for
 *     that exact reason; a comb of areas is the other place it does not belong. It keeps its
 *     gauge.
 * ⚠ **EVERY FIGURE IS STILL ON THE PAGE** — the comb lost two cells, not two numbers.
 * ⚠⚠ **SUPERSEDED, quoted not deleted (`E164`):** *"nine cells, the 7 areas (Profile in the
 * centre) plus Views and Health"* (Scott, 2026-09-30). **Rule 13 — the newest dated
 * statement is the live one, and *"as in the mockup"* is specific about the shape.**
 * ⚠ **FLAGGED TO SCOTT, NOT DECIDED QUIETLY: going back to nine is one line here.**
 *
 * ⚠⚠⚠ **PROFILE IS INDEX 3 OF SEVEN — the middle of the middle row — AND IT IS PINNED
 * THERE.** `E603`'s rebuild rotates the cells, which would have carried Profile out of the
 * centre fifteen seconds after load. ⚠ **THE SIX PETALS NOW ROTATE AROUND A FIXED CENTRE**,
 * which keeps *"the cells move; the figures do not"* true while making *"Profile in the
 * centre"* a fact rather than a fact-on-first-render.
 */
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

  /*
    ⚠⚠⚠ ROW 1 (2) · ROW 2 (3, PROFILE IN THE MIDDLE) · ROW 3 (2) — the mockup's own shape.
    ⚠ Index 2 of seven is the centre cell, and `Honeycomb`'s flower layout PINS it there.
  */
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

/**
 * ── ⚠⚠⚠ THE HEADER'S SUMMARY SENTENCE, DERIVED (`P2-A1.1-E730` WS-B) ────────────────────
 *
 * ⚠ **SCOTT: *"The summary sentence says 'Your busiest area is …'"*** and *"names the
 * busiest and quietest areas from the real figures, not fixed text."*
 *
 * ⚠⚠ **IT READS THE SAME `areas` ARRAY THE COMB AND THE GAUGES DRAW**, so it cannot name an
 * area the page is not showing — `BusiestLine`'s rule, inherited rather than restated.
 * ⚠⚠⚠ **ONLY COUNTED FIGURES VOTE.** An uncountable area is not a quiet one, it is an
 * unmeasured one, and calling Earnings *"quietest"* would report a result where nothing was
 * measured.
 * ⚠ **IT STATES WHAT IT COMPARED.** Areas count different things, so "busiest" is a
 * comparison of raw counts and nothing more; saying it without saying that would be a claim
 * the data does not support.
 * ⚠⚠ **AND THE THREE EMPTY STATES ARE KEPT APART** — nothing countable at all, everything
 * countable at zero, and a real winner are three different sentences, because merging the
 * first two reports "nobody has done anything" about figures nobody can measure.
 */
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
  /* ⚠ EVERY measured zero, not just the lowest one — the mockup names three. */
  const quiet = counted.filter((a) => a.figure === 0);

  /*
    ── ⚠⚠⚠ THE ONE PLAIN NEXT STEP ───────────────────────────────────────────────────────
    ⚠ **SCOTT, 2026-10-01: *"busiest area, quiet areas, and one plain next step."***
    ⚠⚠ **IT IS CHOSEN FROM THE QUIET AREAS THEMSELVES, NEVER CANNED.** The mockup's
    sentence — *"No work requests have reached you yet; a complete profile and a colleague
    who can vouch for you are the fastest way to change that"* — is what the page should say
    when `work` is the quiet one, so the step is keyed on WHICH area is quiet.
    ⚠⚠⚠ **NO PROMISES AND NO ABSOLUTES.** *"the fastest way"* is a claim about outcomes
    nobody has measured, so each line below says what to DO, not what it will achieve.
  */
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

  /* ⚠⚠ EVERY COUNTED AREA AT ZERO — no busiest to name, so it says so and goes straight to
     the step. ⚠ A "busiest" among a set of zeros would name an arbitrary winner. */
  if (top.figure === 0) {
    const step = STEP[quiet[0]?.key ?? ""] ?? "";
    return `Nothing has been counted in any area yet.${step ? ` ${step}` : ""}`;
  }

  const quietPart = quiet.length
    ? ` The quiet ${quiet.length === 1 ? "one is" : "ones are"} ${names(quiet)}.`
    : "";
  /* ⚠ The step speaks to the FIRST quiet area, in the page's own order, so it is stable
     between renders rather than depending on a tie-break. */
  const step = quiet.length ? STEP[quiet[0].key] ?? "" : "";

  return (
    `Your busiest area is ${top.eyebrow}, with ` +
    `${plural(top.figure, top.counts.replace(/s$/, ""), top.counts)}.` +
    quietPart +
    (step ? ` ${step}` : "")
  );
}
