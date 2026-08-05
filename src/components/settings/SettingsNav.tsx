"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SETTINGS_NAV } from "@/lib/settings-nav";

/**
 * The Settings left-nav (J2.4 WS-G / E013).
 *
 * A CONVENTIONAL IN-PAGE SUB-NAV, which is the point of the decision it
 * implements — explicitly NOT the Task Panel, which is reserved for transaction
 * pages where "recent" and "reports" mean something. Settings is eight siblings
 * with no ordering and no history worth surfacing; a left-nav is the shape for
 * that, and a bespoke panel would make Settings the one area of the product
 * that navigates unlike anything the user has used before.
 *
 * Items come from `lib/settings-nav.ts`, so this list and the layout's page
 * heading read one definition — a heading and a nav entry disagreeing about
 * what a page is called is the drift the shared nav modules exist to stop.
 *
 * Horizontal scroll below md: eight labels stacked as a column on a phone push
 * the actual settings off the bottom of the screen.
 */
export function SettingsNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Settings"
      className="flex gap-1 overflow-x-auto pb-1 md:flex-col md:overflow-visible md:pb-0"
    >
      {SETTINGS_NAV.map((item) => {
        const active =
          pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={
              "whitespace-nowrap rounded-[10px] px-3.5 py-2.5 text-[14.5px] font-semibold transition-colors " +
              (active
                ? "bg-magenta/[0.08] text-magenta"
                : "text-ink-2 hover:bg-black/[0.03] hover:text-ink")
            }
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
