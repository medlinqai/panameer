"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { settingsNavFor, settingsPageFor } from "@/lib/settings-nav";

/**
 * ── ⚠⚠⚠ THE SETTINGS SECTION LIST. **IT IS NOT THE LEFT RAIL.** ──────────
 *
 * ⚠⚠⚠ **READ THIS BEFORE RENAMING ANYTHING HERE.** Ruling 61a, and Scott's own
 * words of 2026-09-24: *"TO BE CLEAR — the left rail is ONLY carrying the admin
 * functions for the admin role. It is NOT visible to other roles."*
 *
 * ⚠⚠ **AN EIGHT-SECTION "LEFT RAIL" ON `/settings`, VISIBLE TO EVERY MEMBER,
 * WOULD READ AS A DIRECT CONTRADICTION OF THAT RULING — AND WOULD BE ONE IF IT
 * SHARED THE COMPONENT.** ⚠ So this is an **IN-PAGE SECTION LIST**: its own
 * component, its own name, no `rail` anywhere in it, and **no import from the
 * app shell.** ⚠⚠⚠ **THE NEXT PERSON TO GREP `left rail` MUST NOT FIND TWO
 * THINGS WEARING ONE NAME** (ruling 51's family).
 *
 * ⚠ **THE APP-SHELL RAIL IS `AppRail.tsx`, AND IT IS NOT MOUNTED ANYWHERE** —
 * `E559` replaced it with a horizontal band on every signed-in page. **Nothing
 * here touches it.**
 *
 * ── ⚠⚠ WHY `SettingsNav.tsx` WAS NOT SIMPLY RE-MOUNTED (ruling 53a) ──────
 *
 * ⚠ 53a says a reuse claim must **name the file and confirm it is importable**,
 * so I checked before writing: **`src/components/settings/SettingsNav.tsx`
 * EXISTS**, is the original in-page sub-nav, and was orphaned (never deleted —
 * `E164`) when `E046` replaced it with top tabs.
 * ⚠⚠⚠ **IT IS NOT REVIVABLE AS IT STANDS, AND THE REASON IS A REAL DEFECT:** it
 * reads **`SETTINGS_NAV` directly** rather than **`settingsNavFor(isProvider)`**,
 * so it does **no capability filtering**. ⚠ That filter shipped at `P2-J1.1-E050`
 * *after* this component was orphaned, and `E594` is the id for the general
 * case: *"nothing between the nav list and the DOM filters by who is looking"*,
 * so a raw list can show an entry that bounces the viewer to
 * `/dashboard?noaccess=1`. ⚠⚠ **RE-MOUNTING IT VERBATIM WOULD HAVE RE-OPENED A
 * CLOSED BUG** — the opposite outcome to `E629`, where `StreakTile` *was*
 * revivable and reviving it was right. **The check is what tells them apart.**
 * ⚠ Its reasoning is inherited rather than re-derived, and still holds:
 * //   A CONVENTIONAL IN-PAGE SUB-NAV … explicitly NOT the Task Panel …
 * //   Settings is eight siblings with no ordering and no history worth
 * //   surfacing; a left-nav is the shape for that.
 *
 * ── ⚠⚠⚠ `E046` — AND RULING 62, WHICH CORRECTS WHY THIS IS ALLOWED ───────
 *
 * ⚠ **SCOTT, 2026-09-25, RE-READING HIS OWN 09-06 RULING:** *"I said that the
 * settings menu as it was (across the top) ugly. But it and the panameer admin
 * menus are to big to be tabs...so they became vertical tabs."*
 * ⚠⚠⚠ **THE OBJECTION WAS THE HORIZONTAL ROW. THE VERTICAL LIST WAS HIS OWN
 * ANSWER, NOT THE DEFECT.** ⚠⚠ So *"DOUBLE MENUS — LOOKS LIKE SHIT"* was never a
 * ruling against this shape; **this shape is the thing it asked for.**
 *
 * ⚠ SUPERSEDED, quoted not deleted (`E164`) — **my reading, which reached the
 * right build for the wrong reason:**
 * //   THE OBJECTION WAS TO A COLLISION THAT NO LONGER EXISTS … it sat beside
 * //   the console's own dark VERTICAL rail — two vertical menus on one screen.
 * //   E559 REMOVED THAT RAIL, so the condition the 09-06 ruling named is gone.
 * //   THAT IS A CHANGED CONDITION, NOT A CONTRADICTION.
 * ⚠⚠⚠ **AND THE WRONG REASON WAS LOAD-BEARING:** it made this list conditional
 * on the app-shell rail being absent, so **the next time any rail appeared this
 * component would look overturnable.** ⚠ It is not. **It was always the right
 * shape**, and it stays whatever the shell does.
 *
 * ⚠⚠ **RULING 62a:** *a menu too big to be tabs becomes a VERTICAL LIST — never
 * a tab row that scrolls, wraps or truncates.* ⚠ Wrapping fixes a row that is
 * the right shape and slightly too long; **it does not fix a menu that should
 * never have been a row.** ⚠⚠ Eight sections with long labels is the second
 * case, which is why this is a list and the six-item Account Information row
 * above it is not.
 * ⚠ **62c: `/hire` IS EXEMPT** — it is a SEQUENCE, the order is the information,
 * and a vertical list would lose the only thing it is for (ruling 50e governs).
 *
 * ── ⚠ IT WRAPS ON A PHONE. IT DOES NOT SCROLL, AND IT DOES NOT STACK EIGHT ──
 *
 * ⚠⚠ `SettingsNav`'s own warning is inherited and still true: *"eight labels
 * stacked as a column on a phone push the actual settings off the bottom of the
 * screen."* ⚠ But its answer — `overflow-x-auto` — is the shape `E609` and
 * `E633` have now both ruled against: **a scroller can slice a word mid-stroke
 * and can hide the item you are standing on.**
 * ⚠⚠⚠ **SO IT WRAPS BELOW `md` AND BECOMES A COLUMN AT `md`**: every section
 * visible, the current one always on screen, and no 352px wall of stacked rows
 * before the settings themselves.
 */
export function SettingsSectionList({ isProvider }: { isProvider: boolean }) {
  const pathname = usePathname();
  /* ⚠⚠ FILTERED, NOT RE-WRITTEN — one definition, minus what this viewer's
     capability does not open. This is the line `SettingsNav` is missing. */
  const items = settingsNavFor(isProvider);
  /* ⚠ The SAME matcher the heading and the old tab row use, so a nested path
     like `/settings/security/2fa` still lights its parent section. */
  const active = settingsPageFor(pathname);

  /*
    ── ⚠⚠⚠ IT DOES NOT RENDER ON THE INDEX, AND THAT IS NOT A SPECIAL CASE ──

    ⚠⚠ **MEASURED AT 390px: ON `/settings` THIS LIST AND THE PAGE'S OWN SECTION
    CARDS ARE THE SAME EIGHT LINKS, STACKED ONE ABOVE THE OTHER.** ⚠ The index
    IS a list of the sections; putting a second one above it is the duplication
    `E628` fixed on the Learn catalogue — *"the same destinations, twice, in two
    vocabularies"* — and the shape Scott rejected outright as *"DOUBLE MENUS"*.
    ⚠⚠⚠ **THE CARDS WIN BECAUSE THEY CARRY THE BLURB AND THIS CANNOT.** A 210px
    column has no room for *"Your password, connected sign-ins and two-step
    verification"*, and the blurb is the reason an index is worth landing on.
    ⚠ Everywhere else the list is the persistent *"which setting am I in"*
    navigation and renders normally — so this is one page, not a variant.
    ⚠⚠ It is decided HERE rather than in the layout because a server layout
    cannot read the pathname, and this component already does.
  */
  if (pathname === "/settings") return null;

  return (
    <nav
      aria-label="Settings sections"
      className="flex flex-wrap gap-1 md:flex-col md:flex-nowrap md:gap-0.5"
    >
      {items.map((item) => {
        const current = active?.href === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={current ? "page" : undefined}
            className={
              "flex min-h-[44px] items-center rounded-[10px] px-3 text-[13.5px] font-semibold transition-colors " +
              (current
                ? "bg-magenta/10 text-magenta"
                : "text-ink-2 hover:bg-ink/5 hover:text-ink")
            }
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
