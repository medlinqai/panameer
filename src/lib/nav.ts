import type { Me } from "@/lib/types";
import type { Capability } from "@/lib/access";

export type NavItem = {
  label: string;
  href: string;
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
 * THE UTILITY ROW, above the identity block (WS1-A).
 *
 * Not part of the Transactions group and deliberately not capability-gated:
 * these are the three things you reach for from anywhere, whoever you are.
 * Search leads the deck's rail, Home is the same destination the Dashboard
 * button owns (kept because the deck shows both and they read differently in
 * the two positions), Notifications is the bell that used to live in the header.
 */
export const UTILITY_NAV: NavItem[] = [
  { label: "Search", href: "/search", icon: "Search" },
  { label: "Home", href: "/dashboard", icon: "Home" },
  { label: "Notifications", href: "/notifications", icon: "Bell" },
];

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
export const REQUESTER_NAV: NavItem[] = [
  { label: "Start Learning", href: "/learn", icon: "GraduationCap" },
  {
    label: "Create Work",
    href: "/create-work",
    icon: "ClipboardList",
    requires: "canHireTalent",
  },
  {
    label: "Search Packages",
    href: "/packages",
    icon: "Package",
    requires: "canHireTalent",
  },
  {
    label: "Manage Work",
    href: "/contracts",
    icon: "ClipboardCheck",
    requires: "canHireTalent",
  },
  {
    label: "Pay Providers",
    href: "/pay",
    icon: "CreditCard",
    requires: "canHireTalent",
  },
  { label: "Community", href: "/community", icon: "MessagesSquare" },
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
export const PAGE_TABS: Record<string, NavItem[]> = {
  /*
    LEARN IS THE EXCEPTION, and deliberately. Its hero already carries an
    All / My Learning Paths pill row — a live client-side filter over one
    catalog, not two routes — so a `PageTabs` row above it would be the exact
    double-row the brief forbids. The two genuinely new destinations (All
    Courses, My Courses) were folded into that existing row as links instead;
    see LearnHome. This entry exists so `pageTitleFor` still knows their names.
  */
  "/learn": [
    { label: "All Courses", href: "/learn/courses" },
    { label: "My Courses", href: "/learn/my-courses" },
  ],
  "/settings/packages": [
    { label: "My Services", href: "/settings/packages" },
    { label: "Offers for My Services", href: "/services/offers" },
  ],
  "/finances": [
    { label: "Payments", href: "/finances" },
    { label: "Payment Requests", href: "/finances/payment-requests" },
  ],
  "/community": [
    { label: "Community", href: "/community" },
    { label: "Messages", href: "/messages" },
    { label: "Forums", href: "/community/forums" },
    { label: "My Teams", href: "/community/teams" },
    { label: "Find a Mentor", href: "/community/mentors" },
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
  { label: "Find Work", href: "/work" },
  { label: "Work Requests for My Skills", href: "/work/for-my-skills" },
  { label: "My Work Requests (Saved)", href: "/work/saved" },
  { label: "Invitations to Propose My Rate", href: "/work/invitations" },
  { label: "My Proposals", href: "/work/proposals" },
];

export const COMPANY_NAV: NavItem[] = [
  { label: "Company", href: "/company" },
  { label: "Teams", href: "/company/teams" },
  { label: "Branding", href: "/company/branding" },
  { label: "Members", href: "/company#members" },
  { label: "Company Settings", href: "/company/settings" },
];

/** The group heading above the six primary items. */
export const APP_NAV_GROUP_TITLE = "Transactions";

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
export const PROVIDER_NAV: NavItem[] = [
  { label: "Start Learning", href: "/learn", icon: "GraduationCap" },
  {
    label: "Find Work",
    href: "/work",
    icon: "Briefcase",
    requires: "canProvideServices",
  },
  {
    label: "Sell My Services",
    href: "/settings/packages",
    icon: "Tag",
    requires: "canProvideServices",
  },
  { label: "Manage Work", href: "/contracts", icon: "ClipboardCheck" },
  { label: "Get Paid", href: "/finances", icon: "Wallet" },
  { label: "Community", href: "/community", icon: "MessagesSquare" },
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
  Theme › · Request Recommendations · My Company · Settings · Sign Out, and
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
    MY COMPANY (WS1-C) — read-only unless you are the company admin, which is
    what `/company` already does: it renders the company record for everyone in
    it and adds the join-request queue and the terms acceptance for an APPROVED
    ADMIN membership. The menu entry did not exist, so that page had no route
    into it from anywhere after E191 dropped Company from the rail.
  */
  { label: "My Company", href: "/company" },
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

/** The public front door. Learn is the one app surface open to everyone. */
export const PUBLIC_NAV: NavItem[] = [{ label: "Learn", href: "/learn" }];

/** Does this viewer hold the capability an item asks for? */
function holds(me: Me, capability: Capability): boolean {
  const r = me.person.roles;
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
  const source = me.person.roles.isServiceProvider ? PROVIDER_NAV : REQUESTER_NAV;
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
  if (!me) return [];
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
  if (best) return best.label;

  // Not a nav destination — title-case the last meaningful segment.
  const seg = pathname.split("/").filter(Boolean).pop();
  if (!seg) return null;
  return seg
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
