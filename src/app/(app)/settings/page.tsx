import Link from "next/link";
import { guardPage } from "@/lib/guard";
import { canProvideServices } from "@/lib/access";
import { settingsNavFor } from "@/lib/settings-nav";
import { getSettingsStatuses } from "@/lib/settings";

/**
 * ── ⚠⚠⚠ `/settings` IS A REAL LANDING PAGE (ruling 45 item 2, ruling 61) ──
 *
 * ⚠ **RULING 45 item 2, verbatim:** *"`/settings` GETS A REAL LANDING PAGE. It
 * is a `redirect()` at `src/app/(app)/settings/page.tsx:29` today. **Build the
 * page**: header, tab row, and a link to each section."*
 *
 * ── ⚠⚠ IT OVERTURNS `E609`'s REDIRECT, AND THE REASON IS NOT DISCARDED ───
 *
 * ⚠⚠⚠ **THIS IS A CONTRADICTION, NOT A SEQUENCE, SO RULE 13 IS THE RIGHT TOOL**
 * (ruling 60a). ⚠ Same subject — what `/settings` does — and opposite
 * instructions, so **the newest dated statement from Scott wins.**
 * ⚠ SUPERSEDED, quoted not deleted (`E164`) — the whole of the old route:
 * //   export default function SettingsIndex() {
 * //     redirect("/settings/contact");
 * //   }
 *
 * ⚠⚠ **`E609`'s REASONING SURVIVES AND IS SATISFIED, WHICH IS WHY THIS IS NOT A
 * REGRESSION.** Scott, 2026-09-23: *"`/settings` must not land on a page nobody
 * can change"* — the area used to open on Membership, which **writes zero rows**
 * and is a pure read. ⚠⚠⚠ **AN INDEX IS NOT THAT.** It is not a record a member
 * stares at and cannot affect; **it is a set of doors, and every one of them
 * leads somewhere they can change something.** ⚠ The objection was to landing on
 * a dead end, not to landing on a page that is not a form.
 *
 * ── ⚠ WHAT THIS PAGE DOES AND DOES NOT OWE ──────────────────────────────
 *
 * ⚠⚠ Ruling 45 names three things — **header, tab row, and a link to each
 * section.** Two of them come from the LAYOUT and are deliberately not repeated
 * here: the **Account Information row** and the **`Settings` hero** are rendered
 * by `settings/layout.tsx` for every page in the tree. ⚠⚠⚠ **REPEATING EITHER
 * WOULD BE THE `E046` "DOUBLE MENUS" DEFECT, OR THE DUPLICATE HEADING `E598`
 * SHIPPED** — the page owes the third thing only.
 *
 * ⚠⚠ **NO FIGURES, AND THAT IS RULING 45 item 1 APPLIED RATHER THAN DODGED:**
 * *"Settings takes what is real… No invented figure, no quiet variant."*
 * ⚠⚠⚠ **NOTHING ON THIS PAGE IS COUNTABLE ABOUT THE MEMBER.** The number of
 * sections is a fact about the MENU, not about them, and printing it would be a
 * figure wearing a label — the defect `E632` had to unpick three times over on
 * the path page. **So the header carries none.**
 *
 * ⚠ **THE LIST IS FILTERED BY CAPABILITY** — `settingsNavFor`, the same single
 * definition the section list and the page headings read, so this page cannot
 * offer a door that `route-access.ts` then refuses (`check:nav-reachable`'s bug
 * class).
 */
export const metadata = { title: "Settings · Panameer" };

export default async function SettingsIndex() {
  /* ⚠ `authenticated`, matching the layout's guard. Narrowing here would refuse
     a member the layout already let in — the three-layer rule in that file. */
  const viewer = await guardPage("authenticated");
  const sections = settingsNavFor(canProvideServices(viewer));
  const statuses = await getSettingsStatuses(viewer);

  return (
    <div className="pb-8">
      <h1 className="font-display text-[20px] font-bold tracking-[-0.3px] text-ink">
        Your settings
      </h1>
      <p className="mt-1.5 max-w-xl text-[14px] leading-relaxed text-ink-2">
        Where each part of your account stands. The list on the left is how you
        move between them.
      </p>

      {/*
        ⚠ A CARD PER SECTION, CARRYING THE BLURB `SETTINGS_NAV` ALREADY HOLDS —
        not new copy. ⚠⚠ The blurb exists precisely so a nav entry and a page
        heading *"cannot disagree about what a page is called"*, and reading it
        here keeps that one definition rather than opening a third.
      */}
      <ul className="mt-5 grid gap-2.5 sm:grid-cols-2">
        {sections.map((s) => (
          <li key={s.href}>
            <Link
              href={s.href}
              className="flex h-full min-h-[44px] flex-col rounded-brand border border-line bg-white p-4 transition-colors hover:border-magenta"
            >
              <b className="font-display text-[14.5px] font-bold leading-[1.3] text-ink">
                {s.label}
              </b>
              {/*
                ── ⚠⚠⚠ THE STATUS IS WHY THIS CARD EXISTS (ruling 77) ─────────

                ⚠ SCOTT, of the page before this: *"looks like a menu within
                the menu."* ⚠⚠ **THE RAIL AND THESE CARDS WERE THE SAME EIGHT
                LABELS AND BLURBS SIDE BY SIDE.** Ruling 77 settles which half
                gives way — *"de-duplicate data and logic; do not de-duplicate
                doors"* — **so the rail stays and the cards stop repeating it.**
                ⚠⚠⚠ **THE RAIL NAVIGATES; THE CARD SAYS WHICH SECTION NEEDS
                THE MEMBER.**
                ⚠ **`null` MEANS "NO HONEST STATUS", AND TWO SECTIONS RETURN
                IT** — Membership (no plan column; *"renews"* is a money claim)
                and Notification Settings (ruling 13 ships every category ON,
                so the line would read identically for everybody). ⚠⚠ Those two
                keep their blurb and gain nothing — **never an invented status,
                never a counted zero.**
              */}
              {statuses[s.href] ? (
                <span className="mt-1 text-[13px] font-semibold leading-snug text-ink">
                  {statuses[s.href]}
                </span>
              ) : (
                <span className="mt-1 text-[12.5px] leading-relaxed text-ink-2">
                  {s.blurb}
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
