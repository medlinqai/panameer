import { PAGE_TABS, type PageTabItem } from "@/lib/nav";
import { hasCapability, type Viewer } from "@/lib/access";
import { tabsWithUnread } from "@/lib/messages";

export function connectTabs(viewer: Viewer | null, unread: number): PageTabItem[] {
  const all = PAGE_TABS["/connect"] ?? [];
  const allowed = all.filter(
    (t) => !t.requires || (viewer !== null && hasCapability(viewer, t.requires))
  );
  return tabsWithUnread(allowed, unread);
}
