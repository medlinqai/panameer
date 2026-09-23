import type { Capability } from "@/lib/access";

/**
 * The Settings sub-navigation (J2.4 WS-G / E013).
 *
 * ONE DOOR, THEN A CONVENTIONAL IN-PAGE LEFT-NAV. That is the architecture
 * decision from the brief, and the thing it rules out is worth naming: the Task
 * Panel (Page / Recent / Reports) is NOT the settings menu. It is reserved for
 * transaction pages, where "recent" and "reports" mean something. Settings is
 * nine sibling pages with no ordering (eight until `E025` added Service Products) and no history worth surfacing, which is
 * exactly the shape a left-nav is for.
 *
 * MEMBERSHIP IS FIRST AND IS THE DEFAULT. `/settings` lands there rather than on
 * a profile form because it is the page that answers "what am I paying for and
 * what do I get", which is the question people arrive at Settings holding.
 *
 * NO "MY PROFILE" ENTRY. It lives in the avatar menu — it is a thing you look
 * at, not a thing you configure, and having it in both places made Settings the
 * de facto profile menu.
 *
 * Data only, so a server layout can read it without pulling in a client
 * component — the same rule `nav.ts` follows.
 */
export type SettingsNavItem = {
  label: string;
  href: string;
  /** One line under the label on the page header. */
  blurb: string;
  /**
   * ── ⚠⚠ THE CAPABILITY THIS TAB REQUIRES (`P2-J1.1-E050`) ──────────────────
   *
   * Omitted = every signed-in person sees it, which is what `E046` opened the
   * tree to. Three tabs are seller-only and say so here.
   *
   * ⚠⚠ DECLARING IT IS NOT DECORATION — IT IS ONE OF THREE LAYERS. A hidden tab
   * over an OPEN route is one URL away from being reachable, which is the drift
   * `check:nav-reachable` exists to stop. The other two layers are the route's
   * `route-access.ts` prefix and the page's own `guardPage`; this is the third,
   * and the guard cross-references it against the first.
   * ⚠ Keyed on the SAME `Capability` union `access.ts` uses, so a menu entry and
   * the page it points at cannot disagree about who is allowed there.
   */
  requires?: Capability;
};

/*
  ⚠⚠ CONTACT INFO IS FIRST (`E609`) — `/settings` lands here, and it must land
  on a page a member can change. ⚠ Membership follows it: it displays a real
  cycle date and an honest note about billing, so it keeps a place; it simply
  is not a door.
  ⚠ SUPERSEDED, quoted not deleted (`E164`): Membership was first.
*/
export const SETTINGS_NAV: SettingsNavItem[] = [
  {
    label: "Contact Info",
    href: "/settings/contact",
    blurb: "Your account details, additional memberships and where you are.",
  },
  {
    label: "Membership",
    href: "/settings/membership",
    blurb: "Your plan, what it includes, and when it renews.",
  },
  {
    label: "Profile Settings",
    /* ⚠ SELLER-ONLY (`P2-J1.1-E050`): provider-profile management — one of only TWO call sites that genuinely needs a `profileId`, and it still throws for a buyer BY DESIGN. */
    requires: "canProvideServices",
    href: "/settings/profile",
    blurb: "Who can see your profile, what work you want, and your categories.",
  },
  {
    label: "Billing & Payments",
    href: "/settings/billing",
    blurb: "How you pay Panameer for your membership.",
  },
  {
    label: "Withdrawals",
    /* ⚠ SELLER-ONLY (`P2-J1.1-E050`): SCOTT, 2026-09-07: *"buyer does not do withdraws."* It is how Panameer pays YOU. */
    requires: "canProvideServices",
    href: "/settings/withdrawals",
    blurb: "How Panameer pays you, and the tax details required first.",
  },
  /*
    ⚠⚠ `Service Products` LEFT THIS LIST (`P1-ALL-E533`, 2026-09-16). It is no
    longer a settings page: the surface moved to `/my-services`, out of
    `(app)/settings/` entirely, so it no longer inherits the `Settings` eyebrow
    or the settings tab row. ⚠ Scott: *"The point is getting it OUT of
    Settings."*

    ⚠ SUPERSEDED, quoted not deleted (`E164`): this held a `Service Products`
    entry at `href: "/settings/packages"`, added by `P1-J2.1-E025` so that a user
    standing on that page had something lit in the settings nav. ⚠⚠ THAT REASON
    DIED WITH THE MOVE — the page is not in Settings any more, so an entry here
    would light the settings nav for a page that is not one of its children, and
    `SettingsNav` highlights on `pathname === item.href`, which can no longer
    match. The rail's `Sell` item is how the page is reached now.
  */
  {
    label: "Password & Security",
    href: "/settings/security",
    blurb: "Your password, connected sign-ins and two-step verification.",
  },
  {
    label: "Identity Verification",
    href: "/settings/identity",
    blurb: "Verify who you are and earn the ID badge.",
  },
  {
    label: "Notification Settings",
    href: "/settings/notifications",
    blurb: "What Panameer tells you about, and how it reaches you.",
  },
];

export function settingsPageFor(pathname: string): SettingsNavItem | undefined {
  return SETTINGS_NAV.find(
    (i) => pathname === i.href || pathname.startsWith(i.href + "/")
  );
}

/**
 * The tabs THIS viewer should see (`P2-J1.1-E050`).
 *
 * ⚠ FILTERING IS THE VISIBLE HALF OF A THREE-LAYER CHANGE, never the whole fix.
 * Hiding a tab over an open route would leave it one URL away from being
 * reachable; the route and the page guard are what actually refuse. This is what
 * stops a buyer being OFFERED a door that then refuses them — the
 * `check:nav-reachable` bug class, five instances and counting.
 */
export function settingsNavFor(isProvider: boolean): SettingsNavItem[] {
  return SETTINGS_NAV.filter(
    (i) => !i.requires || (i.requires === "canProvideServices" && isProvider)
  );
}
