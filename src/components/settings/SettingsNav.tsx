"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Deck slide 7 order. ID Badge live; Preferences minimal; Tax/Connect/Accounts
// scaffolded. This is the Settings section's OWN sub-nav — NOT the global app
// top-nav (a separate, later brief).
const ITEMS: { label: string; href: string; soon?: boolean }[] = [
  { label: "Profile", href: "/settings/profile" },
  { label: "ID Badge", href: "/settings/id-badge" },
  { label: "Preferences", href: "/settings/preferences" },
  { label: "Tax Information", href: "/settings/tax", soon: true },
  { label: "Connect", href: "/settings/connect", soon: true },
  { label: "Accounts", href: "/settings/accounts", soon: true },
];

export function SettingsNav() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto md:flex-col md:overflow-visible">
      {ITEMS.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={
              "flex items-center justify-between whitespace-nowrap rounded-lg px-4 py-2.5 text-[15px] font-semibold transition-colors " +
              (active
                ? "bg-magenta/[0.08] text-magenta"
                : "text-ink-2 hover:bg-black/[0.03] hover:text-ink")
            }
          >
            {item.label}
            {item.soon && (
              <span className="ml-2 hidden rounded-full bg-line px-2 py-0.5 text-[11px] font-bold text-ink-2 md:inline">
                Soon
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
