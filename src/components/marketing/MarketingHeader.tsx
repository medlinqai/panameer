"use client";

import { useState } from "react";
import Link from "next/link";
import { MARKETING_NAV, Btn } from "@/components/marketing/brand";
import { Logo } from "@/components/Logo";

/**
 * Sticky marketing header: wordmark, nav, Log In / Sign Up, mobile menu.
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
          <Logo className="h-8 w-auto -translate-y-[3px]" priority />
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
          {MARKETING_NAV.map((item, i) => (
            <Link
              key={`${item.label}-${i}`}
              href={item.href}
              className="whitespace-nowrap hover:text-magenta"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/*
          `ml-auto` is gone: the nav's `flex-1` now owns the slack, and leaving
          an auto margin here would fight it for the same space and pull the
          nav back off centre.
        */}
        <div className="hidden shrink-0 items-center gap-3 md:flex">
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
          <Btn href="/login" variant="ghost">
            Log In
          </Btn>
          <Btn href="/join">Sign Up</Btn>
        </div>

        <button
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle navigation"
          aria-expanded={open}
          className="ml-auto cursor-pointer text-2xl md:hidden"
        >
          ☰
        </button>
      </div>

      {open && (
        <div className="border-t border-line bg-white px-6 py-4 md:hidden">
          <nav className="flex flex-col gap-1 text-[15px] font-semibold text-ink-2">
            {MARKETING_NAV.map((item, i) => (
              <Link
                key={`${item.label}-${i}`}
                href={item.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-2 py-2 hover:bg-bg-soft hover:text-magenta"
              >
                {item.label}
              </Link>
            ))}
            <div className="mt-2 flex items-center gap-3 border-t border-line pt-3">
              <Btn href="/login" variant="ghost">
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
