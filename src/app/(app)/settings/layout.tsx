/* ⚠ `SettingsTabs` AND `ConsoleHeroRow` ARE NO LONGER MOUNTED HERE (ruling 61)
   and neither file is deleted (`E164`). `SettingsTabs` is still mounted by
   `/settings/packages`, which sits outside this layout.
   ⚠ SUPERSEDED, quoted not deleted (`E164`):
   //   import { SettingsTabs } from "@/components/settings/SettingsTabs";
   //   import { ConsoleHero, ConsoleHeroRow } from "@/components/casing/ConsoleHero"; */
import { ConsoleHero } from "@/components/casing/ConsoleHero";
import { SettingsSectionList } from "@/components/settings/SettingsSectionList";
import { PageTabs } from "@/components/casing/PageTabs";
import { tabSequenceFor } from "@/lib/nav";
import { profileTabs, ACCOUNT_MENU_NAME } from "@/lib/profile-tabs";
import { canProvideServices } from "@/lib/access";
import { SettingsTitle } from "@/components/settings/SettingsTitle";
import { guardPage } from "@/lib/guard";

/**
 * Settings shell (J2.4 WS-G / E013).
 *
 * NOW INSIDE THE CONSOLE. This used to be its own full-page area with its own
 * logo header and a "← Back to dashboard" link — a second chrome for a
 * signed-in user, reached from the same avatar as everything else. Moving it
 * under `(app)` gives it the dark rail, the console header and the footer,
 * which is WS0's rule applied: one casing for every authenticated page. The
 * back link goes with the second header, because the rail is the way out now.
 *
 * ONE DOOR → AN IN-PAGE LEFT-NAV, and deliberately not the Task Panel. The page
 * heading comes from the same definition the nav does, so the two cannot
 * disagree about what a page is called.
 *
 * ⚠⚠ SUPERSEDED BY TOP TABS, QUOTED NOT DELETED (`P2-J1.1-E046`, 2026-09-06).
 * The sentence above stays because its SECOND half is still law — the heading and
 * the tabs read one definition, and `SettingsTabs` reads the same `SETTINGS_NAV`.
 * Only the SHAPE changed.
 *
 * SCOTT, 2026-09-06: *"I DO NOT WANT THIS LAYOUT (DOUBLE MENUS - LOOKS LIKE
 * SHIT)"* … *"top tabs works, consistent with the other parts of the app and
 * obvious."* The aside put a vertical menu beside the console's own dark rail —
 * two vertical menus on one screen.
 *
 * ⚠ THIS FINISHES A MOVE THAT WAS HALF-MADE. The note above records Settings
 * being pulled out of its own chrome into the console, *"which is WS0's rule
 * applied: one casing for every authenticated page."* THE SECOND CHROME WENT AND
 * THE SECOND MENU STAYED. It goes now.
 *
 * ── ⚠⚠⚠ AND THE SHAPE CHANGED A THIRD TIME, 2026-09-25 (ruling 61) ───────
 *
 * ⚠⚠⚠ **RULING 62 — `E046` RE-READ BY SCOTT, AND THE SENTENCE ABOVE IS NOT
 * WHAT HE MEANT.** Scott, 2026-09-25: *"I said that the settings menu as it was
 * (across the top) ugly. But it and the panameer admin menus are to big to be
 * tabs...so they became vertical tabs."*
 * ⚠⚠ **THE OBJECTION WAS THE HORIZONTAL ROW, NOT THE VERTICAL LIST. VERTICAL
 * WAS SCOTT'S OWN ANSWER, NOT THE DEFECT.**
 *
 * ⚠ SUPERSEDED, quoted not deleted (`E164`) — **my reading, right by the wrong
 * route**, and corrected here because the wrong route is load-bearing:
 * //   THE SECTION LIST IS BACK, AND THE E046 OBJECTION ABOVE IS NOT BEING
 * //   IGNORED — ITS CONDITION IS GONE. Scott rejected the vertical sub-nav
 * //   because it sat beside the console's own dark VERTICAL rail — two vertical
 * //   menus on one screen. E559 REMOVED THAT RAIL, so there is now one vertical
 * //   list here, not two. That is a changed condition, not a contradiction.
 * ⚠⚠⚠ **WHY THE CORRECTION MATTERS RATHER THAN BEING PEDANTRY:** the
 * changed-condition reading makes this list **conditional on the rail's
 * absence** — so **the next time any rail appears it would look overturnable.**
 * ⚠ It is not. **It was always the right shape**, and it stays whatever the
 * shell does.
 *
 * ⚠⚠ **RULING 62a, THE GENERAL RULE:** *a menu too big to be tabs becomes a
 * VERTICAL LIST — never a tab row that scrolls, wraps or truncates.* ⚠ Wrapping
 * fixes a row that is **the right shape and slightly too long**; it does not fix
 * **a menu that should never have been a row.** ⚠⚠ That is the difference
 * between the Account Information row above (six items, wrapped) and these eight
 * sections (a list).
 *
 * ⚠⚠ **WHAT THE TOP ROW IS NOW IS A DIFFERENT QUESTION ENTIRELY.** It is the
 * **ACCOUNT INFORMATION** row — which section of the account you are in — while
 * the list beside the content says which SETTING. ⚠ `E636` measured that this
 * page rendered **no Account Information row at all**, so `Settings` was a tab
 * you could click and then lose the row from: *"the tabs lead to pages without
 * the tabs"*, one section over from where Scott first said it.
 *
 * AUTHORITATIVE SERVER-SIDE GATE stays exactly where it was. `guardPage` is
 * what enforces access independently of the edge proxy — the edge is a fast
 * first line and must never be the only one.
 *
 * ⚠⚠ `authenticated`, NOT `canProvideServices` (`P2-J1.1-E046`, 2026-09-06).
 * ⚠ SUPERSEDED, quoted not deleted: this sentence read *"what enforces
 * PROVIDER-ONLY"*, and the guard read `guardPage("canProvideServices")`.
 *
 * A buyer could not reach their own password, email, 2FA, notification
 * preferences or billing. Scott ruled the whole tree open — *"we should add them
 * and I will fix them as we go thru the build process"* — because fit is
 * discovered by using a page, and one nobody can open cannot be evaluated.
 * ⚠ THIS IS ONE OF THREE LAYERS. `route-access.ts` and each page's own
 * `guardPage` moved with it; widening any one alone leaves the others refusing.
 */
export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  /*
    ⚠ STILL `authenticated`, AND DELIBERATELY (`P2-J1.1-E050`). This gates the
    WHOLE tree; narrowing it would re-break every other tab — the defect `E046`
    just fixed. The three seller-only pages narrow INDIVIDUALLY, at their own
    route prefix and their own `guardPage`.
  */
  const viewer = await guardPage("authenticated");

  return (
    <>
      {/*
        ⚠ THE EYEBROW IS THE PAGE NAME — Scott: *"the top left text is the page
        name."* So it reads SETTINGS, and the `<h1>` under it is the tab you are
        standing on, read from the SAME definition the tabs are.
        ⚠ `SettingsHeading` IS NO LONGER MOUNTED and is NOT deleted (`E164`): its
        `<h1>` moved into the hero, and its blurb is the "descriptive paragraph"
        `E048` says this header must not carry. REPORTED — that is shipped copy
        no longer rendered, and Scott rules on whether it returns elsewhere.
      */}
      {/*
        ── ⚠⚠⚠ THE ACCOUNT INFORMATION ROW COMES BACK (ruling 61, WS-A) ────────

        ⚠⚠ **`E636` MEASURED THAT `/settings` RENDERED NO ACCOUNT INFORMATION ROW
        AT ALL** — it showed its eight settings sections AS the tab row, ⚠⚠⚠ **so
        a member who clicked `Settings` LOST THE ACCOUNT INFORMATION NAVIGATION
        ENTIRELY.** ⚠ That is Scott's own 2026-09-25 complaint — *"the tabs lead
        to pages without the tabs"* — **in a second section**, and it is the same
        defect `E627` fixed on Learn.
        ⚠ `current="/settings"` so the row lights `Settings` and not a parent —
        the lie `E625` found on `/community`'s row.
      */}
      <PageTabs
        wrap
        eyebrow={ACCOUNT_MENU_NAME}
        sequence={tabSequenceFor("/profile")}
        tabs={profileTabs(viewer)}
        current="/settings"
      />
      <ConsoleHero eyebrow="Settings" title={<SettingsTitle />} />
      {/*
        ── ⚠⚠ THE SECTIONS BECOME AN IN-PAGE LIST, NOT A SECOND TAB ROW ───────

        ⚠⚠⚠ **TWO TAB ROWS STACKED WOULD BE THE `E046` DEFECT WITH THE MENUS
        TURNED SIDEWAYS** — Scott rejected *"DOUBLE MENUS"* once already. One row
        says which SECTION OF THE ACCOUNT you are in; the list says which
        SETTING. They are different questions and must not look like the same
        control twice.
        ⚠ **IT IS NOT THE LEFT RAIL AND DOES NOT SHARE ITS COMPONENT** — see
        `SettingsSectionList`'s docblock for ruling 61a and why `SettingsNav`
        could not simply be re-mounted.
        ⚠⚠ `SettingsTabs` IS NO LONGER MOUNTED HERE AND IS NOT DELETED (`E164`).
        It is still mounted by `/settings/packages`, which sits OUTSIDE this
        layout — so removing the file would break a live page.
        ⚠ SUPERSEDED, quoted not deleted (`E164`):
        //   <ConsoleHero eyebrow="Settings" title={<SettingsTitle />}>
        //     <ConsoleHeroRow>
        //       <SettingsTabs isProvider={canProvideServices(viewer)} />
        //     </ConsoleHeroRow>
        //   </ConsoleHero>
      */}
      <div className="mx-auto w-full max-w-6xl px-5 pt-5 sm:px-8 md:grid md:grid-cols-[210px_minmax(0,1fr)] md:gap-7">
        <SettingsSectionList isProvider={canProvideServices(viewer)} />
        <div className="min-w-0 pt-5 md:pt-0">{children}</div>
      </div>
    </>
  );
}
