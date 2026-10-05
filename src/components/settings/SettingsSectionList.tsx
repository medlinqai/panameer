"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { settingsNavFor, settingsPageFor } from "@/lib/settings-nav";

export function SettingsSectionList({ isProvider }: { isProvider: boolean }) {
  const pathname = usePathname();
  const items = settingsNavFor(isProvider);
  const active = settingsPageFor(pathname);

  return (
    <nav
      aria-label="Settings sections"
      className="flex flex-wrap gap-1 md:flex-col md:flex-nowrap md:gap-0.5"
    >
      {items.map((item) => {
        const current = active?.href === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={current ? "page" : undefined}
            className={
              "flex min-h-[44px] items-center px-3 text-[13.5px] font-semibold transition-colors " +
              (current
                ? "bg-magenta/10 text-magenta"
                : "text-ink-2 hover:bg-ink/5 hover:text-ink")
            }
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
