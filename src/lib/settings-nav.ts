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
};

export const SETTINGS_NAV: SettingsNavItem[] = [
  {
    label: "Membership",
    href: "/settings/membership",
    blurb: "Your plan, what it includes, and when it renews.",
  },
  {
    label: "Contact Info",
    href: "/settings/contact",
    blurb: "Your account details, additional memberships and where you are.",
  },
  {
    label: "Profile Settings",
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
    href: "/settings/withdrawals",
    blurb: "How Panameer pays you, and the tax details required first.",
  },
  {
    /*
      ⚠⚠ ADDED (`P1-J2.1-E025`, 2026-09-02). `/settings/packages` HAS ALWAYS
      EXISTED AND WAS NEVER IN THIS LIST, and `SettingsNav` highlights on
      `pathname === item.href` — so a user standing on that page had NOTHING lit
      in the settings nav. Inside Settings with no "you are here".

      ⚠ PLACED WITH THE SELLER-FACING MONEY ITEMS — after Billing & Payments and
      Withdrawals, before the account-security block. A service product is a thing
      you SELL, so it belongs beside the pages about being paid rather than beside
      the ones about your password.
    */
    label: "Service Products",
    href: "/settings/packages",
    blurb: "The fixed offerings buyers can buy outright, and their prices.",
  },
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
