"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  MARKETING_NAV,
  Btn,
} from "@/components/marketing/brand";
import { Logo } from "@/components/Logo";

/**
 * THE PUBLIC HEADER — one row on every public page (WS-6b).
 *
 * It used to be the marketing pages' header while /learn and /verify rendered
 * PublicTopNav: a bigger logo, a two-item nav, a "Get Started" button. Two
 * headers on one product, and the difference was visible the moment anyone
 * followed the nav's own "Learn" link. This is the survivor; PublicTopNav is
 * retired.
 *
 * Sticky: wordmark, nav, Log In / Sign Up, mobile menu.
 *
 * E014 — THE HEADER IS THE WORDMARK ONLY. E001 put the badge under it as part
 * of a lockup, on the reasoning that a wordmark alone says a name while the
 * badge says what the name is for. True, but it was saying it twice: the hero
 * begins with the same four beats 200px below, in 60px type, and the header
 * copy was 10.5px uppercase — the version nobody reads, competing with the
 * version everybody does.
 *
 * Removing it also removes the reason for the absolute positioning E002 needed.
 * The tagline was pinned under the wordmark so it added no height and the nav
 * could stay centred on the wordmark rather than on a two-line block. With the
 * tagline gone the row is what it looks like — one line of items, all vertically
 * centred on the same baseline, no compensation required.
 *
 * The badge still renders in the hero, from BRAND_BADGE_SHORT (D1).
 */
export function MarketingHeader() {
  const [open, setOpen] = useState(false);
  /*
    WS-6b — THE ACTIVE NAV ITEM COMES FROM THE PATH, not from a prop.

    This header now renders on every public page (home, /find-work, /learn,
    /explore, /verify), and threading an `active` prop through five layouts is
    five chances to pass the wrong one. usePathname is already available — this
    component is a client component for the mobile menu — so the header answers
    the question itself.

    Prefix match, not equality, so /learn/<path>/<lesson> still lights "Learn".

    ⚠ AN ANCHOR IS NEVER "THE CURRENT PAGE". Pricing and Enterprise are
    `/hire-talent#value` and `/hire-talent#punchout` — sections of a page, not
    pages. Stripping the hash and comparing paths marked all three of Hire
    Talent, Pricing and Enterprise active at once, which is three answers to a
    question that has one. Hash hrefs are excluded outright; `aria-current` is
    a claim about the document, and a jump link inside it is not a different
    document.

    (Those two hrefs pointed at `/#…` until brief_public_pages_ia moved the
    sections to /hire-talent. The exclusion below is what kept the bad state
    from ALSO lighting up the home while they were stale.)
  */
  const pathname = usePathname();
  const isActive = (href: string) => {
    if (href.includes("#")) return false;
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(href + "/");
  };

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-white/90 backdrop-blur-[10px] backdrop-saturate-150">
      <div className="mx-auto flex h-[70px] max-w-[1180px] items-center gap-8 px-6">
        {/*
          Through <Logo>, not a second copy of the asset path — this header was
          how the old wordmark survived the last logo change (one file still
          pointed at the retired mark).

          `flex items-center` on the wrapper rather than the old `relative`:
          nothing is pinned to it now, and the mark centres on the row itself.
        */}
        {/*
          E018 — THE WORDMARK IS OPTICALLY CENTRED, NOT BOX-CENTRED.

          `items-center` already centred the logo's BOX, which is why this
          looked like it should be right and wasn't. The artwork is the problem:
          in the 524×132 asset the looped P spans rows 9–114, but "anameer" —
          all lowercase, no ascenders, no descenders — sits at rows 60–109. So
          the word the eye actually reads occupies the BOTTOM HALF of the box,
          and centring the box hangs the word low against nav text.

          Measured on the asset, converted to the 32px render:
            alpha-weighted ink centroid   1.75px below box centre
            x-height band ("anameer")     4.48px below box centre

          The truth is between them — the P reads as a genuine ascender, so it
          should pull the centre up somewhat, but not by its full height. 3px
          is that middle, and it is one number to change if Scott wants more or
          less on the walk.

          On the <Image>, not the <Link>: the click target stays where the
          layout put it.
        */}
        <div className="flex shrink-0 items-center">
          {/*
            ⚠ h-10, RAISED FROM h-8, AND THE SIZE WAS MEASURED NOT CHOSEN.

            Four nav items and two buttons were outweighing the brand: 32px of
            mark in a 71px header, 127px wide. Measured on the real header at
            1562 / 1200 / 390 — identical at all three, since the header height
            does not respond:

                h-8   127.0 x 32   45% of header height  (was)
                h-9   142.9 x 36   51%
                h-10  158.8 x 40   56%                   (shipped)
                h-11  174.7 x 44   62%

            h-10 leaves 15.5px of clearance above and below inside the 71px row;
            h-11 leaves 13.5px and starts crowding the button line. Header height
            and nav alignment are untouched — only the mark grows.

            ⚠ THE -3px OPTICAL LIFT IS LEFT AS IT WAS. It exists because the P
            reads as a true ascender and pulls the optical centre up; at 40px the
            same 3px is proportionally a smaller lift than it was at 32px. Whether
            it wants to grow with the mark is an eyeball call for the walk, not a
            number to derive — flagged, not changed.
          */}
          <Logo className="h-10 w-auto -translate-y-[3px]" priority />
        </div>

        {/*
          E014(iii) — ROOM TO BREATHE. Six links at a 26px gap, pushed right by
          the tagline's old `ml-3.5`, clustered into the middle-right of the row
          and read as one dense block. The gap opens to 34px (28px at the md
          breakpoint, where six links still have to fit beside two buttons) and
          the left offset goes, so the nav starts where the wordmark ends
          instead of a step further in.

          E038 — AND NOW IT IS ITS OWN ZONE. Widening the gap fixed the density
          and left the position wrong: the nav was still the second item in a
          left-packed row, so it sat against the wordmark with all the slack
          dumped between it and the buttons. `flex-1 justify-center` makes the
          middle zone take every remaining pixel and centre its contents in
          them, which is what "equidistant from logo and actions" actually
          requires — the two outer zones are different widths, so centring the
          nav in the ROW would not centre it between them.
        */}
        <nav className="hidden flex-1 justify-center gap-7 text-[15px] font-semibold text-ink-2 md:flex lg:gap-[34px]">
          {MARKETING_NAV.map((item, i) => {
            const on = isActive(item.href);
            /*
              ⚠ THE `item.primary` BRANCH IS GONE (E028), AND HERE IS WHY IT WAS
              A BUG RATHER THAN A STYLE.

              It rendered a promoted item with `font-bold text-magenta`
              UNCONDITIONALLY — the same treatment `isActive` gives the current
              page. So the one promoted item ("AI Assessment") read as active on
              every page, and every page showed TWO items looking selected. It
              also pointed at `/`, so on the home page it was doubly wrong: the
              genuinely-active item and the always-magenta item were different
              links.

              ⚠ IF ANYTHING IS EVER PROMOTED AGAIN: PROMOTION USES WEIGHT,
              ACTIVE KEEPS COLOUR. They must be different signals. Reusing
              magenta for "important" and for "you are here" is what collided,
              and it will collide again the moment both are true at once.
            */
            return (
              <Link
                key={`${item.label}-${i}`}
                href={item.href}
                aria-current={on ? "page" : undefined}
                className={
                  "whitespace-nowrap transition-colors hover:text-magenta " +
                  (on ? "font-bold text-magenta" : "")
                }
              >
                {item.label}
              </Link>
            );
          })}

          {/*
            ⚠ THE SELLER DOOR IS GONE FROM HERE (P1-J0.4-E002). "For Experts"
            rendered as a seventh item, set apart by a left border; Scott removed
            it on 2026-08-15 for header crowding. The six above are the whole
            nav. `/find-work` is a header item again (E029) — see the note
            on MARKETING_PROVIDER_DOOR, which is kept for the paper trail.
          */}
        </nav>

        {/*
          `ml-auto` is gone: the nav's `flex-1` now owns the slack, and leaving
          an auto margin here would fight it for the same space and pull the
          nav back off centre.
        */}
        {/*
          ── ⚠ THE AUTH CLUSTER JOINS AT lg, NOT md (P1-ALL-E004) ──────────────

          This header overflowed every public page except `/` at exactly 768 and
          for ~27px above it. Same defect class as `P1-ALL-E001` in the app
          header, fixed at `c192009`: fixed, `shrink-0` clusters colliding at a
          named breakpoint.

          THE ARITHMETIC, measured on /hire-talent at 768 rather than derived:

            logo            159   shrink-0
            nav             336   shrink-1, but nowrap children floor it here
            Log In/Sign Up  212   shrink-0
            gap-8 x2         64
            px-6  x2         48
                            ───
                            819   required, against 768 available

          ⚠ `scrollWidth` REPORTED 795, NOT 819. It omits the end padding once
          content overflows (`pitfalls.md`, `c192009`) — 795 + 24 = 819. Budgeting
          against the reported figure would have left the fix 24px short, which is
          exactly how the app-header fix nearly went wrong.

          `md` is 768, so the nav AND the auth cluster both switched on at the one
          width where the ☰ switched off — three desktop pieces at their tightest
          and two of them unable to give.

          THE SMALLEST NAMED BREAKPOINT THAT CLEARS 819 IS lg (1024):

            at 1024   159 + 354 (nav at its lg gap) + 212 + 64 + 48 = 837  ✓
            at 1023   159 + 336 + 21 (☰) + 64 + 48          = 628  ✓
            at  768   same 628                                       ✓

          ⚠ THE AUTH CLUSTER GIVES, NOT THE NAV, and not the type size. It is
          212px of the 819 and the ☰ drawer below already contains BOTH buttons —
          verified in the DOM, not assumed — so nothing becomes unreachable. The
          four labels stay visible from 768 because a tablet has room for them:
          628 of 768. The nav's font and Scott's four labels (`P1-J0-E222`,
          yesterday) are untouched.
        */}
        <div className="hidden shrink-0 items-center gap-3 lg:flex">
          {/*
            E003 — LOG IN IS A CONTROL NOW, not bold body text. It was
            `font-bold` with no colour of its own, inheriting `--color-ink`,
            which the dark theme repoints to near-white — on a header whose
            `bg-white/90` the dark theme never repainted. White on white; it
            only appeared when you selected it. The surface is theme-locked now
            (globals.css), and this is additionally a ghost button: an explicit
            colour, a border, and the secondary half of the button standard
            beside Sign Up's solid primary.
          */}
          <Btn href="/login" variant="white">
            Log In
          </Btn>
          <Btn href="/join">Sign Up</Btn>
        </div>

        {/*
          ⚠ lg, MATCHING THE AUTH CLUSTER. If this stayed `md:hidden` while the
          buttons moved to `lg:flex`, then between 768 and 1023 there would be no
          Log In and no Sign Up ANYWHERE — the row would not have them and the ☰
          that carries them would be hidden. That is the trap in moving one
          breakpoint without the other, and it is why the guard asserts both
          buttons have non-zero size at EVERY width rather than only at the ends.
        */}
        <button
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle navigation"
          aria-expanded={open}
          className="ml-auto cursor-pointer text-2xl lg:hidden"
        >
          ☰
        </button>
      </div>

      {/*
        ⚠ THE DRAWER KEEPS EVERYTHING, including the four nav items that are also
        visible in the row between 768 and 1023. The duplication is deliberate:
        one drawer with the same contents at every width beats a drawer whose
        contents change at a breakpoint, and a person who opens it at 800px and
        finds the nav there is not surprised by it.
      */}
      {open && (
        <div className="border-t border-line bg-white px-6 py-4 lg:hidden">
          <nav className="flex flex-col gap-1 text-[15px] font-semibold text-ink-2">
            {MARKETING_NAV.map((item, i) => {
              const on = isActive(item.href);
              return (
                <Link
                  key={`${item.label}-${i}`}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  aria-current={on ? "page" : undefined}
                  className={
                    /*
                      ⚠ THE `item.primary` BRANCH IS GONE HERE TOO (E028). The
                      drawer carried the SAME unconditional `text-magenta` as the
                      desktop nav did, so the bug was in both renderings — the
                      brief only named the desktop one. Leaving it would have
                      left a second copy of the defect waiting for the next
                      promoted item, and contradicted the weight-vs-colour rule
                      recorded above.
                    */
                    "rounded-lg px-2 py-2 hover:bg-bg-soft hover:text-magenta " +
                    (on ? "font-bold text-magenta" : "")
                  }
                >
                  {item.label}
                </Link>
              );
            })}
            <div className="mt-2 flex items-center gap-3 border-t border-line pt-3">
              <Btn href="/login" variant="white">
                Log In
              </Btn>
              <Btn href="/join" className="ml-auto">
                Sign Up
              </Btn>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
