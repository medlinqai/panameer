// Four account areas (Scott 2026-10-05): Profile · Company · Account · Support, each with its own tab row.
export type AreaTab = { label: string; href: string; also?: string[]; sub?: { label: string; href: string }[] };
export type Area = "profile" | "company" | "account" | "support";

export const AREA_EYEBROW: Record<Area, string> = {
  profile: "PROFILE",
  company: "COMPANY",
  account: "ACCOUNT",
  support: "SUPPORT",
};

/** Company v3: Overview · Team · Legal, Tax & Banking 🔒 · Branding; non-admins see Overview + Team. */
export function companyTabs(isAdmin: boolean): AreaTab[] {
  const all: AreaTab[] = [
    { label: "Overview", href: "/company" },
    { label: "Team", href: "/company/team" },
    { label: "Legal, Tax & Banking 🔒", href: "/company/legal" },
    { label: "Branding", href: "/company/branding" },
  ];
  return isAdmin ? all : all.slice(0, 2);
}

/** Account = today's /settings pages, grouped. Every settings page sits under one tab. */
export function accountTabs(isProvider: boolean): AreaTab[] {
  return [
    { label: "Notifications", href: "/settings/notifications" },
    {
      label: "Security",
      href: "/settings/security",
      also: ["/settings/identity"],
      sub: [
        { label: "Password & Security", href: "/settings/security" },
        { label: "Identity Verification", href: "/settings/identity" },
      ],
    },
    { label: "Membership", href: "/settings/membership" },
    isProvider
      ? {
          label: "Payouts",
          href: "/settings/withdrawals",
          also: ["/settings/billing"],
          sub: [
            { label: "Withdrawals", href: "/settings/withdrawals" },
            { label: "Billing & Payments", href: "/settings/billing" },
          ],
        }
      : { label: "Payouts", href: "/settings/billing" },
    ...(isProvider ? [{ label: "Tax", href: "/settings/withdrawals/w9" }] : []),
    { label: "Preferences", href: "/settings/contact" },
  ];
}

export const SUPPORT_TABS: AreaTab[] = [
  { label: "Tickets", href: "/support/tickets" },
  { label: "Report a Problem", href: "/support/bug" },
  { label: "Help", href: "/support/help" },
];

/** The tab a pathname belongs to: exact or `also` match first, then the longest prefix. */
export function activeTab(tabs: AreaTab[], pathname: string): AreaTab | null {
  const exact = tabs.find((t) => t.href === pathname || t.also?.includes(pathname));
  if (exact) return exact;
  const pre = tabs
    .filter((t) => [t.href, ...(t.also ?? [])].some((h) => pathname.startsWith(`${h}/`)))
    .sort((a, b) => b.href.length - a.href.length);
  return pre[0] ?? null;
}
