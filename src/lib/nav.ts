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
export const HOME_NAV: NavItem = {
  label: "Provider Dashboard",
  href: "/dashboard",
  icon: "LayoutDashboard",
};

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

/** The group heading above the six primary items. */
export const APP_NAV_GROUP_TITLE = "Transactions";

/*
  THE PROVIDER RAIL — GROUPED, WITH SUBMENUS
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
  {
    label: "Start Learning",
    href: "/learn",
    icon: "GraduationCap",
    children: [
      { label: "All Learning Paths", href: "/learn?tab=all" },
      { label: "All Courses", href: "/learn/courses" },
      { label: "My Learning Paths", href: "/learn?tab=mine" },
      { label: "My Courses", href: "/learn/my-courses" },
    ],
  },
  {
    label: "Find Work",
    href: "/work",
    icon: "Briefcase",
    requires: "canProvideServices",
    children: [
      { label: "All Work Requests", href: "/work" },
      { label: "Work Requests for My Skills", href: "/work/for-my-skills" },
      { label: "My Work Requests (Saved)", href: "/work/saved" },
      { label: "Invitations to Propose My Rate", href: "/work/invitations" },
      { label: "My Proposals", href: "/work/proposals" },
    ],
  },
  {
    label: "Sell My Services",
    href: "/settings/packages",
    icon: "Tag",
    requires: "canProvideServices",
    children: [
      {
        label: "My Services",
        href: "/settings/packages",
        tooltip: "Sell your services as a package",
      },
      { label: "Offers for My Services", href: "/services/offers" },
    ],
  },
  {
    label: "Manage Work",
    href: "/contracts",
    icon: "ClipboardCheck",
    children: [
      /*
        ONE CHILD, DELIBERATELY. Timesheets and milestones are views inside a
        Work Order, not siblings of it — see the note above. A submenu of one
        still earns its chevron: it says out loud that this is where work orders
        live, and it is where the second child goes when there is one.
      */
      { label: "My Work Orders", href: "/contracts" },
    ],
  },
  {
    label: "Get Paid",
    href: "/finances",
    icon: "Wallet",
    children: [
      { label: "Payment Requests", href: "/finances/payment-requests" },
      { label: "Payments", href: "/finances" },
    ],
  },
  {
    label: "Community",
    href: "/community",
    icon: "MessagesSquare",
    children: [
      { label: "Messages", href: "/messages" },
      { label: "Forums", href: "/community/forums" },
      { label: "My Teams", href: "/community/teams" },
      { label: "Find a Mentor", href: "/community/mentors" },
    ],
  },
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
export const PERSONA_NAV: NavItem[] = [
  { label: "My Profile", href: "/profile" },
  { label: "My Stats", href: "/stats" },
  { label: "Account Health Checklist", href: "/account-health" },
  { label: "Request Recommendations", href: "/recommendations" },
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
  for (const item of PROVIDER_NAV) {
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
      Parents AND children. A submenu entry is a real destination with a real
      header; without flattening them, "My Proposals" would open a page titled
      "Proposals" from the URL segment.
    */
    ...PROVIDER_NAV,
    ...PROVIDER_NAV.flatMap((i) => i.children ?? []),
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
