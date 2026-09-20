import { PAGE_TABS, type PageTabItem } from "@/lib/nav";
import { hasCapability, type Viewer } from "@/lib/access";
import { tabsWithUnread } from "@/lib/messages";

/**
 * ── ⚠⚠ THE CONNECT ROW, FOR ONE VIEWER (`P2-J3-E593` WS-A) ────────────────
 *
 * ⚠⚠⚠ THE DEFECT THIS EXISTS TO PREVENT: a tab that a buyer can see and cannot
 * open. `E593` adds `Service Products`, which points at `/my-services` and
 * requires `canProvideServices` — and **`Connect` is in the BUYER menu**
 * (`REQUESTER_NAV`), by Scott's own `E588` WS-C ruling.
 *
 * ⚠⚠ MEASURED AT THE PREMISE GATE, AND IT IS WHY THIS FILE EXISTS RATHER THAN
 * A COMMENT: **nothing in the app filters a tab row by capability.**
 * `PageTabs` never reads `requires`; `tabsWithUnread` only attaches a badge.
 * ⚠⚠⚠ AND `check:nav-reachable` CANNOT CATCH IT — its §1 asks whether an
 * item's DECLARED capability matches its ROUTE'S. It never asks whether the
 * VIEWER can open it, so the gate stays green while the door stays dead.
 * ⚠ That is the `E579` family: an entry that looks like a door and is not.
 *
 * ── ⚠ DELIBERATELY SCOPED TO CONNECT, AND NOT ONE LINE WIDER ──────────────
 *
 * ⚠⚠ THE GENERAL FIX — capability-filtering wherever `PAGE_TABS` is read, plus
 * a gate that asks whether the viewer can open each item — IS CORRECT AND IS
 * **`P2-ALL-E594`**. It touches shared chrome on every tab row in the app,
 * which is outside this brief's blast radius. ⚠ **DO NOT WIDEN THIS FILE INTO
 * THAT.** It reads one key and is named for it.
 *
 * ── ⚠⚠ IT FILTERS; IT DOES NOT DISABLE ────────────────────────────────────
 *
 * ⚠ A tab the viewer cannot open is REMOVED, not greyed. `PageTabs`'s own
 * docblock records the rule it is keeping faith with: *"UPCOMING STEPS STAY
 * CLICKABLE. GREYING IS A STATE, NOT A LOCK."* ⚠⚠ A greyed tab says *"not
 * yet"*; a buyer will never have `canProvideServices`, so *"not yet"* would be
 * a lie. **Absent is the honest rendering of "not yours".**
 */
export function connectTabs(viewer: Viewer | null, unread: number): PageTabItem[] {
  const all = PAGE_TABS["/connect"] ?? [];
  const allowed = all.filter(
    /* ⚠ No `requires` means everyone signed in — the field's own contract in
       `nav.ts`, kept rather than re-stated. */
    (t) => !t.requires || (viewer !== null && hasCapability(viewer, t.requires))
  );
  return tabsWithUnread(allowed, unread);
}
