"use client";

import { usePathname } from "next/navigation";
import { settingsPageFor } from "@/lib/settings-nav";

/**
 * The heading above each Settings page (J2.4 WS-G / E013).
 *
 * DERIVED FROM THE NAV, not passed per page — the same rule `pageTitleFor`
 * follows for the console header. A `title` prop on every settings page is one
 * more thing to forget on the ninth one, and it lets the nav entry and the
 * heading drift into saying different things about the same page.
 *
 * Renders nothing for a route that isn't one of the eight (Packages, and the
 * retired paths while their redirects land) rather than inventing a title from
 * the URL segment — a heading is worth having only when it is right.
 */
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
