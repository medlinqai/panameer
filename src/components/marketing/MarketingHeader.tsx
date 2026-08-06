"use client";

import { useState } from "react";
import Link from "next/link";
import { MARKETING_NAV, Btn } from "@/components/marketing/brand";
import { Logo } from "@/components/Logo";
import { BRAND_BADGE } from "@/lib/brand";

/**
 * Sticky marketing header: logo lockup, nav, Log In / Sign Up, mobile menu.
 *
 * E001 — THE BADGE IS PART OF THE LOCKUP. The wordmark alone says a name; the
 * badge says what the name is for, and this is the first thing on the page.
 *
 * E002 — THE NAV ALIGNS TO THE WORDMARK, NOT THE LOCKUP. The tagline is
 * absolutely positioned beneath the wordmark rather than stacked in flow, so it
 * adds no height: the row keeps centring on the wordmark and the nav sits on
 * its centre line. Stacking it in flow would have pushed the wordmark up and
 * left the nav floating against the middle of a two-line block, which is the
 * misalignment E002 is about.
 */
export function MarketingHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-white/90 backdrop-blur-[10px] backdrop-saturate-150">
      <div className="mx-auto flex h-[70px] max-w-[1180px] items-center gap-7 px-6">
        {/*
          Through <Logo>, not a second copy of the asset path — this header was
          how the old wordmark survived the last logo change (one file still
          pointed at the retired mark).
        */}
        <div className="relative shrink-0">
          <Logo className="h-8 w-auto" priority />
          <span className="pointer-events-none absolute left-0 top-full hidden whitespace-nowrap pt-0.5 text-[10.5px] font-bold uppercase tracking-[0.1em] text-ink-2 sm:block">
            {BRAND_BADGE}
          </span>
        </div>

        <nav className="ml-3.5 hidden gap-[26px] text-[15px] font-semibold text-ink-2 md:flex">
          {MARKETING_NAV.map((item, i) => (
            <Link
              key={`${item.label}-${i}`}
              href={item.href}
              className="hover:text-magenta"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto hidden shrink-0 items-center gap-3 md:flex">
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
