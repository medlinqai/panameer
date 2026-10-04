"use client";

import { usePathname } from "next/navigation";
import { settingsPageFor } from "@/lib/settings-nav";

export function SettingsTitle() {
  return <>{settingsPageFor(usePathname())?.label ?? "Settings"}</>;
}
