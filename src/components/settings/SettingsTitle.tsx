"use client";

import { usePathname } from "next/navigation";
import { settingsPageFor } from "@/lib/settings-nav";

/**
 * The Settings hero's `<h1>` — the tab you are standing on (`P2-J1.1-E048`).
 *
 * ⚠ IT READS THE SAME DEFINITION THE TABS DO. `SettingsNav` and
 * `SettingsHeading` were built sharing one list *"so the two cannot disagree
 * about what a page is called"*; the heading moved into the hero and that rule
 * moved with it. This is a RE-STYLE, NOT A RE-LIST.
 *
 * ⚠ A CLIENT COMPONENT ONLY BECAUSE THE TITLE DEPENDS ON THE ROUTE. Keeping it
 * this small is what lets `ConsoleHero` stay a server component.
 * ⚠ FALLS BACK TO `Settings` for a route the list does not know (the `/settings`
 * redirect lands on Membership before this ever renders) rather than inventing a
 * title from the URL segment — a heading is worth having only when it is right.
 */
export function SettingsTitle() {
  return <>{settingsPageFor(usePathname())?.label ?? "Settings"}</>;
}
