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
 * ── ⚠⚠⚠ A BAND ITEM MAY OWN MORE THAN ONE PREFIX (`P2-A3-E596` WS-A) ──────
 *
 * ⚠ SCOTT'S SECOND CONNECT WALK, 2026-09-20: he opened `/community/score` and
 * **the band lit nothing.** The tab row above said `CONNECT · Profile` while
 * the band said he was nowhere — two navigation layers on one page
 * disagreeing about which application he was in.
 *
 * ── WHY IT HAPPENS ────────────────────────────────────────────────────────
 *
 * ⚠⚠ CONNECT'S BAND ENTRY IS `/connect`, BUT CONNECT'S PAGES MOSTLY LIVE UNDER
 * `/community` — Community, Colleagues, Forums, Mentors, Teams and Score, eight
 * routes on disk. `AppBand`'s test is `pathname.startsWith(href)`, ONE PREFIX
 * PER ITEM, so none of them matches `/connect` and the pill stays dark.
 *
 * ── ⚠⚠⚠ AN EXPLICIT LIST, NEVER A LOOSER MATCH ───────────────────────────
 *
 * ⚠ The obvious "fix" is to relax the test. `AppBand.tsx`'s own comment records
 * why that is wrong: `/admin` is a prefix of every admin page and a `startsWith`
 * test once **lit fifteen pills at once** (`E475`).
 * ⚠⚠ AN EXPLICIT LIST CANNOT DO THAT. It adds exactly the prefixes somebody
 * wrote down, and every addition is a one-line diff in review.
 *
 * ⚠ IT LIVES HERE, NOT ON THE `NavItem`s, BECAUSE THE SAME ITEM IS DECLARED
 * TWICE — `Connect` appears in `PROVIDER_NAV` and in `REQUESTER_NAV`, and a
 * property set on one and forgotten on the other is precisely the drift one
 * definition exists to prevent. Keyed by `href`, it covers both.
 *
 * ⚠⚠ THE SETTINGS ABSORPTION BRIEF ADDS A THIRD PREFIX HERE and is blocked on
 * this landing. Add the prefix; change nothing else.
 */
const BAND_EXTRA_PREFIXES: Readonly<Record<string, readonly string[]>> = {
  /* ⚠ Connect's pages live under `/community` — Community, Colleagues, Forums,
     Mentors, Teams and Score, eight routes. This is the one Scott caught. */
  "/connect": ["/community"],
  /*
    ⚠⚠ FOUND BY THE NEW GATE, NOT BY THE BRIEF. Enumerating `PAGE_TABS` turned
    up two more dark-band routes of exactly the same shape, both tab
    destinations that leave their own prefix:
      · `Sell`'s second tab goes to `/services/offers` — the ONLY route under
        `/services`, verified on disk, so the prefix cannot over-match.
      · `Hire`'s second tab goes to `/create-work`, a single route.
    ⚠ They are fixed here rather than reported and left, because the assertion
    Scott asked for goes red on them and a gate that ships red is not a gate.
  */
  "/my-services": ["/services"],
  "/hire": ["/create-work"],
};

/**
 * Every path prefix a band item owns — its own `href` first, then any extras.
 *
 * ⚠ The single source of truth for "which application is this page in", read by
 * `AppBand` and by the gate that proves the two navigation layers agree.
 */
export function bandPrefixesFor(href: string): readonly string[] {
  return [href, ...(BAND_EXTRA_PREFIXES[href] ?? [])];
}


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

  ⚠ SUPERSEDED IN PART BY `P1-ALL-E380`: `/contracts` BECAME `/orders` on
  2026-09-04, so this paragraph's "byte-identical" claim no longer covers that
  one route. Everything else in it still holds, which is why it is corrected
  rather than deleted. ⚠ NOT ON `E380`'s REFERENCE LIST — found by grepping.
  ⚠⚠ EVERY OTHER `href` IS BYTE-IDENTICAL TO WHAT IT WAS. `/orders` now READS
  "Work Orders" and `/packages` now READS "Service Products" — the label is the
  product's language, the route is the codebase's, and they are allowed to
  disagree. Renaming a route here would 404 every existing link and is a
  separate decision nobody has made.
  ⚠ THE `requires: "canHireTalent"` GATES ARE UNCHANGED on all four items that
  had them. Relabelling is not re-permissioning.
*/
export const REQUESTER_NAV: NavItem[] = [
  /*
    ── ⚠⚠⚠ `Connect` IS FIRST ON THE BUYER MENU TOO (`P2-J3-E588` WS-C) ──────

    ⚠ Scott, 2026-09-19, ruled the move for BOTH menus. ⚠⚠ The buyer menu now
    reads `Connect · Learn · Hire · Shop · Track Orders · Pay`.

    ⚠ SUPERSEDED, quoted not deleted (`E164`) — it sat LAST, after `Pay`, with
    these two notes attached:
    // ⚠ `My Community` (`P1-ALL-E372` WS-5). Scott: "'Community' sounds like a
    //   place you visit; 'My Community' sounds like something you have."
    // ⚠ `Connect` REPLACES `My Community` IN THE RAIL ONLY. The journey keeps
    //   its name on the page `<h1>`, which still reads `My Community`.
    ⚠⚠ BOTH NOTES ARE STILL TRUE AND STILL BIND: the `heading` below is
    `My Community`, and the page `<h1>` is unchanged by this brief.

    ⚠⚠ A BUYER HAS NO PROVIDER PROFILE, so `/community` renders the Connect
    LANDING for them, not a profile — see the fallback in
    `(app)/community/page.tsx`. ⚠ Putting `Connect` first on the buyer side is
    Scott's ruling and is deliberate even though the surface behind it differs.
  */
  /* ⚠⚠ `Connect` LANDS ON THE PROFILE NOW (`P2-J3-E591` WS-A). ⚠ Scott,
     2026-09-19: *"connect is now 'build your profile and connect to other
     profiles'."* ⚠⚠ AND IT FIXES A TITLE SCOTT SPOTTED: this entry headed the
     PROFILE page *"My Community"*, because one route rendered both.
     ⚠ SUPERSEDED, quoted not deleted (`E164`):
     //   { label: "Connect", heading: "My Community", href: "/community", icon: "MessagesSquare" },
     ⚠ `heading` IS READ BY `pageTitleFor`, WHICH HAS NO CALLER — it is the
     record of what the journey is called, not a rendered string. */
  { label: "Connect", heading: "My Profile", href: "/connect", icon: "MessagesSquare" },
  { label: "Learn", heading: "Learning Paths", href: "/learn", icon: "GraduationCap" },
  {
    /* ⚠ MIRRORED SLOT. `nav.ts` already documents why: the rails point the SAME
       WORD at DIFFERENT ROUTES. The nouns survived both sides because they were
       nouns — A VERB PICKS A SIDE, so the buyer hires and the provider works. */
    label: "Hire",
    heading: "Work Requests",
    /*
      ⚠⚠ `/hire`, NOT `/create-work` (`P1-J4-E392`). SUPERSEDED, QUOTED NOT
      DELETED: this read `href: "/create-work"`.

      ⚠ THE HREF WAS THE WIZARD BECAUSE THE LANDING DID NOT EXIST. `/hire` was a
      `ComingSoon` stub and nothing linked to it, so the rail pointed at the only
      built thing in the journey. That made the rail's Hire mean "start a new
      request", and a requester with three requests already had NOWHERE TO LOOK AT
      THEM — a second request made the first unreachable.

      ⚠ THE ROUTE IS NOT RENAMED AND NOTHING 404s. `/create-work` is untouched,
      still gated the same way, still the wizard, and is the FIRST TAB in the set
      below — one click from where the rail now lands. What changed is which of
      two existing pages the rail opens.
    */
    href: "/hire",
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
  /*
    ── ⚠⚠ THE CONTRACT DOCTRINE (`P1-ALL-E380`, 2026-09-04) ─────────────────

    ⚠ THIS BLOCK IS HERE BECAUSE THIS IS WHERE THE MISTAKE WAS MADE. `/contracts`
    was never a decision — it was a URL segment a placeholder got titled from
    (`9ae05d7`), and the rail beside it has said `Work Orders` the whole time.
    A word invented a record. Read this before adding one back.

    SCOTT, 2026-09-04: *"the work order is the SOW...which is a contract. In
    services, buyer and supplier have 2 contracts. Master Services Agreement
    (MSA) is buyer supplier across all providers — generic terms, arbitration,
    PII, confidentiality. The Statement of Work (SOW) is the per-resource
    definition of what is to be done, how long, how much is to be paid. FOR
    PANAMEER, the ToS must cover the MSA and the Work Order is the SOW."*

    And: *"remove contract. we will not have that."*

      services layer                              Panameer
      ------------------------------------------  --------------------------
      MSA  — across all engagements: arbitration,
             PII, confidentiality                 THE ToS
      SOW  — per engagement: what, how long,
             how much                             THE WORK ORDER

    ⚠⚠ THERE IS NO THIRD CONTRACT, SO THERE IS NO `Contract` MODEL, NO
    `/contracts` ROUTE AND NO CONTRACTS SCREEN.

    ⚠ THE ToS **IS** THE MSA. So there is no separate MSA record, no MSA signing
    flow and no MSA storage. Accepting the terms IS accepting the master
    agreement — which is why `User.tos_accepted_at` / `tos_version` and
    `Company.company_tos_accepted_by` / `_at` / `_version` are legally
    load-bearing rather than a formality. ⚠ `E380` VERIFIED THOSE AND REPORTED
    ON THEM; it changed none of them.

    ⚠ THE WORK ORDER **IS** THE SOW. Scope, duration and price are ITS FIELDS —
    not a separate document, not an attachment, not a generated PDF to be
    signed. When Work Orders are built, that is what they carry.

    ⚠⚠ AND `Contract` WAS A ROUTE NAME, NEVER A PRODUCT CONCEPT. Nobody may
    re-add it from a URL, a stale bookmark, a deck slide or an admin listing.

    ── ⚠⚠ DIRECT WORK ORDERS — THE ONE QUALIFICATION ────────────────────────

    SCOTT, 2026-09-04: *"It WILL be possible that a buyer can create a direct WO
    to bring a contract created outside Panameer into the application to use its
    functionality. They are called DIRECT WORK ORDERS."*

    ⚠ SO A WORK ORDER DOES NOT ALWAYS ORIGINATE HERE. The normal path is
    `Service Product -> Work Request -> proposal -> Work Order`. A Direct Work
    Order has no Panameer-side origin: the deal was struck elsewhere and brought
    in to use settlement, timesheets and the rest.

    ⚠⚠ WHICH QUALIFIES "THE ToS IS THE MSA":

                            originated here      DIRECT WORK ORDER
      MSA                   the ToS              ⚠ THE PARTIES' OWN, MADE
                                                   ELSEWHERE
      SOW                   the Work Order       ⚠ A **RECORD OF** A SOW THAT
                                                   EXISTS ELSEWHERE
      platform terms        the ToS              the ToS

    ⚠ THE SECOND ROW IS THE ONE THAT MATTERS: for a Direct Work Order the Work
    Order REPRESENTS the SOW rather than BEING it. If the two ever disagree,
    which one governs is A LAWYER'S QUESTION AND NOT A BUILD DECISION. `E380`
    flagged it and did not answer it.

    ⚠⚠ CONSEQUENCE FOR WHENEVER WORK ORDERS ARE BUILT, AND IT IS ONE FIELD: A
    WORK ORDER MUST KNOW ITS ORIGIN, because the platform can only make claims
    about what it can see. PANAMEER CAN ASSERT THE TERMS OF AN ORDER IT
    GENERATED; IT CAN ONLY RECORD THE EXISTENCE OF ONE IT DID NOT.

    ⚠⚠ THAT FIELD IS NOT BUILT AND MUST NOT BE ADDED HERE. Work Orders are still
    a stub, and a column on a table nobody has is the `E034` shape — a gate that
    cannot fire, sitting in the code looking implemented. THIS DOCTRINE SAYS THE
    FIELD IS COMING SO IT ARRIVES WITH THE MODEL RATHER THAN BEING RETROFITTED.
    IT DOES NOT CREATE ONE.

    ⚠⚠ SPENT 2026-09-07, QUOTED NOT DELETED — THE PARAGRAPH ABOVE IS SATISFIED,
    NOT CONTRADICTED. It was an instruction to `E380`, a NAV brief, and it asked
    for the field to arrive WITH the model. `P1-J4-E388` added
    `WorkOrder.origin WorkOrderOrigin (DIRECT | INDIRECT)` in the same commit
    that created `WorkOrder`, which is exactly what was asked. `P1-J4-E393` then
    renders it: `OriginBadge` marks DIRECT and the detail page says in words that
    Panameer RECORDS such an order rather than issuing it.
    ⚠ READ "MUST NOT BE ADDED HERE" AS "NOT IN THAT BRIEF." It is not a standing
    ban, and nobody should read it as one and remove the column.

    ⚠ THE REST OF THIS BLOCK IS LIVE AND `E393` OBEYS IT: the ToS is the MSA, the
    Work Order is the SOW, a DIRECT order REPRESENTS a SOW made elsewhere, and
    WHICH GOVERNS IF THEY DISAGREE IS STILL A LAWYER'S QUESTION THAT NO BRIEF HAS
    ANSWERED.

    ⚠ THE ToS TEXT IS OUT OF SCOPE. Whether it actually carries arbitration, PII
    and confidentiality as BUYER-TO-SUPPLIER terms rather than only
    user-to-platform terms is a lawyer's question. `E380` flagged it and edited
    no legal copy.
  */
  {
    /* ⚠⚠ A PLURAL NOUN, NOT A VERB, AND SCOTT DECIDED IT: *"yes. i get it. that
       works."* SUPERSEDED, QUOTED NOT DELETED — his draft read `Order | Settle`.
       As a bare verb `Order` reads as a command (order something) rather than as
       a place. The row loses all-verb symmetry and gains legibility. */
    /* ⚠⚠ `P1-ALL-E533` PART C — SCOTT, 2026-09-16, APPROVED AS PROPOSED.
       ⚠ SUPERSEDED, quoted not deleted (`E164`): `Orders` and `Payments`.
       ⚠⚠ THE BUYER IS NOT THE SELLER. A buyer is WATCHING something arrive,
       so `Track Orders`; a provider is working a queue, so the seller rail
       says `Manage Orders`. ⚠ AND `Get Paid` IS WRONG ON THIS SIDE — a buyer
       PAYS, so the verb is `Pay`.
       ⚠ THE BUYER URLs ARE UNTOUCHED: `/pay` and `/packages` are already
       nouns and already clean. ⚠⚠ THE `heading` VALUES ARE UNTOUCHED TOO —
       Scott ruled them not in conflict: the rail is a VERB (what you are
       about to do), the heading is a NOUN (what you are looking at). */
    label: "Track Orders",
    heading: "Work Orders",
    href: "/orders",
    icon: "ClipboardCheck",
    requires: "canHireTalent",
  },
  {
    /* ⚠⚠ THE SECOND PLURAL NOUN, SAME DECISION. `Settle` is the one label
       nobody arrives already understanding, in the ONE SECTION WHERE MONEY
       LIVES. ⚠ The href is `/pay` on this side and `/finances` on the
       provider's — mirrored routes, unchanged by this brief. */
    label: "Pay",
    heading: "Payments",
    href: "/pay",
    icon: "CreditCard",
    requires: "canHireTalent",
  },
  /* ⚠ `Connect` MOVED TO THE TOP OF THIS LIST (`P2-J3-E588` WS-C). Its entry
     and the reasoning are at the head of the array. */
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
  /* ⚠ `P1-ALL-E533` — rekeyed with the page; `/settings/packages` is now
     `/my-services`. This set exists to TITLE its destinations (`pageTitleFor`
     reads `Object.values(PAGE_TABS).flat()`), which is how `/services/offers`
     gets a page title; it is not rendered as a tab row. */
  "/my-services": [
    /* ⚠ `requires` ADDED (`P2-J1.1-E050`). `/settings/packages` narrowed to
       `canProvideServices`, and this tab declared nothing — which reads as
       "everyone signed in". ⚠⚠ THE SIBLING BELOW ALREADY CARRIED IT since
       `E046`; this one did not, because the ROUTE was still open then. Narrowing
       the route is what made it a live fourth layer, and `check:nav-reachable`
       caught it the same run. */
    { label: "Service Products", href: "/my-services", requires: "canProvideServices" },
    /* ⚠ `requires` ADDED (`P2-J1.1-E046` WS-4). `/services/offers` is gated
       `canProvideServices`, and this entry declared nothing — which reads as
       "everyone signed in". It was harmless only while `/settings/packages` was
       itself provider-only; opening that tree made it a live sixth instance of
       the offered-then-refused class. `check:nav-reachable` caught it. */
    { label: "Offers for My Services", href: "/services/offers", requires: "canProvideServices" },
  ],
  /*
    ⚠ THE HIRE JOURNEY'S TWO SLICES (`P1-J4-E392`). MODE `none` — no numbers.

    ⚠⚠ THESE ARE SLICES, NOT STEPS, WHICH IS WHY THEY ARE UNNUMBERED. `E378`:
    *a PUBLIC SPINE CROSSES ROLES AND PAGES; A TAB SET IS SLICES WITHIN ONE PAGE
    FOR ONE ROLE — where they disagree the set is `none`.* Listing your requests
    and writing a new one are not step 1 and step 2 of anything: most visits are
    the first and only some are the second.

    ⚠ BOTH DECLARE `requires`. `/hire` is gated `canHireTalent` in
    `ROUTE_ACCESS`, so the tab must say the same or `check:nav-reachable` reads
    it as "everyone signed in" — the sixth and seventh instances of the
    offered-then-refused class were caught exactly this way, including a set
    whose FIRST tab was the one missing it.
  */
  "/hire": [
    { label: "Work Requests", href: "/hire", requires: "canHireTalent" },
    { label: "Create a Request", href: "/create-work", requires: "canHireTalent" },
  ],
  "/payments": [
    { label: "Payments", href: "/payments" },
    { label: "Payment Requests", href: "/payments/payment-requests" },
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
  /*
    ⚠⚠ CONNECT IS A ROOM, NOT A PATH (`P2-J3-E557` WS-A). The numbers are gone,
    the row is labelled `CONNECT`, and `Home` is the landing. ⚠ The superseded
    `E378`/`E379` sequence reasoning is FOOTNOTED BELOW THIS SET, not above it.
  */
  /*
    ── ⚠⚠ THE KEY IS `/connect`, AND IT MOVED WITH THE FRONT DOOR (`E591` WS-A)

    ⚠⚠⚠ THE KEY NAMES THE APPLICATION, NOT A PAGE. `E591` split one route into
    two — the PROFILE is `/connect`, the PEOPLE are `/community` — and the band
    entry now points at `/connect`, so a row keyed `/community` would have named
    a SECTION of Connect as the owner of Connect's own tab row.
    ⚠ SUPERSEDED, quoted not deleted (`E164`) — the key and the Home tab as
    `E557` WS-A left them, when `/community` was the landing:
    //   "/community": [
    //     { label: "Home", href: "/community" },

    ⚠⚠ THE KEY IS A LOOKUP TOKEN, NEVER MATCHED AGAINST A URL. `PageTabs` picks
    the active tab from its own `current` prop against `t.match ?? t.href`, and
    `check:nav-reachable` uses the key only as a label in its output. ⚠ It is
    spelled as a route because every other key is, and because the route it
    names is the one the band lands on.
    ⚠⚠⚠ `PAGE_TABS` IS A `Record<string, …>`, SO A MISSED CALL SITE RETURNS
    `undefined` RATHER THAN FAILING TO COMPILE. All eight were changed together;
    `check:nav-reachable` and `check:community` are what hold it.

    ── ⚠ `Community` IS A NEW TAB, AND WS-A COULD NOT SHIP WITHOUT IT ─────────

    ⚠⚠ `Home` FOLLOWED THE PROFILE TO `/connect`, WHICH WOULD HAVE LEFT THE
    COMMUNITY PAGE WITH NO DOOR IN THE NAV AT ALL. ⚠ A route split is complete
    only when both halves are reachable; the alternative was shipping a page
    reachable solely from an empty-state link in `/messages`.
    ⚠ ONE WORD FOR PEOPLE: `Community`. `Network` is not a second name for it
    (`E591` WS-A item 6) — and it never was in live code: the eight surviving
    occurrences are *"Network error"*, `Oracle Business Network` (a real Oracle
    product) and privacy-policy text. ⚠ Nothing was retired because nothing had
    drifted.
    ⚠⚠ `Colleagues` IS UNCHANGED AND DELIBERATELY SO — it already pointed at
    `/community/colleagues`.
  */
  /*
    ── ⚠⚠ FIVE TABS (`P2-J3-E593` WS-A) ─────────────────────────────────────

    ⚠ SCOTT, 2026-09-20: *"less tabs…simple. simple is easier to use."*
    ⚠⚠ THE ROW'S LOGIC IS HIS: `Profile` (who you are) · `Community` (who you
    know — FREE) · `Groups` (money) · `Service Products` (money) · `Settings`.
    ⚠ THE TWO REVENUE TABS ARE ADJACENT, so the earning surfaces read as a pair.

    ⚠ SUPERSEDED, quoted not deleted (`E164`) — the six as `E591` WS-A left them:
    //   { label: "Home", href: "/connect" },
    //   { label: "Community", href: "/community" },
    //   { label: "Colleagues", href: "/community/colleagues" },
    //   { label: "Forums", href: "/community/forums", state: "live" },
    //   { label: "Mentoring", href: "/community/mentors", state: "early" },
    //   { label: "Teams", href: "/community/teams", state: "live" },

    ⚠⚠⚠ THREE TABS WENT AND NOT ONE PAGE DID. `/community/colleagues`,
    `/community/mentors` and `/community/teams` all still resolve; `/community`
    absorbed them as SECTIONS and links to each. ⚠ `check:nav-reachable` is the
    gate, and the Community page's links are what make the folding honest —
    ⚠⚠ two of them were MISSING and are fixed in the same commit (`CommunityRail`).

    ⚠ `Groups` IS A LABEL OVER THE EXISTING FORUMS ROUTE. No redirect, no link
    rewrite — `forums` is already a noun, so `E533` does not force the URL to
    move. ⚠⚠ THE PAID HALF OF GROUPS DOES NOT EXIST (`/community/forums` is the
    free forum-per-learning-path of `E383`). The tab names the surface; the
    money in it is unbuilt, and that is the right order — name it, then build
    into it. ⚠ DO NOT FABRICATE A PAID STATE.
  */
  "/connect": [
    { label: "Profile", href: "/connect" },
    { label: "Community", href: "/community" },
    { label: "Groups", href: "/community/forums", state: "live" },
    /*
      ── ⚠⚠⚠ `Service Products` IS PROVIDER-ONLY TODAY, AND THAT IS MEASURED ──

      ⚠ Scott's reason for the tab is that *"it is where a BUYER goes"*, so the
      buyer half is wanted. ⚠⚠ MEASURED 2026-09-20 AT THE PREMISE GATE: **no
      buyer-facing surface LISTS a service product.** `/services` 308s to
      `/shop`; `/shop` is the PUBLIC marketing section (`ErpPackages`) and
      `check:ui` §65 asserts its CTA is `aria-disabled` with no href because
      *"there is no public catalogue"*; `/search` is a rail stub (`E134`); and
      ⚠ **`/packages` — the buyer-gated route the requester rail already names —
      is a 17-line `ComingSoon`.**
      ⚠⚠ SO THE BUYER HALF IS UNBUILT, EXACTLY LIKE THE PAID HALF OF GROUPS.
      ⚠ It is pointed at the provider's management surface and carries the
      capability that surface demands. ⚠⚠⚠ THE ONE-LINE OVERRIDE, IF SCOTT WANTS
      THE BUYER DOOR NOW, IS A SECOND ENTRY AT `/packages` WITH
      `requires: "canHireTalent"` — the route, its title and its gate are all
      real already; only its content is pending.

      ⚠⚠ `requires` IS LOAD-BEARING HERE, NOT DECORATION: `check:nav-reachable`
      §1 fails if an item's declared capability does not match its route's, and
      `connect-tabs.ts` reads this field to decide who is shown the tab at all.
    */
    { label: "Service Products", href: "/my-services", requires: "canProvideServices" },
    /* ⚠ `/settings` POINTS AT `/settings` FOR NOW. Scott ruled that Settings is
       ABSORBED into Connect — it renders inside, the row persists, `/settings`
       redirects in — but that is its own id and is far too large to ride here. */
    { label: "Settings", href: "/settings" },
    /*
      ── ⚠⚠ MESSAGES HAS LEFT THIS ROW (`P2-ALL-E560` STAGE 1, 2026-09-18) ─────

      ⚠ SUPERSEDED, quoted not deleted (`E164`) — the interim `E557` left here,
      and the promise it made:
      // MESSAGES IS LAST, AND ONLY UNTIL `E560` (`P2-J3-E557` WS-A). It leaves
      // this row entirely when Messages becomes its own application. The brief
      // is explicit that it stays until then: "Do not leave the row in a state
      // where messages are unreachable." It was step 1; it is now last and
      // unnumbered, which is the honest interim.
      // { label: "Messages", href: "/messages" },

      ⚠⚠ THE PROMISE IS KEPT, NOT BROKEN: messages are still reachable, from the
      BAND'S UTILITY CLUSTER beside the notification bell. ⚠ SCOTT, 2026-09-18:
      *"make it like linkedin. in notification bell...icon...and it opens on the
      right."*
      ⚠ THE RULE THIS EXPRESSES: the band holds places you GO; the cluster holds
      things you CHECK.

      ⚠⚠ A STRAIGHT REMOVAL — THERE WAS NO `n:` TO UNPICK. `E557` already ruled
      that `/community`'s set carries NO `n:` values at all, so nothing renumbers
      and no other tab moves.
      ⚠ `/messages` THE ROUTE IS UNTOUCHED and still resolves; `route-access.ts`
      and `proxy.ts` are unchanged and still paired.
    */
  ],
  /*
    ── ⚠⚠ THE `n` VALUES ARE GONE, NOT JUST UNRENDERED (`P2-J3-E557` WS-A) ────

    ⚠ `tabSequenceFor("/community")` is now `none`, so `PageTabs` would never
    render a number anyway. ⚠⚠ THEY ARE REMOVED BECAUSE LEAVING THEM WOULD BE
    STALE DATA WAITING TO BE RE-ENABLED: `Messages` carried `n: 1` and now sits
    LAST, so the number and the position would contradict each other the moment
    anybody flipped the mode back.
    ⚠ SUPERSEDED, QUOTED NOT DELETED (`E164`) — the numbered set as `E379` left it:

        { n: 1, label: "Messages", href: "/messages" },
        { n: 2, label: "Colleagues", href: "/community" },
        { n: 3, label: "Forums", href: "/community/forums", state: "live" },
        { n: 4, label: "Mentoring", href: "/community/mentors", state: "early" },
        { n: 5, label: "Teams", href: "/community/teams", state: "live" },

    ⚠ `Colleagues` MOVED FROM `/community` TO `/community/colleagues`, because
    `/community` is now Home. ⚠⚠ THE `EARLY` PILL ON MENTORING STAYS — it states
    READINESS, not order, and removing numbers is not removing honesty markers.

    ── ⚠ THE FOOTNOTE: THE `E378`/`E379` SEQUENCE BLOCK, SUPERSEDED (`E164`) ───

    ⚠ It sat ABOVE this set until `E557`. It is kept because it records WHY the
    numbers were right at the time, which is the part a future reader needs
    before proposing them again:

        ⚠⚠ MESSAGES IS STEP 1 AS OF `P1-ALL-E379`, AND THIS IS THE FLIP `E378`
        WAS WAITING FOR. SCOTT'S ORDER, 2026-09-04: *"1. Check Your Messages.
        2. Search for Colleagues. 3. Check Out Our Forums. 4. Search for a
        Mentor."*
        ⚠ SUPERSEDED, QUOTED NOT DELETED — `E378` shipped this entry LAST and
        UNNUMBERED with the note *"⚠ NO `n` — see the block above"*, because
        there was no `Message` model and a suggested sequence whose step 1 is a
        dead end teaches people the numbers are decorative. `E379` built the
        model, so the dead end is gone and the number is honest.
        ⚠ THE `early` PILL GOES WITH IT. Messaging is real now; a readiness pill
        on a working feature is the same lie in the other direction.

    ⚠⚠ WHAT CHANGED IS NOT THAT THE ORDER WAS WRONG — it is that a tab row is a
    ROOM a member re-enters, and a numbered room teaches people they are walking
    a path they have already finished.
  */
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

  ⚠⚠ SUPERSEDED 2026-09-04 (`P1-ALL-E381` WS-3), QUOTED NOT DELETED. THIS
  PARAGRAPH USED TO OPEN: *"⚠ THIS ALSO MOVES PAGE HEADINGS, and that is intended
  — `pageTitleFor` derives every heading from these definitions."*

  ⚠⚠ THAT WAS TRUE WHEN WRITTEN AND IS FALSE NOW: `pageTitleFor` HAS NO CALLER.
  Re-verified at `E381` across `src`, `scripts` and `e2e` — every page renders its
  own `<h1>`. So relabelling the rail moves NO heading, and anyone reading the old
  sentence would have believed a rename here changed page titles for free.

  ⚠ A STALE COMMENT IS HOW THE NEXT BRIEF GETS WRITTEN ON A WRONG PREMISE, and
  this project has the receipt: `E378`'s brief asserted the active tab was
  signalled by *"COLOUR ALONE"* when the component had carried a 2px underline all
  along. That premise came from exactly this failure mode.

  ⚠ THE REST OF THE PARAGRAPH STILL HOLDS, so it is corrected rather than
  removed: `pageTitleFor`'s lookup list spreads `PROVIDER_NAV` but NOT
  `REQUESTER_NAV`, so IF IT WERE CALLED a buyer on `/learn` would read
  "Learning Paths" from `heading` rather than the rail's one-word `Learn`. Same
  for `/orders` -> "Work Orders".
  ⚠ THAT ROUTE WAS `/contracts` UNTIL `P1-ALL-E380`. ⚠ NOT ON `E380`'s
  REFERENCE LIST EITHER — found by grepping rather than trusting the brief.
*/
export const PROVIDER_NAV: NavItem[] = [
  /*
    ── ⚠⚠⚠ `Connect` IS FIRST (`P2-J3-E588` WS-C, SCOTT 2026-09-19) ──────────

    ⚠⚠ IT MOVED FROM LAST TO FIRST ON BOTH MENUS. Scott, 2026-09-19: *"connect
    is now 'build your profile and connect to other profiles'."* ⚠ Connect
    stopped being a place you visit after the work and became the thing the
    work hangs off — `/community` IS the provider's profile as of WS-A, so the
    first icon in the band is now "you", and everything after it is what you do.

    ⚠⚠⚠ THIS CHANGES EVERY LOGGED-IN PAGE. One `AppBand` serves `(app)/**`,
    `/admin/**` and signed-in `/learn`, and the band reads these arrays in
    order.

    ⚠ SUPERSEDED, quoted not deleted (`E164`) — it sat LAST, after `Get Paid`
    on the seller side and after `Pay` on the buyer side:
    // { label: "Connect", heading: "My Community", href: "/community", icon: "MessagesSquare" },

    ⚠ THE ENTRY ITSELF IS BYTE-IDENTICAL — same label, same heading, same href,
    same icon. ONLY ITS POSITION MOVED. ⚠⚠ `railPersona()` IS UNTOUCHED
    (`E491`): it returns `PANAMEER`/`SELLER`/`BUYER`, which are VALUES the band
    branches on, never labels, and reordering a menu cannot reach it.
    ⚠ The Connect TAB ROW is unchanged — `Home · Colleagues · Forums ·
    Mentoring (early) · Teams`, with `Home` active on `/community`.
  */
  /* ⚠⚠ `Connect` LANDS ON THE PROFILE NOW (`P2-J3-E591` WS-A). ⚠ Scott,
     2026-09-19: *"connect is now 'build your profile and connect to other
     profiles'."* ⚠⚠ AND IT FIXES A TITLE SCOTT SPOTTED: this entry headed the
     PROFILE page *"My Community"*, because one route rendered both.
     ⚠ SUPERSEDED, quoted not deleted (`E164`):
     //   { label: "Connect", heading: "My Community", href: "/community", icon: "MessagesSquare" },
     ⚠ `heading` IS READ BY `pageTitleFor`, WHICH HAS NO CALLER — it is the
     record of what the journey is called, not a rendered string. */
  { label: "Connect", heading: "My Profile", href: "/connect", icon: "MessagesSquare" },
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
    href: "/my-services",
    icon: "Tag",
    requires: "canProvideServices",
  },
  /* ⚠⚠ `P1-ALL-E533` PART B — EVERY RAIL ITEM IS A VERB PHRASE. Scott,
     2026-09-16: *"These are all verbs. Should read Manage Orders and Get
     Paid."* ⚠ SUPERSEDED, quoted not deleted (`E164`): `Orders` and
     `Payments`.
     ⚠⚠ `Get Paid` IS THE POINT OF THE RULE — it names the OUTCOME a provider
     wants, not the screen it lives on.
     ⚠ MIXED LENGTHS ARE FINE AND DELIBERATE: the consistency asked for is
     GRAMMATICAL, not character count. Do NOT shorten `Manage Orders` to make
     the rail even.
     ⚠⚠ `Learn` AND `Work` ARE NOT TOUCHED — the verb and the noun are the
     same word and Scott ruled them exceptions.
     ⚠ THE `heading` VALUES ARE UNCHANGED ON PURPOSE. They now disagree with
     their labels (`Manage Orders` -> `Work Orders`, `Get Paid` -> `Payments`)
     and that is REPORTED for Scott to name, not fixed here. */
  /* ⚠⚠ `P2-ALL-E559` WS-A — SCOTT, 2026-09-17. ⚠ SUPERSEDED, quoted not
     deleted (`E164`): `{ label: "Manage Orders", … }`.
     ⚠ THIS NARROWS `E533` PART B ON THIS ONE ITEM ONLY. That rule was *"every
     rail item is a verb phrase"*; the band puts a LABEL UNDER AN ICON, where a
     two-word verb phrase is the widest thing in the row. ⚠⚠ Rule 13 — Scott's
     newer word wins, and `E533`'s reasoning is kept because it still governs
     every item this brief did not name. ⚠ THE BUYER SIDE IS UNTOUCHED: it still
     reads `Track Orders`, because a buyer WATCHES and a provider WORKS a queue. */
  { label: "Orders", heading: "Work Orders", href: "/orders", icon: "ClipboardCheck" },
  /*
    ── ⚠⚠⚠ `Get Paid` IS RETAINED, AND THAT IS A DEPARTURE FROM THE BRIEF ──────

    WS-A 3 says to REMOVE it — *"I will make payments available from orders"* —
    with an explicit precondition: *"Removing the entry must leave `/payments`
    reachable from Orders, or payments become unreachable."*

    ⚠⚠ MEASURED 2026-09-18, AND THE PRECONDITION IS NOT MET:
      · `/orders` has NO `PAGE_TABS` entry at all — there is no tab row on it.
      · No orders page links `/payments`. The only match under
        `app/(app)/orders/` is the WORD "payments" inside prose.
      · `/payments`' other doors are `attention.ts` (conditional — it only
        surfaces when something needs attention), a back-link from INSIDE
        payments, and the legacy `/finances` 308.
    ⚠ So removing this entry buries a provider's money surface behind a
    conditional notification — the same shape as `E559`'s own `/recommendations`
    finding, which Scott ruled on the same day: KEEP THE ENTRY UNTIL THE DOOR
    EXISTS.

    ⚠⚠ REPORTED AT THE WS-A GATE, NOT DECIDED HERE. Building the Orders→payments
    door is an Orders-surface change this brief does not scope. ⚠ One line to
    remove once that door exists.
  */
  { label: "Get Paid", heading: "Payments", href: "/payments", icon: "Wallet" },
  /* ⚠ `Connect` MOVED TO THE TOP OF THIS LIST (`P2-J3-E588` WS-C). Its entry
     and the reasoning are at the head of the array. */
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
/*
  ── ⚠⚠⚠ REGROUPED FOR THE AVATAR MENU (`P2-A2-E598` WS-A, option B) ────────

  ⚠ SCOTT, on the option-B mockup: *"Yeah...that is much better. It belongs back
  there."* The profile moves under the avatar like LinkedIn's "Me", and the menu
  becomes the door to the surfaces that describe YOU rather than a flat list.

  ⚠⚠ `My Profile` LEFT THIS LIST AND BECAME THE HEADER'S `View Profile` BUTTON,
  beside your photo, name and title — it is the menu's subject, not one of its
  errands. ⚠ SUPERSEDED, quoted not deleted (`E164`):
  //   { label: "My Profile", href: "/profile" },

  ⚠⚠ THE `My ` PREFIXES ARE GONE, WHICH REVERSES PART OF `P2-ALL-E559` WS-D.
  ⚠ SUPERSEDED, quoted not deleted (`E164`):
  //   { label: "My Stats", href: "/stats" },
  //   { label: "My Account", href: "/account-health" },
  //   { label: "My Settings", href: "/settings" },
  ⚠⚠⚠ RULE 13, NOT DRIFT: `E559` renamed these on 2026-09-17/18; the option-B
  mockup and its brief are 2026-09-21 and name them `Usage Stats`, `Account
  Health` and `Settings`. The newest dated statement from Scott is the live one.
  ⚠ THE ROUTES ARE UNCHANGED in every case — this is a rename, exactly as
  `E559`'s own was.

  ⚠⚠ `Grow Your Network` IS SPECIFIED AND IS **NOT** HERE. The brief's premise
  said Score, Network and Stats *"already have pages"*. ⚠⚠⚠ MEASURED AT THE
  PREMISE CHECK AND THAT IS FALSE FOR NETWORK: `/grow` and `/community/grow`
  both 404, and the string `Grow Your Network` appears NOWHERE in `src/`.
  ⚠ Scott ruled it omitted until a page exists rather than pointed at a
  near-miss — WS-A's own rule is that every item goes somewhere that exists.
*/
export const PERSONA_NAV_PRIMARY: NavItem[] = [
  /* ⚠ `/community/score` — shipped by `P2-J3-E590` WS-B. The menu shows the
     percentage beside it, fetched when the menu OPENS (see
     `/api/me/menu-summary`), never on every page render. */
  { label: "Profile Score", href: "/community/score" },
  { label: "Usage Stats", href: "/stats" },
];

export const PERSONA_NAV_SECONDARY: NavItem[] = [
  /*
    ── ⚠⚠ `Request Recommendations` STAYS (`P2-ALL-E559` WS-D, ruling 2026-09-18)

    The brief said to remove it alongside `Invite a Colleague` — *"these are now
    options within the CONNECT application"*. ⚠⚠ MEASURED AT THE PREMISE CHECK,
    AND IT IS NOT TRUE OF THIS ONE: `E558` gave the ACTION a home on Connect
    (`ColleagueRowActions.tsx` POSTs to `/api/recommendations` inline) but it
    NEVER LINKS THE `/recommendations` PAGE.
    ⚠ Every inbound link to that page, measured: THIS ENTRY, and
    `ProviderProfileView.tsx` — which is doubly conditional on
    `testimonials.length === 0` AND `p.isOwner`, so ⚠⚠ IT CLOSES ITSELF the
    moment a provider receives their first recommendation.
    ⚠⚠⚠ REMOVING THIS ENTRY WOULD ORPHAN THE PAGE FOR EVERY PROVIDER WHO ALREADY
    HAS A RECOMMENDATION — this brief's own named failure: *"a feature whose only
    door is closed is how `E493`'s invite and `E519`'s résumé re-run got buried."*
    ⚠ SO THE MENU HAS SEVEN ITEMS, NOT THE SIX THE BRIEF SPECIFIES. Deliberate,
    and reversible in ONE LINE once something on Connect links the page.
    ⚠ DO NOT ADD THAT LINK HERE — Connect surfaces are `E557`/`E558`.
  */
  { label: "Request Recommendations", href: "/recommendations" },
  /*
    ── ⚠ `Invite a Colleague` REMOVED (`P2-ALL-E559` WS-D) ─────────────────────

    ⚠ SUPERSEDED, quoted not deleted (`E164`):
    // `P2-J3-E493` - DIRECTLY UNDER Request Recommendations, where Scott put it:
    //   "This would be under the request recommendation option on the Setting menu."
    // THE TWO ASKS ARE DIFFERENT AND THE ADJACENCY IS THE POINT - one asks
    // somebody to VOUCH for you, the other asks them to JOIN. Sitting together is
    // what makes the difference legible.
    // { label: "Invite a Colleague", href: "/invite-colleague" },

    ⚠⚠ THE ROUTE STAYS LIVE; ONLY THE MENU ENTRY GOES. ⚠ VERIFIED BEFORE
    REMOVING, which is the whole reason `Request Recommendations` above did NOT
    go: `/community/colleagues` carries a STANDING right-rail card linking
    `/invite-colleague` — ⚠ no capability gate on the page, no conditional
    wrapper around the card, same route. `E558` even left a comment there saying
    this removal is `E559` WS-D.
    ⚠ THE `E493` ADJACENCY ARGUMENT IS WHAT IS LOST, and it was real. The two
    asks now live in different places: vouching here, inviting on Connect.
  */
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
  /* ⚠ `P2-ALL-E559` WS-D — SCOTT, 2026-09-17. ⚠ SUPERSEDED, quoted not deleted
     (`E164`): `{ label: "Settings", href: "/settings" }`. ⚠⚠ A RENAME ONLY —
     the route is unchanged, and `settings-nav.ts` (the `/settings` SUB-NAV) is a
     DIFFERENT list and is not in scope. */
  { label: "Settings", href: "/settings" },
  /* ⚠⚠ MOVED DOWN FROM `PERSONA_NAV_PRIMARY` (`P2-A2-E598` WS-A) — option B
     groups it with Settings and Help, because all three are about the ACCOUNT
     rather than about how you are doing. ⚠ The route is unchanged. */
  { label: "Account Health", href: "/account-health" },
  /*
    ── ⚠⚠⚠ `Help` POINTS AT `/support/tickets`, AND THAT IS A RULING ─────────

    ⚠ MEASURED AT THE PREMISE CHECK: there is NO `/help` route and NO `/support`
    index — both 404. The only live pages under support are `/support/bug` and
    `/support/tickets`.
    ⚠⚠ Scott ruled it points at `/support/tickets` rather than a new page being
    built inside a menu brief. ⚠⚠⚠ IT IS THE NEAREST THING THAT EXISTS, NOT THE
    right long-run answer — a real help surface would list "Report a Bug"
    alongside "My Tickets", and `/support/bug` currently has no menu door at all.
  */
  { label: "Help", href: "/support/tickets" },
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
 * Settlements, Payments — because those are separate records with separate
 * states, and a single "Work" page could only ever have shown one of them.
 *
 * ⚠ SUPERSEDED 2026-09-04 (`P1-ALL-E380`), QUOTED NOT DELETED: that list read
 * *"Work Requests, Work Orders, Work Packages, **Contracts**, Settlements,
 * Payments"*. THE CLAIM THAT THEY ARE SEPARATE RECORDS STAYS TRUE — only the
 * name goes, because there is no `Contract` record to be one of them. The ToS
 * is the MSA and the Work Order is the SOW; see the doctrine beside the
 * `Orders` slot above.
 *
 * ⚠⚠ AND THE `/admin/contracts` ENTRY BELOW WAS DELIBERATELY **NOT** RENAMED —
 * `E380` STOPPED AND REPORTED INSTEAD. `/admin/work-orders` ALREADY EXISTS,
 * with the label `Work Orders`, as its own nav entry and its own route
 * directory. Renaming this one to match would have shipped TWO ADMIN ENTRIES
 * WITH THE SAME LABEL pointing at different routes — a worse defect than the
 * one being fixed. ⚠ THE DOCTRINE IMPLIES THIS ENTRY SHOULD BE **REMOVED**
 * RATHER THAN RENAMED, since there is no `Contract` record for an admin screen
 * to list and `/admin/work-orders` already lists the real thing — but removing
 * an admin surface is Scott's call and he has not made it. See the `E380`
 * report.
 * ⚠ ITS `ADMIN_PAGES` KEY AND `SpecPage` SLUG ARE `"contracts"` AND MUST STAY:
 * the slug is not a URL, it keys a spec generated from the 2.5 deck slides, and
 * renaming it would blank the page rather than relabel it. Buyers/Sellers moves to Configuration Data: it is a directory of who
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
      /*
        ── ⚠⚠ THE LABEL IS "Users"; THE ROUTE STAYS (`P1-A1.5-E454`) ───────────

        **SCOTT:** *"change Buyers/Sellers to Users."*

        ⚠ THE HREF IS DELIBERATELY UNCHANGED. Renaming `/admin/buyers-sellers`
        would touch the nav map, `route-access.ts`, the trend sub-page's links and
        `check:nav-reachable` (73 assertions) for no visible gain — the URL is not
        on screen. ⚠ RECORDED AS A DECISION, not an oversight.
        ⚠ AND THIS ONE LINE RENAMES THREE THINGS, because `pageTitleFor` reads
        this label: the rail item, the page name top-left (`E430` WS-1), and the
        browser tab.
      */
      { label: "Users", href: "/admin/buyers-sellers", icon: "ArrowLeftRight" },
      { label: "Roles>Domains>Skills", href: "/admin/skill-catalog", icon: "FolderTree" },
      { label: "Specializations", href: "/admin/specializations", icon: "Award" },
      /*
        ── ⚠⚠ THE INDUSTRIES PAGE FOLDS INTO SPECIALIZATIONS (`P1-A1.5-E470d`) ─

        **SCOTT, 2026-09-12:** *"Now I am confused...why is there a separate page
        for industries?"* **AND 2026-09-13:** *"On industries, that content is a
        specialization...it should be managed on the specialization page."*

        ⚠ SUPERSEDED, quoted not deleted (`E164`):
        `{ label: "Industries", href: "/admin/industries", icon: "Building2" }`

        ⚠⚠ THE OLD PAGE ANSWERED HIM IN ITS OWN COPY, ON SCREEN: *"Industries are
        a KIND of Specialization in this schema, not a separate dimension — so
        this reads the same table, filtered."* Same table, same ten rows;
        `industries/page.tsx:21` was literally
        `groups.find((g) => g.kind === "INDUSTRY")?.items ?? []`.
        ⚠ IT WAS NOT A DESIGN DECISION THAT WAS MADE — it is a deck slide that
        became a route, because `SpecPage` renders fourteen slides from one spec.

        ⚠ THE RAIL ITEM, ITS LABEL AND ITS ICON ALL STAY. Scott uses it as a
        shortcut and it costs nothing; what was wrong was the second PAGE, not
        the second ENTRY.
        ⚠ VERIFIED BEFORE REPOINTING, per the brief's hard precondition: the
        drill-in returns 10 rows under the heading `Industries (10)`.
        ⚠ `check:nav-reachable` strips the query string before resolving access
        (`check-nav-reachable.ts:68`), so this resolves to `/admin/specializations`
        — already admin-gated. No assertion was touched.
      */
      /*
        ── ⚠⚠ AND NOW THE RAIL ITEM IS GONE TOO (`P1-A1.5-E476`) ──────────────

        > **SCOTT, 2026-09-13, twice in one evening:** *"industries points to
        > specializations"* · *"confused to see industries by itself"*

        ⚠ SUPERSEDED, quoted not deleted (`E164`) — BOTH the entry and `E470d`'s
        reasoning for keeping it:
          { label: "Industries", href: "/admin/specializations?kind=INDUSTRY",
            icon: "Building2" },
          *"KEEP the rail item, its label and its icon. Scott uses it as a
           shortcut and it costs nothing; what was wrong was the second PAGE,
           not the second ENTRY."*

        ⚠⚠ IT DID NOT COST NOTHING. Clicking Industries lit up SPECIALIZATIONS,
        because `isActive` (`AppRail.tsx:118`) reads `pathname` and nothing else
        — two rail items sharing one path are indistinguishable and the first
        one wins.

        ⚠⚠ `isActive` IS DELIBERATELY NOT TOUCHED. Making it query-aware would
        put new shared logic on the one function EVERY item in BOTH nav trees
        depends on, to preserve a shortcut that is actively confusing. ⚠ DELETING
        THE DUPLICATE REMOVES THE BUG CLASS: with one item per path the existing
        function is correct again and needs no change at all.

        ⚠ `/admin/specializations?kind=INDUSTRY` STAYS AND STILL WORKS — it is
        reached from the Industries TILE on the Specializations page, which is
        the natural route. ⚠ `src/app/admin/_industries/page.tsx` stays unrouted
        on disk (`E470d` settled that; `E164` is a house rule).
      */
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
  /*
    ── ⚠⚠ EVERY SET IS CLASSIFIED, AND `check:community` NOW ENFORCES THAT
       (`P1-ALL-E384` WS-3) ──────────────────────────────────────────────────

    SCOTT, 2026-09-04: *"we could define each menu sequential or parallel, then
    number the sequential only."*

    ⚠ THAT IS WHAT THIS MAP ALREADY DOES — `process` and `suggested` are
    numbered, `none` is not. ⚠ AND `E384`'s BRIEF SAID ONLY ONE SET WAS
    CLASSIFIED; THAT WAS WRONG. `E378` classified all four, and all four are
    below. What was genuinely missing is that NOTHING STOPPED A FIFTH SET
    APPEARING WITHOUT A MODE and silently defaulting to `none` — a set that is
    unnumbered because nobody decided, wearing the same face as one that is
    unnumbered because somebody did. `check:community` now fails the build if a
    `PAGE_TABS` key has no entry here.

    ── ⚠⚠ THE RULE THAT DECIDES SEQUENTIAL vs PARALLEL, IN SCOTT'S WORDS ─────

    SCOTT, 2026-09-04: *"the sequence won't necessarily match the public pages,
    due to steps crossing roles on the public page but being role-based
    internally."*

    ⚠ HE IS RIGHT, AND IT IS ALREADY WHY `/learn` IS `none`. A PUBLIC SPINE IS A
    JOURNEY ACROSS ROLES AND PAGES; A TAB SET IS SLICES WITHIN ONE PAGE FOR ONE
    ROLE. `LEARN_STEPS` 2 (`Connect with the Instructor`) and 5 (`Get Expert
    Support`) happen in COMMUNITY, not on a `/learn` tab — so numbering the three
    `/learn` tabs 1·3·4 renders gaps, and renumbering them 1·2·3 contradicts the
    public promise those numbers come from.
    ⚠⚠ SO THEY ARE NOT FORCED TO AGREE. Where a spine and a tab set disagree,
    THE SET IS `none` AND THAT IS REPORTED — it is not a mapping waiting to be
    finished.

    ⚠ `process` IS KEPT EVEN THOUGH NOTHING USES IT. Scott said keep it. It is
    built and asserted, and the first set that genuinely has a REQUIRED order
    declares it in one line.
  */
  /*
    ⚠⚠ `none` AS OF `P2-J3-E557` WS-A. Scott has asked for the numbers off this
    row repeatedly. ⚠ CONNECT IS A ROOM A MEMBER RE-ENTERS, NOT A PATH THEY WALK
    ONCE — and a numbered row tells somebody on their fortieth visit that they
    are partway through something.
    ⚠ THE `EARLY` PILL ON MENTORING IS UNAFFECTED and is meant to be: `state`
    lives on the tab, not on the sequence, so readiness survives the numbers
    going. Removing numbers is not removing honesty markers.
  */
  /* ⚠ RE-KEYED `/community` → `/connect` WITH `PAGE_TABS` (`E591` WS-A). ⚠ The
     CLASSIFICATION IS UNCHANGED — Connect is still a room, not a path. ⚠
     SUPERSEDED, quoted not deleted (`E164`):
     //   "/community": "none", */
  "/connect": "none",
  /*
    ── ⚠ FOOTNOTE: THE SUPERSEDED `/community` CLASSIFICATION (`E164`) ─────────

    ⚠ SUPERSEDED, QUOTED NOT DELETED — the live entry read:

        "/community": "suggested",

    ⚠⚠ AND IT WAS NOT WRONG WHEN IT WAS WRITTEN. `E378`/`E379` classified this
    set `suggested` on Scott's own stated order, and `E384` then made every set
    declare a mode so none could default silently. ⚠ THE CLASSIFICATION MACHINERY
    IS UNTOUCHED BY `E557`; only THIS set's answer changed.
    ⚠ `process` and `suggested` both still exist and are still asserted — see the
    block above. `check:community` still fails the build for any `PAGE_TABS` key
    that declares no mode at all.
  */
  /* ⚠ ALL THREE ARE `none` BY EVIDENCE, NOT BY DEFAULT.
     · `/learn`             — 3 tabs against a 5-step spine, 2 of which are
                              Community's. See the mapping above.
     · `/settings/packages` — 2 tabs (Service Products · Offers for My Services).
                              Parallel slices of one page: a provider reads their
                              catalogue and their inbound offers in either order,
                              and neither completes.
     · `/finances`          — 2 tabs (Payments · Payment Requests). Also
                              parallel, and deliberately NOT numbered even though
                              SHOP_STEPS 4 and 5 look sequential: those two steps
                              cross BOTH roles — the buyer approves and the
                              provider is paid — which is exactly the
                              role-crossing Scott named. */
  "/learn": "none",
  "/my-services": "none",
  "/payments": "none",
  /*
    ⚠⚠ `/settings` — CLASSIFIED HERE, DEFINED ELSEWHERE (`P2-J1.1-E046`).

    Its tabs are `SETTINGS_NAV` in `lib/settings-nav.ts`, which is the ONE
    definition `SettingsTabs` and `SettingsHeading` both read so that a tab and a
    page heading cannot disagree about what a page is called. Copying that list
    into `PAGE_TABS` would create the second definition that rule forbids, so the
    set lives there and its MODE lives here.

    ⚠ THE ENTRY IS NOT DECORATIVE. Without it `tabSequenceFor` would fall through
    to `?? "none"` and the set would be unnumbered because nobody decided rather
    than because somebody did — the exact ambiguity `E384`'s guard exists to
    catch. `check:community` asserts this key is present.

    ⚠ `none` BY EVIDENCE: nine parallel slices of one area. Nobody works through
    Password & Security to reach Billing, and none of them completes.
  */
  "/settings": "none",
};

/** The mode for a tab set. ⚠ Unlisted is `none` by design. */
export function tabSequenceFor(baseRoute: string): "process" | "suggested" | "none" {
  return TAB_SEQUENCE[baseRoute] ?? "none";
}

/**
 * ⚠⚠ THIS FUNCTION HAS NO CALLER (`P1-ALL-E381` WS-3, verified 2026-09-04).
 *
 * Grepped across `src`, `scripts` and `e2e`: nothing invokes it. Every page
 * renders its own `<h1>`. ⚠ SO IT AFFECTS NOTHING AT RUNTIME, and any comment
 * claiming a nav change "moves page headings" is describing a mechanism that is
 * not connected — see the corrected paragraph above `PROVIDER_NAV`.
 *
 * ⚠⚠ IT IS DELIBERATELY NOT DELETED, AND THE REASON IS THE `heading` FIELD.
 * `E378` turned the rail into one-word verbs and put each journey's full name on
 * `NavItem.heading`; this function is the ONLY place those names are read as
 * DATA rather than sitting in prose. Deleting it would make `heading` an unused
 * field, and the next cleanup would delete that too — and with it the record of
 * what `Learn`, `Hire`, `Shop` and `Connect` are actually called.
 *
 * ⚠ IT IS ALSO CORRECT AS IT STANDS: `best.heading ?? best.label` returns the
 * journey name over the rail verb. If a header ever wants a derived title again,
 * it works on the day it is called.
 *
 * ⚠ IF YOU ARE HERE TO DELETE DEAD CODE: check whether anything reads `heading`
 * first. If nothing does, that is a decision about the nav model, not a cleanup.
 */
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

  /*
    ── ⚠⚠ NOT A NAV DESTINATION (`P1-A1.5-E529` FINDING 2) ───────────────────

    ⚠ SUPERSEDED, quoted not deleted (`E164`): this read *"title-case the last
    meaningful segment"* and did exactly that to ANYTHING, including a uuid.
    ⚠⚠ SCOTT SAW THE RESULT AT THE TOP OF `/admin/users/<uuid>`:
    `88292688 82e4 4ba8 A84e C1ed59a648a9`. The de-hyphenation and the capital
    letters were this rule's fingerprints.

    ⚠ THE DEFECT WAS GENERIC, NOT THIS PAGE'S. **14 of the app's 29 dynamic
    routes** printed a title-cased id — `/providers/[id]`, `/work-requests/[id]`,
    `/admin/companies/[id]`, `/support/tickets/[ticketId]`, every `[token]` page,
    and the rest. Fixing the page would have left thirteen.

    ⚠⚠ THE RULE: AN OPAQUE ID IS NOT A HEADING. A segment that is not a
    human-readable slug is dropped, and the PARENT SECTION answers instead —
    `/admin/users/<uuid>` becomes `Users`, which is the section the reader is in
    and the word the rail already uses. ⚠ The page's own `<h1>` still names the
    person, so the name is not lost; it simply is not repeated in the one line
    the shell has.
  */
  const segs = pathname.split("/").filter(Boolean);
  while (segs.length) {
    const seg = segs[segs.length - 1];
    if (!isOpaqueSegment(seg)) return titleCaseSegment(seg);
    /* ⚠ Drop the id and ask the NAV again for the parent — a match there is a
       real heading (`Users`), not another guess from the URL. */
    segs.pop();
    const parent = "/" + segs.join("/");
    const inherited = segs.length ? pageTitleFor(parent) : null;
    if (inherited) return inherited;
  }
  return null;
}

/**
 * ⚠⚠ IS THIS SEGMENT AN OPAQUE ID RATHER THAN A WORD? (`P1-A1.5-E529`)
 *
 * ⚠ THE TEST IS POSITIVE FOR SLUGS, NOT NEGATIVE FOR IDS, because the set of id
 * FORMATS is open — uuid, cuid, nanoid, a signed token, a bare integer — and a
 * blocklist would miss the next one. A SLUG is the narrow, closed thing: lower
 * or mixed-case words joined by hyphens, each part alphabetic.
 *
 *   `terms-of-use`        -> slug, title-cased to `Terms Of Use`
 *   `payment-requests`    -> slug
 *   `88292688-82e4-4ba8…` -> parts contain digits -> OPAQUE
 *   `V1StGXR8_Z5jdHi6B`   -> contains digits -> OPAQUE
 *
 * ⚠ A slug carrying a digit (`oracle-cloud-2024`) is treated as opaque and
 * inherits the parent heading. That is the conservative direction: a correct
 * section name beats a mangled id, and the reverse is the defect being fixed.
 */
export function isOpaqueSegment(seg: string): boolean {
  if (!seg) return true;
  return !seg.split(/[-_]/).every((part) => part.length > 0 && /^[A-Za-z]+$/.test(part));
}

/** The old behaviour, kept for the segments that genuinely are words. */
function titleCaseSegment(seg: string): string {
  return seg.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
