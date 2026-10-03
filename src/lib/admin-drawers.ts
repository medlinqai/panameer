/**
 * ── ⚠⚠ WHICH ADMIN GROUPS EACH CONSOLE DRAWER SHOWS (`P2-ALL-E800`) ─────────
 *
 * ⚠ **SCOTT'S FINAL D2 CALL, 2026-10-03:** the right-side panel becomes
 * `Tasks · Transactions · Configuration · Activity · Reports`. `Transactions`
 * opens the Transaction Data links; `Configuration` opens Configuration Data
 * **and** Support Data together.
 *
 * ⚠⚠⚠ **IT IS A MAPPING, NOT A COPY OF THE LINKS.** `ADMIN_NAV` stays the one
 * place the fifteen destinations live, so adding or renaming one reaches the
 * panel and the gear's drawer without anybody remembering (`E585`). ⚠ A
 * hand-typed list in `TaskPanel` would have been the third copy.
 *
 * ⚠⚠ **IT IS ITS OWN MODULE SO A GATE CAN READ IT.** `TaskPanel` is a
 * `"use client"` component; a check script cannot import one without pulling
 * React in, and asserting this by grepping the component's source would be
 * asserting a regex (load-bearing rule 12's family).
 */
import { ADMIN_NAV, type NavGroup } from "@/lib/nav";

export type DrawerKey = "transactions" | "configuration";

export const DRAWER_GROUPS: Record<DrawerKey, readonly string[]> = {
  transactions: ["Transaction Data"],
  configuration: ["Configuration Data", "Support Data"],
};

/**
 * ⚠⚠ A TITLE THAT NO LONGER EXISTS YIELDS NOTHING RATHER THAN THROWING. A
 * renamed nav group must not take an admin's console down — but it must not
 * quietly empty a drawer either, which is why `check:task-panel` fails on it
 * instead (ruling 14: when the code a rule names goes away, the rule may not).
 */
export function drawerGroups(key: DrawerKey): NavGroup[] {
  return DRAWER_GROUPS[key]
    .map((title) => ADMIN_NAV.find((g) => g.title === title))
    .filter((g): g is NavGroup => !!g);
}
