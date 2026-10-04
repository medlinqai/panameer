"use client";

import { usePathname } from "next/navigation";
import { settingsPageFor } from "@/lib/settings-nav";

export function SettingsHeading() {
  const item = settingsPageFor(usePathname());
  if (!item) return null;
  return (
    <header className="mb-5">
      <h1 className="font-display text-[24px] font-bold tracking-[-0.4px]">
        {item.label}
      </h1>
      <p className="mt-1 text-[14.5px] text-ink-2">{item.blurb}</p>
    </header>
  );
}
