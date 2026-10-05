"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PageTabs } from "@/components/casing/PageTabs";
import { activeTab, type AreaTab } from "@/lib/account-areas";

// One account area's tab row; the active tab comes from the URL. Tabs with sub-pages show them underneath.
export function AreaTabs({ eyebrow, tabs }: { eyebrow: string; tabs: AreaTab[] }) {
  const pathname = usePathname() ?? "";
  const on = activeTab(tabs, pathname);
  return (
    <>
      <PageTabs wrap eyebrow={eyebrow} tabs={tabs.map((t) => ({ label: t.label, href: t.href }))} current={on?.href ?? ""} />
      {on?.sub && (
        <nav aria-label={`${on.label} pages`} data-area-sub className="-mt-2 mb-4 flex flex-wrap gap-x-5 gap-y-1 px-2 text-[13px]">
          {on.sub.map((s) => (
            <Link
              key={s.href}
              href={s.href}
              aria-current={s.href === pathname ? "page" : undefined}
              className={s.href === pathname ? "font-bold text-ink underline underline-offset-4" : "font-semibold text-ink-2 hover:text-ink"}
            >
              {s.label}
            </Link>
          ))}
        </nav>
      )}
    </>
  );
}
