import type { Figure } from "@/lib/figure";
import { PROVIDER_NAV } from "@/lib/nav";
import { profileTabLabel } from "@/lib/profile-tabs";

/**
 * ── ⚠⚠⚠ THE AREAS, DEFINED ONCE (`P2-A1.1-E730` WS-B/WS-C) ──────────────────────────────
 *
 * ⚠ **SCOTT, 2026-09-30: *"gauges by PROFILE, LEARN, CONNECT, HIRE, SHOP, ORDERS and
 * PAY"*, and the honeycomb keeps *"the fuller shape"* at nine cells.**
 *
 * ── ⚠⚠⚠ ONE ARRAY, TWO RENDERS — AND THAT IS THE WHOLE REASON THIS FILE EXISTS ──────────
 *
 * ⚠ The page draws the same areas **twice**: as hexagons in the header's picture and as
 * gauges below it. ⚠⚠ **TWO LISTS WOULD DISAGREE THE FIRST TIME ONE OF THEM CHANGED**
 * (`E585`), and they would disagree *in public, on one screen, side by side* — the worst
 * version of that defect, because a reader can see both numbers at once.
 * ⚠⚠⚠ **SO `usageAreas()` IS THE ONLY PLACE AN AREA IS NAMED, COUNTED OR GOALED**, and the
 * comb and the grid are two projections of its return value.
 *
 * ── ⚠⚠ THE EYEBROWS ARE READ FROM THE NAV, NEVER RETYPED ────────────────────────────────
 *
 * ⚠ **SCOTT: *"Read the labels from the band's own nav definition; don't retype them
 * (`E585`)."*** ⚠⚠ `navLabel()` below looks each one up by `href` in `PROVIDER_NAV`, so the
 * day a menu item is re-labelled this page follows — and a typo here cannot invent a menu
 * item that does not exist, because the fallback is reported rather than guessed.
 * ⚠⚠⚠ **`Hire` IS THE BUYER'S WORD FOR IT. Scott's *"HIRE"* is the `Work` menu item on the
 * seller side** (`nav.ts` — `label: "Work"`, `href: "/find-work"`), and that is the label
 * this page carries, because this page is the seller's.
 * ⚠ **`Earnings` LINKS TO `/orders`, NOT TO A PAY PAGE** — `E688` removed the `Get Paid`
 * menu item, so money lives under Orders and there is no `/payments` door in the band.
 *
 * ── ⚠⚠⚠ NO "JOURNEY" ON SCREEN ──────────────────────────────────────────────────────────
 *
 * ⚠ **SCOTT: *"users will not know what a journey is."*** ⚠⚠ The word is internal. Nothing
 * in this file is user-visible except `eyebrow`, `label` and the sub-labels, and none of
 * them says it.
 */

/**
 * ── ⚠⚠⚠ THE GOALS. ONE FILE, SO SCOTT CAN CHANGE THEM IN ONE EDIT ───────────────────────
 *
 * ⚠ **SCOTT'S DECISION 3: *"A gauge's full scale is a stated goal, shown as `Goal: N` on
 * the card, not an unlabelled maximum."*** ⚠⚠ **AN UNLABELLED MAXIMUM IS A CLAIM NOBODY
 * MADE** — a needle at a quarter of the dial implies somebody decided what "full" means,
 * and if that number is a layout convenience then the gauge is reporting a judgement the
 * product never formed.
 * ⚠⚠⚠ **THESE STARTING VALUES ARE THE MOCKUP'S PLACEHOLDERS AND ARE LABELLED AS SUCH ON
 * SCREEN BY THE WORD `Goal`.** They are not measured, not derived from traffic, and not
 * per-member — changing one is a one-line diff here and nowhere else.
 * ⚠ **`health` HAS NO ENTRY ON PURPOSE** — its scale is the number of checks that exist,
 * which is a real total rather than an aspiration, so inventing a goal for it would be the
 * fabricated-maximum defect this block exists to prevent.
 */
export const USAGE_GOALS = {
  profile: 50,
  learn: 20,
  connect: 25,
  work: 10,
  shop: 10,
  orders: 10,
  /** ⚠ Dollars, not cents — it is a goal a person reads, not a stored amount. */
  earnings: 10_000,
} as const;

export type UsageSub = { label: string; figure: Figure };

export type UsageArea = {
  key: string;
  /** ⚠ The menu label, looked up from the nav — never typed here. */
  eyebrow: string;
  /** ⚠ What the gauge's needle measures, e.g. `"Colleagues"`. */
  label: string;
  figure: Figure;
  /**
   * ⚠⚠ The gauge's full scale. ⚠⚠⚠ `null` MEANS THERE IS NO HONEST SCALE, and a gauge with
   * no scale draws no needle — see `Gauge.tsx`. It is not the same as a goal of zero.
   */
  goal: number | null;
  /** ⚠ `true` renders the figure as money. The ARC does not change. */
  money?: boolean;
  subs: [UsageSub, UsageSub];
  href: string;
  /** ⚠ The word after `Go to` — the destination's own menu label. */
  go: string;
  /** ⚠ The hover line. One sentence, derived, never canned. */
  tip: string;
  /** ⚠ What the headline figure counts, for the derived busiest/quietest line. */
  counts: string;
};

/**
 * ⚠⚠ THE LABEL FOR A ROUTE, FROM THE NAV ITSELF.
 *
 * ⚠⚠⚠ **THE FALLBACK IS THE HREF, NOT AN INVENTED WORD** — `profileTabLabel`'s rule, and
 * for its reason: *"a wrong label is worse than an ugly one, and an href at least cannot
 * lie about which page this is."* ⚠ A missing nav item then shows as `/find-work` on screen,
 * which is visibly wrong rather than quietly wrong.
 */
function navLabel(href: string): string {
  return PROVIDER_NAV.find((n) => n.href === href)?.label ?? href;
}

const isNum = (f: Figure): f is number => typeof f === "number";

/** ⚠ `3 colleagues` / `1 colleague`. The figure is already formatted by the caller. */
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
        { label: "Courses Completed", figure: u.coursesCompleted },
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
        { label: "Payouts Pending", figure: u.payoutsPending },
        { label: "Invoices Open", figure: u.invoicesOpen },
      ],
      href: "/orders",
      go: navLabel("/orders"),
      tip: tipFor(u.earnings, "dollar settled", "dollars settled"),
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
 * ── ⚠⚠⚠ THE NINE HONEYCOMB CELLS, FROM THE SAME ARRAY ───────────────────────────────────
 *
 * ⚠ **SCOTT: nine cells, *"the 7 areas (Profile in the centre) plus Views and Health."***
 *
 * ⚠⚠⚠ **THE NINTH CELL IS `Search Score`, NOT `Views`, AND THAT IS A CONSEQUENCE OF HIS
 * OWN ANSWER 5 RATHER THAN A NEW DECISION.** He ruled the Profile gauge's needle is
 * **Profile Views** with Search Score demoted to a supporting figure. ⚠ So `Views` is
 * already the Profile area's headline figure — a separate `Views` cell would print the same
 * number twice on one screen, which is the duplication this whole file exists to prevent.
 * ⚠⚠ **THE SET IS IDENTICAL EITHER WAY — nine cells, the same nine figures.** Only which of
 * the two profile figures sits in the `Profile` cell changes, and this way the cell and the
 * gauge agree about what `Profile` means.
 * ⚠ **REPORTED TO SCOTT RATHER THAN DECIDED QUIETLY** (rule 13): the mockup draws the
 * `Profile` cell as the score, `93`.
 *
 * ⚠⚠ **PROFILE IS INDEX 4 — the centre of a three-by-three comb.** ⚠⚠⚠ THE REBUILD THEN
 * MOVES IT, and that is `E603`'s approved behaviour, not a regression: *"The rebuild
 * rearranges cells and never changes a number."* Profile is centre on the SERVER render and
 * on cycle 0; a reader who asked for reduced motion keeps it there permanently.
 */
export function usageHoneyCells(areas: UsageArea[], searchScore: Figure) {
  const by = (k: string) => areas.find((a) => a.key === k)!;
  const cell = (a: UsageArea) => ({
    key: a.key,
    label: a.eyebrow,
    figure: a.figure,
    counts: a.counts,
    href: a.href,
  });

  /* ⚠ Row 1 · Row 2 (Profile centre) · Row 3 — the comb's own layout offsets the odd rows,
     so index 4 of nine is the middle cell of the middle row. */
  return [
    cell(by("learn")),
    cell(by("connect")),
    {
      key: "score",
      label: "Search Score",
      figure: searchScore,
      counts: "of 100",
      href: "/community/score",
    },
    cell(by("earnings")),
    cell(by("profile")),
    cell(by("work")),
    cell(by("orders")),
    cell(by("shop")),
    cell(by("health")),
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
export function usageSummary(areas: UsageArea[]): string {
  /*
    ⚠⚠⚠ ACCOUNT HEALTH DOES NOT VOTE, AND THE SCREENSHOT IS WHY. ⚠ With it in, the
    sentence read *"Your busiest area is Health, with 4 checks passing"* — which is
    true, comparable and MEANINGLESS: ⚠⚠ **HEALTH IS A STATUS, NOT AN ACTIVITY.** Its
    figure counts checks Panameer runs ON the member, not anything the member did, so
    it wins "busiest" on a brand-new account that has done nothing at all.
    ⚠⚠⚠ IT IS THE SAME CLASS OF RULE AS *"only counted figures vote"* — an area whose
    figure does not answer the question being asked is excluded from the comparison
    rather than allowed to win it. ⚠ It keeps its gauge and its cell; it is only the
    SENTENCE it stays out of.
    ⚠ FOUND IN THE RENDER, NOT IN REVIEW — every gate was green and the line was still
    wrong, which is `E603`'s own lesson about the busiest/quietest sentence repeating
    itself one brief later.
  */
  const activity = areas.filter((a) => a.key !== "health");
  const counted = activity.filter(
    (a): a is UsageArea & { figure: number } => isNum(a.figure)
  );
  const un = activity.length - counted.length;
  const tail =
    un > 0
      ? ` ${un} area${un === 1 ? "" : "s"} could not be counted at all.`
      : "";

  if (counted.length === 0) {
    return "No area on this page can be counted yet, so there is nothing to compare.";
  }

  if (counted.every((a) => a.figure === 0)) {
    return `Nothing counted in any area yet.${tail}`;
  }

  const sorted = [...counted].sort((a, b) => b.figure - a.figure);
  const top = sorted[0];
  const bottom = sorted[sorted.length - 1];

  const quiet =
    sorted.length > 1 && bottom.key !== top.key
      ? ` The quietest is ${bottom.eyebrow}, with ${plural(bottom.figure, bottom.counts.replace(/s$/, ""), bottom.counts)}.`
      : "";

  return (
    `Your busiest area is ${top.eyebrow}, with ` +
    `${plural(top.figure, top.counts.replace(/s$/, ""), top.counts)}.` +
    quiet +
    ` Compared by count only — each area counts a different thing.${tail}`
  );
}
