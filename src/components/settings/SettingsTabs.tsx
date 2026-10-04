"use client";

import { usePathname } from "next/navigation";
import { PageTabs } from "@/components/casing/PageTabs";
import { settingsNavFor, settingsPageFor } from "@/lib/settings-nav";
import { tabSequenceFor } from "@/lib/nav";

export function SettingsTabs({ isProvider }: { isProvider: boolean }) {
  const pathname = usePathname();
  const items = settingsNavFor(isProvider);
  const active = settingsPageFor(pathname);

  return (
    <div className="overflow-hidden rounded-brand border border-line bg-white px-3 shadow-brand">
    <PageTabs
      wrap
      tabs={items.map((i) => ({ label: i.label, href: i.href }))}
      current={active?.href ?? ""}
      sequence={tabSequenceFor("/settings")}
      className="[&>div]:border-0 [&>div]:mb-0"
    />
    </div>
  );
}
