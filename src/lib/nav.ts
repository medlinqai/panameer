import type { Me } from "@/lib/types";

export type NavItem = { label: string; href: string };

const PROVIDER_NAV: NavItem[] = [
  { label: "Find Work", href: "/find-work" },
  { label: "Deliver Work", href: "/deliver-work" },
  { label: "Manage Money", href: "/manage-money" },
  { label: "Messages", href: "/messages" },
];

const BUYER_NAV: NavItem[] = [
  { label: "Hire", href: "/hire" },
  { label: "Work", href: "/work" },
  { label: "Reports", href: "/reports" },
  { label: "Messages", href: "/messages" },
];

/**
 * Primary nav derived from the viewer's actor flags. A Person can be both a
 * provider and a buyer, so the sets are unioned (deduped by href) — provider
 * items first, then buyer-only items.
 */
export function navForRoles(me: Me | null): NavItem[] {
  if (!me) return [];
  const { isServiceProvider, isServiceBuyer } = me.person.roles;
  const items: NavItem[] = [];
  const seen = new Set<string>();
  const add = (list: NavItem[]) => {
    for (const item of list) {
      if (seen.has(item.href)) continue;
      seen.add(item.href);
      items.push(item);
    }
  };
  if (isServiceProvider) add(PROVIDER_NAV);
  if (isServiceBuyer) add(BUYER_NAV);
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
