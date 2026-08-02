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
export const HOME_NAV: NavItem = { label: "Opportunities", href: "/dashboard" };

/**
 * The Applications group, in E151's order. Contracts, Finances, Messages and
 * Community are open to everyone signed in — both sides of a marketplace have
 * agreements, money, conversations and a community.
 */
const BASE_NAV: NavItem[] = [
  { label: "Learn", href: "/learn" },
];

const TAIL_NAV: NavItem[] = [
  { label: "Packages", href: "/settings/packages", requires: "canProvideServices" },
  { label: "Talent", href: "/hire", requires: "canHireTalent" },
  { label: "Contracts", href: "/contracts" },
  { label: "Finances", href: "/finances" },
  { label: "Messages", href: "/messages" },
  { label: "Community", href: "/community" },
];

/**
 * Role-specific items. The buyer labels are LOCKED in `navigation_map.md`
 * (deck 1.1 slide 5) — do not reword them here.
 *
 * A provider sees Find Work and not Hire Talent; a buyer the reverse. Someone
 * who is both sees both, because a Person genuinely can be a provider and a
 * buyer, and hiding half their app would be wrong.
 */
const ROLE_NAV: NavItem[] = [
  // "Work" in the casing rail (E151). It was "Find Work"; the mockup's label is
  // the shorter one, and the page it opens now carries the Find-Work hero that
  // used to be on Home (reconciliation: E134's home is superseded by WS12).
  { label: "Work", href: "/work", requires: "canProvideServices" },
  { label: "Reports", href: "/reports", requires: "canHireTalent" },
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
  for (const item of [...BASE_NAV, ...ROLE_NAV, ...TAIL_NAV]) {
    if (item.requires && !holds(me, item.requires)) continue;
    if (seen.has(item.href)) continue;
    seen.add(item.href);
    items.push(item);
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
};

export const ADMIN_SETUP: NavItem = {
  label: "Setup & Maintenance",
  href: "/admin/setup",
  requires: "canAdminister",
};

export const ADMIN_NAV: NavGroup[] = [
  {
    title: "Transaction Data",
    items: [
      { label: "Learn", href: "/admin/learn" },
      { label: "Work", href: "/admin/work" },
      { label: "Packages", href: "/admin/packages" },
      { label: "Talent", href: "/admin/talent" },
      { label: "Buyers/Sellers", href: "/admin/buyers-sellers" },
      { label: "Contracts", href: "/admin/contracts" },
      { label: "Finances", href: "/admin/finances" },
      { label: "Messages", href: "/admin/messages" },
      { label: "Community", href: "/admin/community" },
    ],
  },
  {
    title: "Configuration Data",
    items: [
      { label: "Roles > Domains > Skills", href: "/admin/skill-catalog" },
      { label: "Specializations", href: "/admin/specializations" },
      { label: "Industries", href: "/admin/industries" },
    ],
  },
  {
    title: "Support Data",
    items: [
      { label: "Support Center", href: "/admin/support" },
      { label: "Platform Admins", href: "/admin/admins" },
    ],
  },
].map((g) => ({
  ...g,
  items: g.items.map((i) => ({ ...i, requires: "canAdminister" as const })),
}));

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
    ...BASE_NAV,
    ...ROLE_NAV,
    ...TAIL_NAV,
  ];

  // Longest matching href wins, so /admin/learn beats /admin.
  let best: NavItem | null = null;
  for (const item of all) {
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
