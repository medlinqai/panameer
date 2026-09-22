import type { PageTabItem } from "@/lib/nav";
import { PAGE_TABS } from "@/lib/nav";
import { hasCapability, type Viewer } from "@/lib/access";

/**
 * ── ⚠⚠ THE PROFILE TAB ROW, FILTERED BY CAPABILITY (`P2-A2-E600` WS-A) ────
 *
 * ⚠ Scott: *"One tab row for every page under the avatar… It matches the avatar
 * menu."*
 *
 * ⚠⚠⚠ IT FILTERS, AND `E594` IS WHY. `PageTabs` never reads `NavItem.requires`
 * — *"nothing between `PAGE_TABS` and the DOM filters by who is looking"* — so
 * a row rendered raw can show a tab that bounces the viewer to
 * `/dashboard?noaccess=1`. ⚠ `lib/connect-tabs.ts` is the same pattern for
 * Connect's row, and this is deliberately a SECOND SMALL FUNCTION rather than a
 * generalisation: `E594` is the id for filtering wherever `PAGE_TABS` is read,
 * it touches shared chrome on every row in the app, and it is not this brief.
 *
 * ⚠⚠ NO `requires` MEANS EVERYONE SIGNED IN — the field's own contract in
 * `nav.ts`, kept rather than re-stated.
 */
export function profileTabs(viewer: Viewer | null): PageTabItem[] {
  const all = PAGE_TABS["/profile"] ?? [];
  return all.filter(
    (t) => !t.requires || (viewer !== null && hasCapability(viewer, t.requires))
  );
}
