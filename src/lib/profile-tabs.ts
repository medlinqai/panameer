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
/**
 * ── ⚠⚠⚠ THE MENU'S NAME, IN ONE PLACE (ruling 31b, brief 10 WS-A item 1) ──
 *
 * ⚠ Scott's SIT sheet names this menu **`Account Information`**, and the name is
 * rendered as the row's EYEBROW — `PageTabs` calls that *"a room label, not a
 * decoration"*, the thing that stops a bare row of words reading as steps.
 *
 * ⚠⚠⚠ **IT IS A CONSTANT BECAUSE IT WAS WRITTEN OUT EIGHT TIMES.** Measured
 * 2026-09-25: the literal `eyebrow="MY PROFILE"` appeared by hand at **eight
 * mount sites across six files** — `/profile`, `/company` (×2), `/stats` (×2),
 * `/account-health`, `/community/score`, and `/providers/[id]` behind its
 * `isOwner` branch. ⚠⚠ **ONE CONCEPT IN EIGHT PLACES, KEPT IN STEP BY HAND**
 * (`E585`) — and the failure mode is specific and ugly: **renaming the menu
 * means editing eight lines, and missing one leaves the row calling itself two
 * different things on two pages of the same row.**
 * ⚠ **I FIRST COUNTED FIVE AND WROTE THAT HERE.** The three I missed were second
 * renders inside files I had already edited, because the replace was not global.
 * ⚠⚠ **CORRECTED IN PLACE RATHER THAN QUIETLY** — a stated count that is wrong
 * is the half somebody trusts next (the 2026-09-23 rules, 6).
 * ⚠ It lives beside `profileTabs` because the name and the tabs are one fact
 * about one menu, and a gate can now IMPORT it rather than restating the string
 * (**ruling 58** — a gate that reimplements the rule it tests asserts itself).
 */
export const ACCOUNT_MENU_NAME = "ACCOUNT INFORMATION";

export function profileTabs(viewer: Viewer | null): PageTabItem[] {
  const all = PAGE_TABS["/profile"] ?? [];
  return all.filter(
    (t) => !t.requires || (viewer !== null && hasCapability(viewer, t.requires))
  );
}
