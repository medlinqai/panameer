"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// The Platform Console left rail (brief_M) — the console's OWN nav, not the
// buyer/provider app shell. Skill Catalog is read-only v1; Support is a stub.
const ITEMS: { label: string; href: string; soon?: boolean }[] = [
  { label: "Dashboard", href: "/admin" },
  { label: "Companies", href: "/admin/companies" },
  { label: "Providers", href: "/admin/providers" },
  { label: "Skill Catalog", href: "/admin/skill-catalog" },
  { label: "Support", href: "/admin/support", soon: true },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto md:flex-col md:overflow-visible">
      {ITEMS.map((item) => {
        const active =
          item.href === "/admin"
            ? pathname === "/admin"
            : pathname === item.href || pathname.startsWith(item.href + "/");
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
