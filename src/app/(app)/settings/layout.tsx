import { SettingsTabs } from "@/components/settings/SettingsTabs";
import { SettingsHeading } from "@/components/settings/SettingsHeading";
import { ConsoleHero, ConsoleHeroRow } from "@/components/casing/ConsoleHero";
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
      <ConsoleHero eyebrow="Settings" title={<SettingsTitle />}>
        <ConsoleHeroRow>
          <SettingsTabs isProvider={canProvideServices(viewer)} />
        </ConsoleHeroRow>
      </ConsoleHero>
      <div className="mx-auto min-w-0 max-w-5xl pt-6">{children}</div>
    </>
  );
}
