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

/** Everything a signed-in person sees, whatever their role. */
const BASE_NAV: NavItem[] = [
  { label: "Home", href: "/dashboard" },
  { label: "Learn", href: "/learn" },
  { label: "Messages", href: "/messages" },
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
  { label: "Find Work", href: "/work", requires: "canProvideServices" },
  { label: "Hire Talent", href: "/hire", requires: "canHireTalent" },
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
  for (const item of [...BASE_NAV, ...ROLE_NAV]) {
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
