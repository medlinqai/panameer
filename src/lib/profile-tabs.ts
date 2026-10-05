import type { PageTabItem } from "@/lib/nav";
import { PAGE_TABS } from "@/lib/nav";
import { hasCapability, type Viewer } from "@/lib/access";

export const ACCOUNT_MENU_NAME = "PROFILE";

export function profileTabs(viewer: Viewer | null): PageTabItem[] {
  const all = PAGE_TABS["/profile"] ?? [];
  return all.filter(
    (t) => !t.requires || (viewer !== null && hasCapability(viewer, t.requires))
  );
}

export function profileTabLabel(href: string): string {
  return (PAGE_TABS["/profile"] ?? []).find((t) => t.href === href)?.label ?? href;
}
