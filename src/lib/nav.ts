import type { Me } from "@/lib/types";
import type { Capability } from "@/lib/access";

export type NavItem = {
  label: string;
  href: string;
  heading?: string;
  requires?: Capability;
  icon?: string;
  children?: NavItem[];
  /** Shown on hover. Used where the deck gives a label an explanatory line. */
  tooltip?: string;
};

export const SEARCH_NAV: NavItem = { label: "Search", href: "/search", icon: "Search" };
export const HOME_NAV: NavItem = { label: "Home", href: "/dashboard", icon: "Home" };
export const NOTIFICATIONS_NAV: NavItem = {
  label: "Notifications",
  href: "/notifications",
  icon: "Bell",
};

export const UTILITY_NAV: NavItem[] = [SEARCH_NAV, HOME_NAV, NOTIFICATIONS_NAV];

export const ACCOUNT_BAND_HREF = "__account-menu__";

export const MESSAGES_BAND_HREF = "__messages__";
export const BELL_BAND_HREF = "__bell__";
export const CONFIG_BAND_HREF = "__config__";
export const HOME_BAND_HREF = "__home__";

export const BAND_CONTROL_HREFS = [
  ACCOUNT_BAND_HREF,
  MESSAGES_BAND_HREF,
  BELL_BAND_HREF,
  CONFIG_BAND_HREF,
  HOME_BAND_HREF,
] as const;

const BAND_EXTRA_PREFIXES: Readonly<Record<string, readonly string[]>> = {
  "/connect": ["/community", "/providers", "/invite-colleague", "/coordinator"],
  "/shop": ["/my-services", "/services"],
  "/hire": ["/create-work", "/work-requests", "/search", "/consultations"],
  "/orders": ["/payments", "/pay", "/finances", "/manage-money", "/deliver-work"],
  [ACCOUNT_BAND_HREF]: [
    "/profile",
    "/company",
    "/usage",
    "/account-health",
    "/settings",
    "/score",
    "/community/score",
    "/recommendations",
    "/support",
    "/reports",
  ],
  [MESSAGES_BAND_HREF]: ["/messages"],
  [BELL_BAND_HREF]: ["/notifications", "/worklist"],
  [CONFIG_BAND_HREF]: ["/admin"],
  [HOME_BAND_HREF]: ["/dashboard"],
};

const BAND_EXACT: ReadonlySet<string> = new Set(["/dashboard", "/admin"]);

function bandMatchLength(
  href: string,
  pathname: string,
  extras: readonly string[] = []
): number {
  if (BAND_EXACT.has(href)) return pathname === href ? href.length : -1;
  let best = -1;
  for (const p of [...bandPrefixesFor(href), ...extras]) {
    if (pathname.startsWith(p) && p.length > best) best = p.length;
  }
  return best;
}

export function bandActiveHref(
  pathname: string,
  hrefs: readonly string[],
  opts?: { readonly ownProviderPath?: string | null }
): string | null {
  const accountExtras = opts?.ownProviderPath ? [opts.ownProviderPath] : [];
  let bestHref: string | null = null;
  let bestLen = -1;
  for (const href of hrefs) {
    const len = bandMatchLength(
      href,
      pathname,
      href === ACCOUNT_BAND_HREF ? accountExtras : []
    );
    if (len > bestLen) {
      bestLen = len;
      bestHref = href;
    }
  }
  return bestLen >= 0 ? bestHref : null;
}

export function bandPrefixesFor(href: string): readonly string[] {
  return [href, ...(BAND_EXTRA_PREFIXES[href] ?? [])];
}

export const REQUESTER_NAV: NavItem[] = [
  { label: "Connect", heading: "Community", href: "/connect", icon: "MessagesSquare" },
  { label: "Learn", heading: "Learning Paths", href: "/learn", icon: "GraduationCap" },
  {
    label: "Hire",
    heading: "Work Requests",
    href: "/hire",
    icon: "ClipboardList",
    requires: "canHireTalent",
  },
  {
    label: "Shop",
    heading: "Service Products",
    href: "/shop",
    icon: "Package",
  },
  {
    label: "Orders",
    heading: "Work Orders",
    href: "/orders",
    icon: "ClipboardCheck",
    requires: "canHireTalent",
  },
];

export type PageTabItem = NavItem & {
  n?: number;
  state?: "live" | "early";
};

export const PAGE_TABS: Record<string, PageTabItem[]> = {
  "/learn": [
    { label: "All Learning Paths", href: "/learn/paths" },
    { label: "All Courses", href: "/learn/courses" },
    { label: "My Learning", href: "/learn/paths?tab=mine" },
  ],
  "/my-services": [
    { label: "Service Products", href: "/my-services", requires: "canProvideServices" },
    { label: "Offers for My Services", href: "/services/offers", requires: "canProvideServices" },
  ],
  "/hire": [
    { label: "Work Requests", href: "/hire", requires: "canHireTalent" },
    { label: "Create a Request", href: "/create-work", requires: "canHireTalent" },
  ],
  "/payments": [
    { label: "Payments", href: "/payments" },
    { label: "Payment Requests", href: "/payments/payment-requests" },
  ],
  "/profile": [
    { label: "Profile", href: "/profile" },
    { label: "Score", href: "/community/score" },
    { label: "Usage", href: "/usage" },
    { label: "Health", href: "/account-health" },
  ],
  "/connect": [
    { label: "Community", href: "/community" },
    { label: "Colleagues", href: "/community/colleagues" },
    { label: "Mentors", href: "/community/mentors" },
    { label: "Teams", href: "/community/teams" },
    { label: "Groups", href: "/community/groups", state: "live" },
  ],
};

export const WORK_FEED_EXTRA_TITLES: NavItem[] = [
  { label: "Find Work", href: "/find-work" },
  { label: "Best Matches", href: "/find-work/for-my-skills" },
  { label: "My Work Requests (Saved)", href: "/find-work/saved" },
  { label: "Invitations to Propose My Rate", href: "/find-work/invitations" },
  { label: "My Proposals", href: "/find-work/proposals" },
];

export const COMPANY_NAV: NavItem[] = [
  { label: "Company", href: "/company" },
  { label: "Branding", href: "/company/branding" },
  { label: "Company Settings", href: "/company/settings" },
];

export const PROVIDER_NAV: NavItem[] = [
  { label: "Connect", heading: "Community", href: "/connect", icon: "MessagesSquare" },
  { label: "Learn", heading: "Learning Paths", href: "/learn", icon: "GraduationCap" },
  {
    label: "Work",
    heading: "Work Requests",
    href: "/find-work",
    icon: "Briefcase",
    requires: "canProvideServices",
  },
  {
    label: "Shop",
    heading: "Service Products",
    href: "/shop",
    icon: "Tag",
  },
  { label: "Orders", heading: "Work Orders", href: "/orders", icon: "ClipboardCheck" },
];

//   export const PERSONA_NAV_PRIMARY: NavItem[] = [
//        percentage beside it, fetched when the menu OPENS (see
//        `/api/me/menu-summary`), never on every page render. <end-comment>
//     { label: "Score", href: "/community/score" },
//        //   { label: "Usage Stats", href: "/stats" },
//     { label: "Statistics", href: "/stats" },
//     <begin-comment>
//   
//       Colleague' (opens the invite panel on `/community/grow`), not 'Grow the
//       Network'. It's one entry."*
//       Your Network` and MEASURED IT HAD NO PAGE (`/grow` and `/community/grow`
//       what a person wants to do; *"Grow the Network"* is what Panameer wants them
//       to do, and the menu is theirs.
//       //   `/community/grow` both 404 … omitted until a page exists.
//     <end-comment>
//     { label: "Invite a Colleague", href: "/community/grow" },
//   ];
//   
//   export const PERSONA_NAV_SECONDARY: NavItem[] = [
//     <begin-comment>
//   
//       The brief said to remove it alongside `Invite a Colleague` — *"these are now
//       (`ColleagueRowActions.tsx` POSTs to `/api/recommendations` inline) but it
//       NEVER LINKS THE `/recommendations` PAGE.
//       `ProviderProfileView.tsx` — which is doubly conditional on
//       moment a provider receives their first recommendation.
//       HAS A RECOMMENDATION — this brief's own named failure: *"a feature whose only
//       and reversible in ONE LINE once something on Connect links the page.
//     <end-comment>
//     <begin-comment>
//   
//       //   { label: "Request Recommendations", href: "/recommendations" },
//   
//       it"* — so the page never had two doors to `/recommendations` and never had
//       none. WS-C builds the `Grow` card; this line goes in that same change.
//   
//       ACTION a home on Connect… but it NEVER LINKS THE `/recommendations` PAGE"*,
//       and the only two inbound links were this entry and the (since deleted)
//       it for every owner, unconditionally, in the same file that renders the
//       profile.
//     <end-comment>
//     <begin-comment>
//   
//       //   "This would be under the request recommendation option on the Setting menu."
//       // THE TWO ASKS ARE DIFFERENT AND THE ADJACENCY IS THE POINT - one asks
//       // somebody to VOUCH for you, the other asks them to JOIN. Sitting together is
//       // what makes the difference legible.
//       // { label: "Invite a Colleague", href: "/invite-colleague" },
//   
//       REMOVING, which is the whole reason `Request Recommendations` above did NOT
//       go: `/community/colleagues` carries a STANDING right-rail card linking
//       asks now live in different places: vouching here, inviting on Connect.
//     <end-comment>
//     <begin-comment>
//       top-left chip owns the company and this menu owns the person; an entry that
//       opened /company from the personal popover was the last thing crossing that
//       line.
//   
//       The route did not simply vanish for non-admins, which it would have: the
//       chip only renders a MENU for admins, so removing this would have left an
//       ordinary member with no way to reach their own company page. The chip is a
//       plain link for them now — same zone, same destination, read-only.
//     <end-comment>
//        the route is unchanged, and `settings-nav.ts` (the `/settings` SUB-NAV) is a
//        DIFFERENT list and is not in scope.
//        //   { label: "Settings", href: "/settings" },
//        → `Account Settings`), and each time the ROUTE was unchanged. <end-comment>
//     { label: "Account Settings", href: "/settings" },
//        groups it with Settings and Help, because all three are about the ACCOUNT
//     { label: "Account Health", href: "/account-health" },
//     <begin-comment>
//   
//       index — both 404. The only live pages under support are `/support/bug` and
//       `/support/tickets`.
//       right long-run answer — a real help surface would list "Report a Bug"
//       alongside "My Tickets", and `/support/bug` currently has no menu door at all.
//     <end-comment>
//     <begin-comment>
//   
//       the Grow card; it's now in **both**)."*
//       OUT of this menu in the same commit that gave it a home on the profile,
//       RULED THAT TWO IS RIGHT FOR THIS ONE: it is an errand you think of from
//       anywhere, not only while looking at your profile.
//       //   to `/recommendations` and never had none.
//       and this is not a gap.
//     <end-comment>
//     { label: "Request a Recommendation", href: "/recommendations" },
//     <begin-comment>
//   
//       note above records that `Help` points at `/support/tickets` because **there
//       MAKES THE LABEL MATCH THE DESTINATION IT ALREADY HAD:** the page's own `<h1>`
//       reads *"My Support Tickets"*, so the menu was promising **Help** and
//       delivering **a ticket list.**
//       above is explicit that this is *"the NEAREST THING THAT EXISTS, NOT the
//       right long-run answer — a real help surface would list 'Report a Bug'
//       alongside 'My Tickets', and `/support/bug` currently has no menu door at
//       `My Tickets` stops the menu claiming otherwise.
//       //   { label: "Help", href: "/support/tickets" },
//     <end-comment>
//     { label: "My Tickets", href: "/support/tickets" },
//   ];
//   
//   export const PERSONA_NAV: NavItem[] = [
//     ...PERSONA_NAV_PRIMARY,
//     ...PERSONA_NAV_SECONDARY,
//   ];
export const PERSONA_NAV: NavItem[] = [
  { label: "My Account Settings", href: "/settings" },
  { label: "Invite a Colleague", href: "/community/grow" },
  { label: "Request a Recommendation", href: "/recommendations" },
  { label: "My Tickets", href: "/support/tickets" },
];

export const THEME_BEFORE_HREF = "/support/tickets";

/** What a Panameer employee keeps of that list. */
export const ADMIN_PERSONA_NAV: NavItem[] = [
  { label: "My Profile", href: "/profile" },
];

/** Does this viewer hold the capability an item asks for? */
function holds(me: Me, capability: Capability): boolean {
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

function isSellerSide(me: Me): boolean {
  return me.person?.roles.isServiceProvider === true;
}

export function menuForUserClass(me: Me): NavItem[] {
  return isSellerSide(me) ? PROVIDER_NAV : REQUESTER_NAV;
}

/** The rail's persona caption. Uppercase by convention, not by CSS accident. */
export type RailPersona = "BUYER" | "SELLER" | "PANAMEER";

export function railPersona(
  me: Me | null,
  isSystemAdmin: boolean
): RailPersona | null {
  if (isSystemAdmin) return "PANAMEER";
  if (!me) return null;
  return isSellerSide(me) ? "SELLER" : "BUYER";
}

export function navForRoles(me: Me | null): NavItem[] {
  if (!me) return [];
  const items: NavItem[] = [];
  const seen = new Set<string>();
  const source = menuForUserClass(me);
  for (const item of source) {
    if (item.requires && !holds(me, item.requires)) continue;
    if (seen.has(item.href)) continue;
    seen.add(item.href);
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
// ---------------------------------------------------------------------------

export type NavGroup = { title: string | null; items: NavItem[] };

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
      { label: "AIM Checklist", href: "/admin/work-tracker", icon: "ListChecks" },
    ],
  },
  {
    title: "Configuration Data",
    items: [
      { label: "Build Plan", href: "/admin/build-plan", icon: "ListChecks" },
      { label: "Users", href: "/admin/buyers-sellers", icon: "ArrowLeftRight" },
      { label: "Roles>Domains>Skills", href: "/admin/skill-catalog", icon: "FolderTree" },
      { label: "Specializations", href: "/admin/specializations", icon: "Award" },
      { label: "Assessment Rate", href: "/admin/tax-rates", icon: "Percent" },
      { label: "Commission Rate", href: "/admin/application-commissions", icon: "Percent" },
    ],
  },
  {
    title: "Support Data",
    items: [
      { label: "Support Center", href: "/admin/support", icon: "LifeBuoy" },
      { label: "Platform Admins", href: "/admin/admins", icon: "ShieldCheck" },
      { label: "Data Health", href: "/admin/data-health", icon: "Activity" },
      { label: "Audit Log", href: "/admin/audit-log", icon: "History" },
      { label: "Build Digest", href: "/admin/build-digest", icon: "Mail" },
    ],
  },
].map((g) => ({
  ...g,
  items: g.items.map((i) => ({ ...i, requires: "canAdminister" as const })),
}));

export const RETIRED_ADMIN_ROUTES: Record<string, string> = {
  "/admin/work": "/admin/work-requests",
  "/admin/packages": "/admin/work-packages",
  "/admin/talent": "/admin/buyers-sellers",
  "/admin/finances": "/admin/payments",
};

export const TAB_SEQUENCE: Record<string, "process" | "suggested" | "none"> = {
  "/profile": "none",
  "/connect": "none",
  "/learn": "none",
  "/my-services": "none",
  "/payments": "none",
  "/settings": "none",

  "/hire": "suggested",
};

export function tabSequenceFor(baseRoute: string): "process" | "suggested" | "none" {
  const mode = TAB_SEQUENCE[baseRoute];
  if (!mode) {
    throw new Error(
      `tabSequenceFor: "${baseRoute}" has no TAB_SEQUENCE entry. ` +
        `Add one — process, suggested or none — rather than letting it default (P2-A2-E676).`
    );
  }
  return mode;
}

export function pageTitleFor(pathname: string): string | null {
  if (pathname === "/dashboard" || pathname === "/admin") return null;

  const all: NavItem[] = [
    ADMIN_SETUP,
    ...ADMIN_NAV.flatMap((g) => g.items),
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
  if (best) return best.heading ?? best.label;

  const segs = pathname.split("/").filter(Boolean);
  while (segs.length) {
    const seg = segs[segs.length - 1];
    if (!isOpaqueSegment(seg)) return titleCaseSegment(seg);
    segs.pop();
    const parent = "/" + segs.join("/");
    const inherited = segs.length ? pageTitleFor(parent) : null;
    if (inherited) return inherited;
  }
  return null;
}

export function isOpaqueSegment(seg: string): boolean {
  if (!seg) return true;
  return !seg.split(/[-_]/).every((part) => part.length > 0 && /^[A-Za-z]+$/.test(part));
}

/** The old behaviour, kept for the segments that genuinely are words. */
function titleCaseSegment(seg: string): string {
  return seg.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
