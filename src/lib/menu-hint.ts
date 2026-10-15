import { ESTIMATES_PERSONA_ITEM, PERSONA_NAV, PROVIDER_NAV, REQUESTER_NAV, SELLER_PERSONA_ITEMS, COMPANY_PERSONA_ITEM, bandPrefixesFor, type NavItem } from "@/lib/nav";

// DC-E002: where a dashboard card's page lives in the menu, so the card can teach it ("…or Hire at the top of the page").
export type MenuHint = { label: string; icon?: string; top: boolean };

const under = (href: string, base: string) => href === base || href.startsWith(`${base}/`) || href.startsWith(`${base}?`) || href.startsWith(`${base}#`);

export function menuFor(href: string, side: "buyer" | "seller"): MenuHint | null {
  const top: NavItem[] = side === "buyer" ? REQUESTER_NAV : PROVIDER_NAV;
  const path = href.split(/[?#]/)[0];
  // Longest match wins (Shop's /services vs Connect's /connect/community).
  let best: { item: NavItem; len: number } | null = null;
  for (const item of top) for (const base of bandPrefixesFor(item.href)) if (under(path, base) && (!best || base.length > best.len)) best = { item, len: base.length };
  if (best) return { label: best.item.label, icon: best.item.icon, top: true };
  const mine = [...PERSONA_NAV, COMPANY_PERSONA_ITEM, ...SELLER_PERSONA_ITEMS, ESTIMATES_PERSONA_ITEM].find((i) => under(path, i.href.split(/[?#]/)[0]));
  return mine ? { label: mine.label, top: false } : null;
}

/** "Use the button below, or Hire at the top of the page." */
export function menuClause(h: MenuHint | null): string {
  if (!h) return "";
  return h.top ? `Use the button below, or ${h.label} at the top of the page.` : `Use the button below, or ${h.label} in the menu under your photo.`;
}
