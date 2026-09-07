"use client";

import { usePathname } from "next/navigation";
import { PageTabs } from "@/components/casing/PageTabs";
import { settingsNavFor, settingsPageFor } from "@/lib/settings-nav";
import { tabSequenceFor } from "@/lib/nav";

/**
 * The Settings tab row (`P2-J1.1-E046`, 2026-09-06).
 *
 * SCOTT, 2026-09-06: *"HOWEVER, I DO NOT WANT THIS LAYOUT (DOUBLE MENUS - LOOKS
 * LIKE SHIT)."* …*"top tabs works, consistent with the other parts of the app
 * and obvious."*
 *
 * ⚠ REPLACES `SettingsNav`, WHICH IS NOT DELETED. That file and its reasoning
 * stay on disk — the decision it recorded was correct for its moment, and the
 * project does not delete files (`E164`). It is simply no longer mounted.
 *
 * ⚠⚠ THE LABELS COME FROM `SETTINGS_NAV`, NOT FROM A LIST TYPED HERE. That is
 * the same single definition `SettingsNav` and `SettingsHeading` already read,
 * and it exists so a nav entry and a page heading *"cannot disagree about what a
 * page is called"* — the drift `P1-J2.1-E025` actually shipped once. A
 * hand-written tab list would re-open exactly that gap.
 *
 * ⚠⚠ AND THAT IS WHY THIS SET IS NOT IN `PAGE_TABS`. `PAGE_TABS` holds sets that
 * have no other home; the settings set already HAS a home, and copying it into
 * nav.ts would create the second definition the rule above forbids. Its MODE is
 * still declared explicitly in `TAB_SEQUENCE["/settings"]`, and
 * `check:community` asserts that entry exists — so the set is classified by a
 * decision, not by `tabSequenceFor`'s `?? "none"` default.
 *
 * ⚠ `none`, THEREFORE UNNUMBERED. Scott's rule (`nav.ts`): *"we could define
 * each menu sequential or parallel, then number the sequential only."* Settings
 * is parallel slices of one area — nobody works through Password & Security to
 * reach Billing, and none of them completes.
 */
export function SettingsTabs({ isProvider }: { isProvider: boolean }) {
  const pathname = usePathname();
  /* ⚠ The list is FILTERED, not re-written — same single definition, minus the
     tabs this viewer's capability does not open (`P2-J1.1-E050`). */
  const items = settingsNavFor(isProvider);
  const active = settingsPageFor(pathname);

  /*
    ── ⚠⚠ THE LIGHT TILE THAT SITS ON THE GRADIENT'S EDGE (`P2-J1.1-E048`) ─────

    Learn puts four WHITE stat cards overlapping its hero's lower edge; Settings
    puts this row in that position, and it is a light surface for the same
    reason — a dark row on a dark gradient would not read as sitting ON it.
    ⚠ Settings has NO stat cards and gains none. This is the only thing in that
    slot.

    ⚠⚠ THE HORIZONTAL OVERFLOW SURVIVES, WHICH WAS THE THING AT RISK. `PageTabs`
    already scrolls (`overflow-x-auto`) because Settings has ten tabs where Learn
    has three, and moving the row onto the gradient does not touch that: the
    scroller is INSIDE this tile, so the tile clips its own corners while the row
    scrolls within it. No tab is truncated and none is dropped.

    ⚠ AND THAT IS THE ONE PLACE "SAME AS LEARN'S CARDS" CANNOT BE LITERAL, SO IT
    IS REPORTED RATHER THAN FUDGED. Scott liked *"the way the cards line up on
    mobile"* — Learn's four tiles reflow 1→2→4 across breakpoints. A TAB ROW must
    not reflow into a ten-row stack: that is not a tab row, and it would trade a
    horizontal scroll nobody minds for a vertical wall that pushes the page off
    the screen. It stays one scrolling row at every width, which IS how a tab row
    degrades correctly. The tile, the overlap and the edge all match Learn.
  */
  return (
    <div className="overflow-hidden rounded-brand border border-line bg-white px-3 shadow-brand">
    <PageTabs
      tabs={items.map((i) => ({ label: i.label, href: i.href }))}
      /* ⚠ The ACTIVE item's href, resolved by the same matcher the heading uses,
         so a nested path like /settings/security/2fa still lights its parent. */
      current={active?.href ?? ""}
      sequence={tabSequenceFor("/settings")}
      /* ⚠ The card supplies the boundary now, so the row drops its own rule. */
      className="[&>div]:border-0 [&>div]:mb-0"
    />
    </div>
  );
}
