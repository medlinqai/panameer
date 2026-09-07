"use client";

import { usePathname } from "next/navigation";
import { PageTabs } from "@/components/casing/PageTabs";
import { SETTINGS_NAV, settingsPageFor } from "@/lib/settings-nav";
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
export function SettingsTabs() {
  const pathname = usePathname();
  const active = settingsPageFor(pathname);

  return (
    <PageTabs
      tabs={SETTINGS_NAV.map((i) => ({ label: i.label, href: i.href }))}
      /* ⚠ The ACTIVE item's href, resolved by the same matcher the heading uses,
         so a nested path like /settings/security/2fa still lights its parent. */
      current={active?.href ?? ""}
      sequence={tabSequenceFor("/settings")}
    />
  );
}
