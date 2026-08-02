"use client";

import { useState } from "react";
import Link from "next/link";
import { MARKETING_NAV, Btn } from "@/components/marketing/brand";
import { Logo } from "@/components/Logo";

/** Sticky marketing header: real logo, nav, Log In / Sign Up, mobile menu. */
export function MarketingHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-white/90 backdrop-blur-[10px] backdrop-saturate-150">
      <div className="mx-auto flex h-[70px] max-w-[1180px] items-center gap-7 px-6">
        {/*
          Through <Logo>, not a second copy of the asset path — this header was
          how the old wordmark survived the last logo change (E002 reopened
          because one file still pointed at it).
        */}
        <Logo className="h-8 w-auto" priority />

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

        <div className="ml-auto hidden items-center gap-4 md:flex">
          <Link href="/login" className="font-bold hover:text-magenta">
            Log In
          </Link>
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
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="font-bold"
              >
                Log In
              </Link>
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
