import type { Me } from "@/lib/types";
import type { Capability } from "@/lib/access";

export type NavItem = {
  label: string;
  href: string;
  /**
   * ⚠⚠ THE JOURNEY'S FULL NAME, when the rail label is a one-word verb
   * (`P1-ALL-E378`). Three levels, each with one job: the RAIL says which
   * journey in one word, the TABS say which slice, and the PAGE HEADING says
   * the journey's name. Without this field the verb IS the only name left and
   * the journey name is simply deleted.
   *
   * ⚠ IT HAS NO RUNTIME EFFECT TODAY, AND THAT IS REPORTED RATHER THAN HIDDEN:
   * `pageTitleFor` is the only reader and NOTHING CALLS `pageTitleFor` — every
   * page renders its own `<h1>`. Verified by grepping `src`, `scripts` and
   * `e2e`; the only other hit is a comment. So `nav.ts:358`'s claim that
   * relabelling *"ALSO MOVES PAGE HEADINGS"* is STALE — it was true when
   * written and is not true now. The field exists so the names survive in the
   * data rather than only in this comment, and so the function is CORRECT if
   * anything ever calls it again.
   */
  heading?: string;
  /**
   * The capability this item requires. Omitted = everyone signed in sees it.
   *
   * Keyed on the SAME `Capability` union `access.ts` uses to guard the routes
   * themselves (brief_learn_v1 WS3), so a menu entry and the page it points at
   * cannot disagree about who is allowed there. The old nav read the raw
   * `isServiceBuyer` / `isServiceProvider` flags — the same answer by
   * coincidence rather than by construction, and coincidence is what drifts.
   */
  requires?: Capability;
  /**
   * A lucide-react icon NAME rather than a component, so this module stays a
   * plain data file — importing React components here would drag the icon set
   * into every server module that reads the nav.
   */
  icon?: string;
  /**
   * A flyout submenu (brief_MASTER_rails_and_community WS1-A/WS1-B).
   *
   * The provider rail is six destinations that each open a set of views, not
   * six leaf links. Declaring the children HERE rather than in the rail
   * component keeps the whole menu — labels, routes, capabilities and now
   * structure — in the one file `pageTitleFor` also reads, so a submenu entry
   * and the header of the page it opens cannot drift into different names.
   */
  children?: NavItem[];
  /** Shown on hover. Used where the deck gives a label an explanatory line. */
  tooltip?: string;
};

/**
 * ONE nav definition (brief_learn_v1 WS3, design doc §6).
 *
 * Two shells render it — a public TOP nav and a signed-in LEFT rail — but the
 * items and their permissions are declared once, here. Two lists would be two
 * chances for Learn to exist in one and not the other, which is exactly the bug
 * this replaces: Learn shipped with no route into it from anywhere.
 */

/**
 * Everything a signed-in person sees, whatever their role.
 *
 * Order matches E134's rail: Search, Home, Learn, then the role items, then
 * Contracts, Finances, Messages. Search sits above Home because it is the thing
 * the mockup puts first, and Contracts/Finances are universal — both sides of a
 * marketplace have agreements and money.
 */
/**
 * HOME sits above the "Applications" group in the casing rail (E151), so it is
 * its own export rather than the first item of the list — the rail renders it
 * differently, and putting it in the group would have meant filtering it back
 * out at the render site.
 */
/*
  ICONS ON THE NON-ADMIN RAILS TOO (E165).

  The admin rail got lucide icons; Provider, Requester and Buyer kept a column
  of bare text, so the same product had two visual languages depending on who
  signed in. Items that exist on both rails REUSE the admin's icon — Learn is
  GraduationCap in both places, Contracts is FileSignature in both — because two
  glyphs for one destination is the drift the shared nav.ts exists to prevent.
*/
/*
  E206/E211 — THERE IS NO SEPARATE "PROVIDER DASHBOARD" ENTRY ANY MORE.

  The rail carried both a utility "Home" and a "Provider Dashboard" button, and
  both pointed at /dashboard — so both matched the active test and the rail lit
  up magenta in two places at once, which the design has exactly one of. The
  landing is "Home" in UTILITY_NAV, and it is the only entry for it.

  THIS AMENDS THE PHASE-1 GROUPED-RAIL DECISION, which named the rail's landing
  anchor "Provider Dashboard". The route is unchanged; only the label and the
  duplication are gone.
*/

/**
 * THE UNIVERSAL CONTROLS — Search, Home, Notifications.
 *
 * Not part of the Transactions group and deliberately not capability-gated:
 * these are the three things you reach for from anywhere, whoever you are.
 *
 * ⚠ THEY LIVE IN THE TOP BAR (brief_topbar_utilities), which REVERSES
 * E207/E208/E209 — those moved them into the rail, and the call now is that the
 * rail is the six role transactions and these are not transactions.
 *
 * NAMED INDIVIDUALLY, not just as a list, because the header renders each in a
 * different shape: Search is a wide pill in the centre, the other two are icon
 * buttons on the right, and the account menu beside them is a popover. A
 * `.map()` over three items that each need bespoke markup is a loop with a
 * switch inside it. The array survives for anything that does want to iterate
 * them, and — the point of keeping this here at all — the href and label are
 * still declared exactly once.
 */
export const SEARCH_NAV: NavItem = { label: "Search", href: "/search", icon: "Search" };
export const HOME_NAV: NavItem = { label: "Home", href: "/dashboard", icon: "Home" };
export const NOTIFICATIONS_NAV: NavItem = {
  label: "Notifications",
  href: "/notifications",
  icon: "Bell",
};

export const UTILITY_NAV: NavItem[] = [SEARCH_NAV, HOME_NAV, NOTIFICATIONS_NAV];

/**
 * THE REQUESTER RAIL (brief_requester_home_v1 WS-A).
 *
 * Same six-slot shape as the provider's, pointed at the buying side: you learn,
 * you create work, you shop packages, you manage what you bought, you pay for
 * it, and you talk to people. Flat from birth — E216 applies to this rail as it
 * does to the provider's, so there are no `children` here to remove later.
 *
 * `canHireTalent` is the gate. Requester and Buyer are both `is_service_buyer`
 * (they differ by owning a RequesterProfile), and the rail is the same for
 * both: the distinction decides what they can APPROVE, not where they can
 * navigate. A capability, never an inline role check.
 *
 * Start Learning and Community are shared with the provider rail by design —
 * the same free training and the same community, from the other side of the
 * marketplace. They are declared again rather than imported, because a shared
 * array would make "change it for buyers" mean "change it for everybody".
 */
/*
  ── ⚠⚠ LABELS CHANGED, ROUTES DID NOT (`P1-J1.1-E268`, 2026-08-30) ──────────

  ⚠ SUPERSEDED, quoted not deleted, so the old names are recoverable:
      Start Learning   -> Learning Paths
      Create Work      -> Work Requests
      Search Packages  -> Service Products (shipped)
      Manage Work      -> Work Orders
      Pay Providers    -> Payments
      Community        -> Community (unchanged)

  ⚠⚠ EVERY `href` IS BYTE-IDENTICAL TO WHAT IT WAS. `/contracts` now READS
  "Work Orders" and `/packages` now READS "Service Products" — the label is the
  product's language, the route is the codebase's, and they are allowed to
  disagree. Renaming a route here would 404 every existing link and is a
  separate decision nobody has made.
  ⚠ THE `requires: "canHireTalent"` GATES ARE UNCHANGED on all four items that
  had them. Relabelling is not re-permissioning.
*/
export const REQUESTER_NAV: NavItem[] = [
  { label: "Learn", heading: "Learning Paths", href: "/learn", icon: "GraduationCap" },
  {
    /* ⚠ MIRRORED SLOT. `nav.ts` already documents why: the rails point the SAME
       WORD at DIFFERENT ROUTES. The nouns survived both sides because they were
       nouns — A VERB PICKS A SIDE, so the buyer hires and the provider works. */
    label: "Hire",
    heading: "Work Requests",
    href: "/create-work",
    icon: "ClipboardList",
    requires: "canHireTalent",
  },
  {
    /* ⚠ MIRRORED SLOT — buyer shops, provider sells. */
    label: "Shop",
    heading: "Service Products",
    href: "/packages",
    icon: "Package",
    requires: "canHireTalent",
  },
  {
    /* ⚠⚠ A PLURAL NOUN, NOT A VERB, AND SCOTT DECIDED IT: *"yes. i get it. that
       works."* SUPERSEDED, QUOTED NOT DELETED — his draft read `Order | Settle`.
       As a bare verb `Order` reads as a command (order something) rather than as
       a place. The row loses all-verb symmetry and gains legibility. */
    label: "Orders",
    heading: "Work Orders",
    href: "/contracts",
    icon: "ClipboardCheck",
    requires: "canHireTalent",
  },
  {
    /* ⚠⚠ THE SECOND PLURAL NOUN, SAME DECISION. `Settle` is the one label
       nobody arrives already understanding, in the ONE SECTION WHERE MONEY
       LIVES. ⚠ The href is `/pay` on this side and `/finances` on the
       provider's — mirrored routes, unchanged by this brief. */
    label: "Payments",
    heading: "Payments",
    href: "/pay",
    icon: "CreditCard",
    requires: "canHireTalent",
  },
  /* ⚠ `My Community` (`P1-ALL-E372` WS-5). Scott: *"'Community' sounds like a
     place you visit; 'My Community' sounds like something you have."* */
  /* ⚠ `Connect` REPLACES `My Community` IN THE RAIL ONLY. The journey keeps its
     name on the page `<h1>`, which still reads `My Community`. */
  { label: "Connect", heading: "My Community", href: "/community", icon: "MessagesSquare" },
];

/**
 * THE TAB ROWS the flattened rail items' children became (E216).
 *
 * Keyed by the base route, so a page asks for its own set by the path it lives
 * at. Declared HERE, beside the rail, for the reason this file exists: these
 * used to be `children` on the nav items, `pageTitleFor` read them to title the
 * pages they point at, and moving them into six separate page components would
 * have split one list across seven files.
 *
 * DE-DUPLICATED AGAINST WHAT THE PAGE ALREADY HAD, which mattered most for Find
 * Work. Its five flyout children and the work feed's five tabs described the
 * same views under different names — "Work Requests for My Skills" IS "Best
 * Matches" (the feed ranks by skill overlap), and "All Work Requests" IS "Most
 * Recent". Folding them in added exactly one genuinely new view, My Proposals,
 * rather than stacking a second row of near-synonyms.
 */
/**
 * ⚠ A TAB IS A NAV ITEM PLUS TWO TAB-ONLY FACTS (`P1-ALL-E378`).
 *
 * Extended rather than folded into `NavItem` so the RAIL cannot accidentally
 * acquire a step number — a numbered rail is a different product decision and
 * nobody made it.
 *
 *   `n`     — the step number in a sequenced set. ⚠ ABSENT means unnumbered
 *             ON PURPOSE and is a real state, not missing data: `/messages`
 *             sits in the `/community` sequence WITHOUT a number because it has
 *             no `Message` model behind it.
 *   `state` — ⚠⚠ WHERE THE `live` / `early` PILLS WENT. They used to ride on
 *             `communitySections()`'s duplicate cards, which `E378` removes.
 *             The pill is the one thing on those cards worth keeping, so it
 *             moves ONTO THE TAB rather than onto a second set of cards —
 *             which is exactly what the brief asked for. Values match
 *             `lib/community.ts`'s originals: forums/teams `live`,
 *             mentors/messages `early`.
 */
export type PageTabItem = NavItem & {
  n?: number;
  state?: "live" | "early";
};

export const PAGE_TABS: Record<string, PageTabItem[]> = {
  /*
    LEARN IS THE EXCEPTION, and deliberately. The pill row that used to carry
    these — a live client-side filter over one catalog, not two routes — is
    `LearnHome`'s, and `LearnHome` now lives at `/learn/paths`: `/learn` itself
    became the learner's dashboard (brief_learn_app_shell WS2). A `PageTabs` row
    above that dashboard would be the exact double-row the brief forbids, so the
    dashboard carries a quiet link row of its own instead.

    ⚠ THIS ENTRY IS STILL NOT RENDERED ANYWHERE. It exists so `pageTitleFor`
    knows these routes' names. `/learn/paths` joins it for the same reason.
  */
  /*
    ── ⚠ ONE TAB REMOVED, ONE KEPT, AND ONE RENAMED (`P1-J3-E362`) ───────────

    ⚠ SUPERSEDED: `{ label: "My Courses", href: "/learn/my-courses" }`. That
    route was still a `ComingSoon` while `/learn/paths?tab=mine` already worked,
    so it now REDIRECTS there (not deleted — the URL may be linked) and the tab
    points straight at the real destination. ⚠ `My learning`, not `My courses`:
    the tab lists PATHS.

    ⚠⚠ `/learn/courses` STAYS, AND THAT IS A DELIBERATE DEPARTURE FROM THE BRIEF.
    `E362` asked for it to redirect to `/learn/paths` as a duplicate. IT CANNOT:
    `/learn/courses` is PUBLIC by `P1-J0-E316` (*"a gate there turns the public
    hero's second CTA into a login wall"*) and `/learn/paths` is GATED by
    `P1-J3-E036` (*"THIS ROUTE STAYS GATED"*, redirecting signed-out visitors to
    `/login`). Redirecting the public one at the gated one would silently undo
    `E316`. ⚠ THE DUPLICATION IS THE RESIDUE OF TWO OPPOSITE RECORDED DECISIONS,
    and reconciling them is Scott's call, not this brief's. REPORTED at `E362`.
  */
  "/learn": [
    { label: "All Learning Paths", href: "/learn/paths" },
    { label: "All Courses", href: "/learn/courses" },
    { label: "My learning", href: "/learn/paths?tab=mine" },
  ],
  "/settings/packages": [
    { label: "Service Products", href: "/settings/packages" },
    { label: "Offers for My Services", href: "/services/offers" },
  ],
  "/finances": [
    { label: "Payments", href: "/finances" },
    { label: "Payment Requests", href: "/finances/payment-requests" },
  ],
  /*
    ⚠⚠ `/community` — MODE `suggested`, AND THE NUMBERS ARE A RECOMMENDED ORDER
    OF ATTENTION, NOT A PROCESS (`P1-ALL-E378`).

    SCOTT, 2026-09-04: *"with something like Connect there isn't a real process
    sequence, but there is a logical sequence."*

    ⚠ THE RAIL SAYS THE JOURNEY, SO NO TAB REPEATS IT AND NONE NEEDS `My`.
    ⚠ SUPERSEDED, QUOTED NOT DELETED — this set read:
      *"My Community · Messages · Forums · My Teams · Find a Mentor"*.
    `My Community` was the active tab sitting forty pixels above an `<h1>` that
    said `My Community` again.

    ⚠⚠ `Find a Mentor` -> `Mentoring` NAMES THE TOPIC, NOT THE PEOPLE. `E374`
    established that nobody is a mentor until asked, so a label presenting people
    as mentors advertises a consent nobody gave.

    ⚠⚠ MESSAGES IS UNNUMBERED AND LAST, AND THAT IS A BUILD FACT RATHER THAN A
    PREFERENCE. Scott's draft order opened with *"1. Check Your Messages"* and
    that is right for the finished product — but there is NO `Message` model in
    the schema and `/messages` ships a disabled composer reading *"Messaging
    isn't available yet."* A suggested sequence whose step 1 is a dead end
    teaches people the numbers are decorative. ⚠ MESSAGES TAKES 1 THE DAY IT HAS
    A MODEL.
  */
  "/community": [
    { n: 1, label: "Colleagues", href: "/community" },
    { n: 2, label: "Forums", href: "/community/forums", state: "live" },
    { n: 3, label: "Mentoring", href: "/community/mentors", state: "early" },
    { n: 4, label: "Teams", href: "/community/teams", state: "live" },
    /* ⚠ NO `n` — see the block above. */
    { label: "Messages", href: "/messages", state: "early" },
  ],
  /*
    Manage Work had ONE child pointing at the page it already opened, so it has
    no tab row at all — a single tab is a label wearing a control's clothes.
  */
};

/**
 * THE COMPANY MENU (E214) — the top-left chip's popover, company-admins only.
 *
 * Declared here with the rest of the navigation rather than inside the chip,
 * for the reason this file exists at all: a destination named in one place and
 * routed in another is how a menu item outlives its page.
 *
 * Company is the built page. Teams, Branding and Company Settings are titled
 * placeholders — the menu names them, so they have to LAND somewhere, and a 404
 * out of your own menu reads as broken where an honest "coming soon" reads as
 * unfinished. Members is an anchor into the section the company page already
 * renders, not a fourth stub, because that list genuinely exists today.
 */
/**
 * Find Work's tabs live in `work-feed.ts` with the query that backs them, so
 * only their TITLES are needed here — `pageTitleFor` has to know that
 * /work/proposals is "My Proposals" even though the tab row is built elsewhere.
 */
export const WORK_FEED_EXTRA_TITLES: NavItem[] = [
  { label: "Find Work", href: "/find-work" },
  { label: "Work Requests for My Skills", href: "/find-work/for-my-skills" },
  { label: "My Work Requests (Saved)", href: "/find-work/saved" },
  { label: "Invitations to Propose My Rate", href: "/find-work/invitations" },
  { label: "My Proposals", href: "/find-work/proposals" },
];

export const COMPANY_NAV: NavItem[] = [
  { label: "Company", href: "/company" },
  { label: "Teams", href: "/company/teams" },
  { label: "Branding", href: "/company/branding" },
  /*
    E225 — MEMBERS IS NOT A MENU ITEM. It is a section of the Company page, and
    a menu entry that scrolls you down the page you would already be on is a
    destination pretending to be one. The `#members` anchor stays on that page
    for anything that wants to deep-link it.
  */
  { label: "Company Settings", href: "/company/settings" },
];

/*
  THE PROVIDER RAIL — SIX FLAT ITEMS (E216; supersedes the grouped-with-submenus
  version below).

  THE CHILDREN MOVED ONTO THEIR PAGES. Each of these six carried a hover flyout,
  and Find Work's was the tell: its five entries were the Find Work page's own
  tab row, listed a second time in a menu. Two controls for one set of views,
  one of which you had to hover to discover — and, until they were portalled
  out, one that the rail's own scroll container clipped.

  A tab row on the destination is visible on arrival, says where you are as well
  as where you can go, and survives a bookmark. So the rail is six plain links
  now, no chevrons, and `PageTabs` carries what the flyouts did. The two
  IDENTITY menus are untouched — the company chip and the persona popover keep
  their popovers, because those are not navigation between views of one page.

  Historical note on the previous shape:
  (brief_MASTER_rails_and_community WS1-A/WS1-B; supersedes E191's flat list,
  which itself superseded E007).

  WHAT CHANGED, and why it is a shape change rather than a rename. E191's rail
  was eight leaf links: one click, one page. The deck's rail is six DESTINATIONS
  that each open a set of views — "Find Work" is not a page, it is five ways of
  looking at work requests. A flat list can only express that by promoting every
  view to a top-level row, which is how a nine-item rail becomes a twenty-item
  one and stops being navigable.

  Declared here rather than in the rail component because `pageTitleFor` reads
  this file: a submenu entry and the header of the page it opens are the same
  string, and cannot drift.

  THREE LOCKED DECISIONS ARE VISIBLE IN THIS LIST:

    NO TIMESHEETS. E191 had "Timesheets & Milestones" pointing at /deliver-work.
    Timesheet and fixed-firm-price billing both surface as Payment Requests
    generated from a Work Order, under Get Paid; milestones live inside a Work
    Order's detail. A rail item for a thing that is a tab inside another thing
    taught the wrong model of how work gets billed.

    NO FIND TALENT. It is a hiring surface and belongs to the buyer/requester
    rail, which is a separate brief. It was capability-gated here, so a pure
    provider never saw it — but leaving it in the PROVIDER definition made the
    provider rail responsible for a menu it does not own.

    COMMUNITY IS BACK. E191 dropped it; it is the heart of the earning story
    (Credits, forums, mentoring) and is the sixth primary item.
*/
/*
  ── ⚠⚠ THE SELLER RAIL CATCHES UP (`P1-J1.4-E303`, 2026-09-01) ────────────────

  Scott: *"These are old names/titles. I thought we changed all the menus
  (probably for the service buyers). That means we need to do the same for the
  service providers."* He is right — `E268` renamed `REQUESTER_NAV` and left this
  one behind, so the two sides have been speaking different languages since.

  ⚠ SUPERSEDED, quoted not deleted:
      Start Learning  -> Learning Paths
      Find Work       -> Work Requests
      Create Packages -> Service Products
      Manage Work     -> Work Orders
      Get Paid        -> Payments
      Community       -> Community (already correct)

  ⚠⚠ LABELS ONLY. NOT ONE `href` AND NOT ONE `requires` GATE CHANGED. The two
  rails deliberately point the SAME WORD at DIFFERENT ROUTES — provider
  `Work Requests` -> `/find-work`, buyer -> `/create-work`; provider
  `Service Products` -> `/settings/packages`, buyer -> `/packages`. That is the
  design: one vocabulary, two destinations. DO NOT "align" the routes.

  ⚠ THIS ALSO MOVES PAGE HEADINGS, and that is intended — `pageTitleFor` derives
  every heading from these definitions (see its docblock). ⚠ AND IT FIXES AN
  EXISTING INCONSISTENCY NOBODY FILED: `pageTitleFor`'s lookup list spreads
  `PROVIDER_NAV` but NOT `REQUESTER_NAV`, so a BUYER on `/learn` has been getting
  the heading "Start Learning" while their own rail said "Learning Paths". Both
  now read "Learning Paths". Same for `/contracts` -> "Work Orders".
*/
export const PROVIDER_NAV: NavItem[] = [
  { label: "Learn", heading: "Learning Paths", href: "/learn", icon: "GraduationCap" },
  {
    /* ⚠ MIRRORED — the provider WORKS where the buyer HIRES. Same slot, same
       vocabulary role, different route and different verb. */
    label: "Work",
    heading: "Work Requests",
    href: "/find-work",
    icon: "Briefcase",
    requires: "canProvideServices",
  },
  {
    /* ⚠ MIRRORED — the provider SELLS where the buyer SHOPS. */
    label: "Sell",
    heading: "Service Products",
    href: "/settings/packages",
    icon: "Tag",
    requires: "canProvideServices",
  },
  { label: "Orders", heading: "Work Orders", href: "/contracts", icon: "ClipboardCheck" },
  { label: "Payments", heading: "Payments", href: "/finances", icon: "Wallet" },
  { label: "Connect", heading: "My Community", href: "/community", icon: "MessagesSquare" },
];


/**
 * THE PERSONA MENU'S DESTINATIONS (J2.4 WS-B/WS-D — E008).
 *
 * Here rather than in `AccountMenu` for the reason the rest of this file
 * exists: the header derives every page's title from the nav definitions, so a
 * menu that declared its own labels would produce pages whose heading and whose
 * menu entry disagreed — "My Stats" in the dropdown, "Stats" in the header,
 * from the same click. Declared once, read by both.
 *
 * Not capability-gated: these are the signed-in person's own surfaces, and the
 * ADMIN variant below is a different LIST rather than a filter, because an
 * admin is missing these for a reason (no seller standing, no job success
 * score, nobody to ask for a recommendation) rather than by permission.
 */
/*
  SPLIT AROUND THE THEME ROW (WS1-C).

  The deck's order is My Profile · My Stats · Account Health Checklist ·
  Theme › · Request Recommendations · Settings · Sign Out (E225 removed My
  Theme is not a destination — it is an inline submenu. Rather than have the
  component match on a label to know where to inject it, the two halves say so
  themselves: everything in PRIMARY renders above the theme row, everything in
  SECONDARY below it.
*/
export const PERSONA_NAV_PRIMARY: NavItem[] = [
  { label: "My Profile", href: "/profile" },
  { label: "My Stats", href: "/stats" },
  { label: "Account Health Checklist", href: "/account-health" },
];

export const PERSONA_NAV_SECONDARY: NavItem[] = [
  { label: "Request Recommendations", href: "/recommendations" },
  /*
    E225 — "MY COMPANY" IS GONE FROM HERE. The three-zone rule is that the
    top-left chip owns the company and this menu owns the person; an entry that
    opened /company from the personal popover was the last thing crossing that
    line.

    The route did not simply vanish for non-admins, which it would have: the
    chip only renders a MENU for admins, so removing this would have left an
    ordinary member with no way to reach their own company page. The chip is a
    plain link for them now — same zone, same destination, read-only.
  */
  { label: "Settings", href: "/settings" },
];

/** The whole persona list, for `pageTitleFor` and anything that wants it flat. */
export const PERSONA_NAV: NavItem[] = [
  ...PERSONA_NAV_PRIMARY,
  ...PERSONA_NAV_SECONDARY,
];

/** What a Panameer employee keeps of that list. */
export const ADMIN_PERSONA_NAV: NavItem[] = [
  { label: "My Profile", href: "/profile" },
];

/*
  PUBLIC_NAV is gone (WS-6b). It held the one-item nav that PublicTopNav
  rendered on /learn and /verify; both now use the shared MarketingHeader, and
  the public nav is MARKETING_NAV in components/marketing/brand.tsx — one list
  for one header.
*/

/** Does this viewer hold the capability an item asks for? */
function holds(me: Me, capability: Capability): boolean {
  /* ⚠ NO PERSON, NO CAPABILITIES (P1-ALL-E002). Actor flags live on the Person;
     a user without one holds nothing, and the rail filters down to empty rather
     than offering actions the account cannot take. */
  const r = me.person?.roles;
  if (!r) return false;
  switch (capability) {
    case "canProvideServices":
      return r.isServiceProvider;
    case "canHireTalent":
      return r.isServiceBuyer;
    case "canCoordinate":
      return r.isServiceCoordinator;
    case "canSupport":
      return r.isSupport;
    case "canAdminister":
      // `Me` carries actor flags, not the system-admin bit; admin surfaces have
      // their own entry point and are deliberately absent from the app rail.
      return false;
    default:
      return false;
  }
}

/**
 * USER CLASS -> MENU. The ONE place this mapping is made.
 *
 *   Service Seller (provider) -> PROVIDER_NAV
 *   Service Buyer  (requester) -> REQUESTER_NAV
 *
 * Centralized per brief_nav_casing_consistency WS-C so no component re-derives
 * it. There is exactly one caller today (`navForRoles`), and that is the point:
 * the moment a second surface needs "which menu does this person get", it calls
 * this instead of writing the ternary again — which is how two surfaces end up
 * disagreeing about who is a seller.
 *
 * SOMEBODY WHO IS BOTH SEES THE PROVIDER MENU. They are standing in the
 * provider console, and a merged rail of twelve items across two jobs would
 * answer neither question. Switching consoles is the persona menu's job.
 *
 * ⚠ STILL ROLE-FLAG BASED, deliberately. The brief maps this to USER_CLASS, and
 * `USER_CLASS`/`USER_JOB` are not in the schema yet (see the note further up
 * this file). Until they land, `isServiceProvider` IS the class signal — and
 * when they do land, this function is the only thing that changes.
 */
/**
 * THE ONE PREDICATE behind both the menu and its caption.
 *
 * Extracted so `menuForUserClass` and `railPersona` cannot answer "which side
 * of the marketplace is this?" differently — a rail captioned SELLER over the
 * requester menu is worse than no caption, because it is confidently wrong.
 * When `USER_CLASS` lands, this one line is what changes.
 */
function isSellerSide(me: Me): boolean {
  /* ⚠ AN UNPROFILED USER IS NOT A SELLER. They are not a buyer either, but the
     buying side is the safe default: every item is filtered by `holds()` anyway,
     which returns false for all of them, so the practical answer is an empty
     rail — and defaulting to the SELLER menu would caption that empty rail
     "SELLER", which is confidently wrong. */
  return me.person?.roles.isServiceProvider === true;
}

export function menuForUserClass(me: Me): NavItem[] {
  return isSellerSide(me) ? PROVIDER_NAV : REQUESTER_NAV;
}

/** The rail's persona caption. Uppercase by convention, not by CSS accident. */
export type RailPersona = "BUYER" | "SELLER" | "PANAMEER";

/**
 * WHICH PERSONA THE RAIL IS CURRENTLY SHOWING (E098).
 *
 * The rail had no persona caption at all, so somebody with more than one
 * membership could not tell which side of the marketplace they were looking at.
 * This is the derivation, in one place, and it reads the SAME inputs the rail
 * already uses to decide what to render — `isSellerSide` for the menu and the
 * `isSystemAdmin` session bit for the admin branch.
 *
 * ⚠ IT LABELS THE RAIL, NOT THE PERSON. That is what decides both awkward cases:
 *
 *   · SOMEBODY WITH BOTH ACTOR FLAGS GETS `SELLER`, because `menuForUserClass`
 *     gives them PROVIDER_NAV. The caption's job is to name the menu underneath
 *     it; naming the person instead would caption a provider rail `BUYER` for
 *     anyone who happens to hold both, which is the exact confusion E098 is
 *     about. Switching side is the persona menu's job, not the caption's.
 *   · AN ADMIN WHO IS ALSO A PROVIDER GETS `PANAMEER`, for the same reason —
 *     the rail is rendering ADMIN_NAV.
 *
 * ⚠ NOT `USER_CLASS`, AND DELIBERATELY NOT. `USER_CLASS`/`USER_JOB` are not in
 * the schema (see the note above `menuForUserClass` and the one further up this
 * file). Faking the enum here to look forward-compatible would put a second,
 * lying source of truth next to the real one. This is the single call site to
 * change when they land.
 *
 * Returns null when there is no viewer — `navForRoles` returns [] in that case,
 * and captioning an empty rail would be a claim about nobody.
 */
export function railPersona(
  me: Me | null,
  isSystemAdmin: boolean
): RailPersona | null {
  if (isSystemAdmin) return "PANAMEER";
  if (!me) return null;
  return isSellerSide(me) ? "SELLER" : "BUYER";
}

/**
 * The signed-in nav: base items, then whatever the viewer's capabilities add.
 * Deduped by href — a rail listing the same route twice looks broken.
 */
export function navForRoles(me: Me | null): NavItem[] {
  if (!me) return [];
  const items: NavItem[] = [];
  const seen = new Set<string>();
  /*
    WHICH RAIL. A provider gets the provider rail; anyone else who can hire gets
    the requester rail. Someone who is BOTH sees the provider one — they are
    standing in the provider console, and a rail that merged twelve items across
    two jobs would answer neither. Switching consoles is the persona menu's job.

    `seen` still de-dupes, because the two rails share Start Learning, Manage
    Work and Community by design.
  */
  const source = menuForUserClass(me);
  for (const item of source) {
    if (item.requires && !holds(me, item.requires)) continue;
    if (seen.has(item.href)) continue;
    seen.add(item.href);
    /*
      Children inherit the parent's gate and are filtered on their own too. A
      submenu entry that outlives the item it hangs under is unreachable rather
      than harmful, but it would still be a lie in the one file the header reads
      its titles from.
    */
    const children = item.children?.filter(
      (c) => !c.requires || holds(me, c.requires)
    );
    items.push(children?.length ? { ...item, children } : { ...item, children: undefined });
  }
  return items;
}

/** Human-readable role labels for greeting/summary. */
export function roleLabels(me: Me | null): string[] {
  if (!me?.person) return [];
  const r = me.person.roles;
  const labels: string[] = [];
  if (r.isServiceProvider) labels.push("Service Provider");
  if (r.isServiceBuyer) labels.push("Service Buyer");
  if (r.isServiceCoordinator) labels.push("Service Coordinator");
  if (r.isSupport) labels.push("Support");
  return labels;
}

// ---------------------------------------------------------------------------
// The ADMIN console (brief_console_and_admin_MASTER WS4 / E009)
// ---------------------------------------------------------------------------

export type NavGroup = { title: string | null; items: NavItem[] };

/**
 * The Panameer Admin's rail, grouped exactly as Scott's menu mockup has it.
 *
 * A separate structure from the app rail rather than a filtered view of it: the
 * admin console and the provider app share chrome, not navigation. Every entry
 * here is behind `canAdminister`, which the /admin prefix already enforces at
 * the proxy, in route-access.ts and in the layout — the capability on each item
 * is what keeps the MENU honest if any of those ever move.
 */
export const ADMIN_HOME: NavItem = {
  label: "Panameer Dashboard",
  href: "/admin",
  requires: "canAdminister",
  icon: "LayoutDashboard",
};

export const ADMIN_SETUP: NavItem = {
  label: "Setup & Maintenance",
  href: "/admin/setup",
  requires: "canAdminister",
  icon: "SlidersHorizontal",
};

/**
 * The admin rail, rebuilt to the 2.5 deck + admin_rail_icons_reference.png.
 *
 * WHAT MOVED, and why it matters more than a rename: the MASTER's rail had one
 * "Work" and one "Packages" entry. The revised model splits the transaction
 * lifecycle into its real stages — Work Requests, Work Orders, Work Packages,
 * Contracts, Settlements, Payments — because those are separate records with
 * separate states, and a single "Work" page could only ever have shown one of
 * them. Buyers/Sellers moves to Configuration Data: it is a directory of who
 * exists, not a stream of what happened.
 */
export const ADMIN_NAV: NavGroup[] = [
  {
    title: "Transaction Data",
    items: [
      { label: "Learn", href: "/admin/learn", icon: "GraduationCap" },
      { label: "Work Requests", href: "/admin/work-requests", icon: "ClipboardList" },
      { label: "Work Orders", href: "/admin/work-orders", icon: "ClipboardCheck" },
      { label: "Work Packages", href: "/admin/work-packages", icon: "Package" },
      { label: "Contracts", href: "/admin/contracts", icon: "FileSignature" },
      { label: "Settlements", href: "/admin/settlements", icon: "Scale" },
      { label: "Payments", href: "/admin/payments", icon: "CreditCard" },
      { label: "Messages", href: "/admin/messages", icon: "MessageSquare" },
      { label: "Community", href: "/admin/community", icon: "Users" },
    ],
  },
  {
    title: "Configuration Data",
    items: [
      { label: "Buyers/Sellers", href: "/admin/buyers-sellers", icon: "ArrowLeftRight" },
      { label: "Roles>Domains>Skills", href: "/admin/skill-catalog", icon: "FolderTree" },
      { label: "Specializations", href: "/admin/specializations", icon: "Award" },
      { label: "Industries", href: "/admin/industries", icon: "Building2" },
      /*
        THE ASSESSMENT'S FUNDING RATE (brief_assessment_p2p_phase1). Configuration
        Data, not Support Data: it is a value the platform computes with, like the
        catalog above it, rather than an operational tool. Additive — the four-nav
        model and every other menu are untouched.
      */
      { label: "Funding Rate", href: "/admin/tax-rates", icon: "Percent" },
    ],
  },
  {
    title: "Support Data",
    items: [
      { label: "Support Center", href: "/admin/support", icon: "LifeBuoy" },
      { label: "Platform Admins", href: "/admin/admins", icon: "ShieldCheck" },
    ],
  },
].map((g) => ({
  ...g,
  items: g.items.map((i) => ({ ...i, requires: "canAdminister" as const })),
}));

/**
 * Routes the revised rail retired. Kept as redirects rather than deleted: the
 * old paths are in browser history, in the previous walk's notes and in the
 * MASTER brief, and a 404 on a route that worked yesterday reads as a
 * regression rather than a restructure.
 */
export const RETIRED_ADMIN_ROUTES: Record<string, string> = {
  "/admin/work": "/admin/work-requests",
  "/admin/packages": "/admin/work-packages",
  "/admin/talent": "/admin/buyers-sellers",
  "/admin/finances": "/admin/payments",
};

/**
 * The header title for a path (E015).
 *
 * THE RULE: home shows the greeting, every other page shows its own name. So
 * this returns null for a home route and a label otherwise, and the header
 * decides which to render.
 *
 * Derived from the nav definitions rather than declared per page. A `title`
 * prop on every page would be one more thing to forget on the next one, and it
 * would let the rail and the header disagree about what a page is called — the
 * exact drift the single nav definition exists to prevent.
 */
/**
 * ⚠⚠ WHICH TAB SETS CARRY A SEQUENCE (`P1-ALL-E378`).
 *
 *   `process`   — numbers + connectors + done/current/upcoming. Doing 1 before
 *                 2 is REQUIRED.
 *   `suggested` — numbers + connectors, NO STATE. A recommended order of
 *                 attention; nothing blocks and nothing completes.
 *   `none`      — plain tabs. Parallel slices.
 *
 * ⚠⚠ A SET DECLARES ITS OWN MODE, AND ANYTHING UNLISTED IS `none`. Defaulting
 * to `none` is deliberate: a set acquires a sequence only when somebody decides
 * it has one.
 *
 * ── ⚠⚠ WHY ONLY ONE SET IS SEQUENCED, WHICH IS A FINDING, NOT AN OMISSION ──
 *
 * The brief expected `/learn` to ship as `process` with handles from
 * `LEARN_STEPS`. ⚠ IT DOES NOT MAP, AND THE RULE THE BRIEF STATES TWICE IS *"do
 * not invent steps to force a match"*, so it ships `none` and is reported:
 *
 *   LEARN_STEPS                        /learn tab
 *   1 Enroll in a Learning Path    ->  All Learning Paths
 *   2 Connect with the Instructor  ->  ⚠ NO TAB — this step is `/community`
 *   3 Watch the Courses and Lessons->  All Courses
 *   4 Get Certified!               ->  ~ My learning (progress, not the step)
 *   5 Get Expert Support           ->  ⚠ NO TAB — this step is `/community`
 *
 * Numbering three tabs 1·3·4 renders gaps that read as broken; renumbering them
 * 1·2·3 would contradict the public promise those numbers come from.
 *
 * ⚠ THE SAME IS TRUE OF THE OTHER TWO SETS, and for the same structural reason:
 * `/settings/packages` (2 tabs) and `/finances` (2 tabs) are SLICES OF ONE PAGE,
 * while every spine describes an END-TO-END JOURNEY ACROSS PAGES. They are
 * different granularities, not a missing mapping.
 *
 * ⚠ SO `process` SHIPS WITH NO CONSUMER TODAY. Reported rather than quietly
 * dropped — the mode is specified, built and asserted, and the first set that
 * genuinely has a required order can declare it in one line.
 */
export const TAB_SEQUENCE: Record<string, "process" | "suggested" | "none"> = {
  "/community": "suggested",
  /* ⚠ `none` BY EVIDENCE, NOT BY DEFAULT — see the mapping above. */
  "/learn": "none",
  "/settings/packages": "none",
  "/finances": "none",
};

/** The mode for a tab set. ⚠ Unlisted is `none` by design. */
export function tabSequenceFor(baseRoute: string): "process" | "suggested" | "none" {
  return TAB_SEQUENCE[baseRoute] ?? "none";
}

export function pageTitleFor(pathname: string): string | null {
  if (pathname === "/dashboard" || pathname === "/admin") return null;

  const all: NavItem[] = [
    ADMIN_SETUP,
    ...ADMIN_NAV.flatMap((g) => g.items),
    /*
      Rail items AND every tab destination. A tab is a real page with a real
      header; without these, "My Proposals" would open a page titled "Proposals"
      from the URL segment. This is what the flattened `children` used to
      supply — same list, now read from PAGE_TABS.
    */
    ...PROVIDER_NAV,
    ...Object.values(PAGE_TABS).flat(),
    ...WORK_FEED_EXTRA_TITLES,
    // The persona-menu pages are real destinations too, reached from the avatar
    // rather than the rail.
    ...PERSONA_NAV,
  ];

  // Longest matching href wins, so /admin/learn beats /admin. Query strings are
  // stripped first: two submenu entries can point at one page with different
  // filters ("/learn?tab=mine"), and a `?` in the comparison would match neither.
  let best: NavItem | null = null;
  for (const raw of all) {
    const item = { ...raw, href: raw.href.split("?")[0] };
    if (pathname === item.href || pathname.startsWith(item.href + "/")) {
      if (!best || item.href.length > best.href.length) best = item;
    }
  }
  /* ⚠ THE JOURNEY NAME WINS OVER THE RAIL VERB (`P1-ALL-E378`). The rail says
     `Connect`; the page is still `My Community`. */
  if (best) return best.heading ?? best.label;

  // Not a nav destination — title-case the last meaningful segment.
  const seg = pathname.split("/").filter(Boolean).pop();
  if (!seg) return null;
  return seg
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
