import type { Capability } from "@/lib/access";

export type SettingsNavItem = {
  label: string;
  href: string;
  /** One line under the label on the page header. */
  blurb: string;
  requires?: Capability;
};

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
    label: "Billing & Payments",
    href: "/settings/billing",
    blurb: "How you pay Panameer for your membership.",
  },
  {
    label: "Withdrawals",
    requires: "canProvideServices",
    href: "/settings/withdrawals",
    blurb: "How Panameer pays you, and the tax details required first.",
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

export function settingsNavFor(isProvider: boolean): SettingsNavItem[] {
  return SETTINGS_NAV.filter(
    (i) => !i.requires || (i.requires === "canProvideServices" && isProvider)
  );
}
