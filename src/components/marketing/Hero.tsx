"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * The hero — hire/work toggle, search box, and three role shortcuts.
 *
 * THE CTAs LEAD SOMEWHERE NOW (brief_marketing_home_localhost). The search
 * button was `onSubmit={e => e.preventDefault()}` over a readOnly input, and
 * the three role chips were `<span>`s styled with `cursor-pointer` and a "→".
 * They looked like the primary action on the page and did nothing, which is the
 * dead end that stopped the front-door → onboarding walk at its first click.
 *
 * They route to `/join`, and the toggle decides which side of the fork: `?type`
 * is a parameter /join ALREADY reads to skip straight to page 2, so "I want to
 * hire" lands on the buyer jobs and "I want to work" on the seller ones. No new
 * contract invented for the sake of a link.
 *
 * The typed query is deliberately NOT carried across. Nothing downstream reads
 * it yet, and a search term that visibly survives into a URL and then changes
 * nothing is a worse promise than not appearing to search at all — there is no
 * public provider index to search against until sign-up.
 */
export function Hero() {
  const router = useRouter();
  const [mode, setMode] = useState<"hire" | "work">("hire");
  const [query, setQuery] = useState("");
  const placeholder =
    mode === "hire"
      ? "Describe what you need to hire for…"
      : "Describe the work you want to find…";

  /** Both sides of the toggle start the same funnel, on their own branch. */
  const joinHref = mode === "hire" ? "/join?type=buyer" : "/join?type=seller";

  return (
    <div className="mx-auto max-w-[1180px] px-6">
      <div className="relative mt-[26px] min-h-[520px] overflow-hidden rounded-[22px] bg-[linear-gradient(115deg,#171E3E_0%,#3a1f5c_45%,#8a1f88_100%)]">
        {/* Decorative glow wash (matches mockup ::after). */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(1200px_500px_at_80%_-10%,rgba(215,44,214,.35),transparent_60%),radial-gradient(800px_500px_at_10%_110%,rgba(90,31,90,.5),transparent_60%)]"
        />

        {/*
          HERO PHOTO SLOT — replace this gradient with a real hero image later.
          Drop the photo in public/brand (or /public), render it here as an
          absolutely-positioned right-side <Image>, and keep the dark overlay so
          the headline stays legible. Left content column below is max-w-[760px],
          leaving the right side open for the shot.
        */}
        <div
          aria-hidden
          data-hero-photo-slot
          className="pointer-events-none absolute inset-y-0 right-0 hidden w-[38%] lg:block"
        />

        <div className="relative z-[2] max-w-[760px] px-[26px] py-11 sm:px-14 sm:py-16">
          <h1 className="mb-[18px] text-[40px] font-extrabold leading-[1.02] tracking-[-1.5px] text-white sm:text-[60px]">
            Work at the speed of opportunity
          </h1>
          <p className="mb-[30px] max-w-[560px] text-[19px] text-[#f3e9f6]">
            Hire experts with years of experience deploying the best practices
            that improve business outcomes.
          </p>

          <div className="mb-[18px] inline-flex rounded-full border border-white/30 bg-white/10 p-[5px]">
            <button
              onClick={() => setMode("hire")}
              className={
                "cursor-pointer rounded-full px-[30px] py-[11px] text-[15px] font-bold transition-colors " +
                (mode === "hire" ? "bg-white text-magenta" : "text-white")
              }
            >
              I want to hire
            </button>
            <button
              onClick={() => setMode("work")}
              className={
                "cursor-pointer rounded-full px-[30px] py-[11px] text-[15px] font-bold transition-colors " +
                (mode === "work" ? "bg-white text-magenta" : "text-white")
              }
            >
              I want to work
            </button>
          </div>

          <form
            className="flex max-w-[640px] rounded-[14px] bg-white p-[7px] shadow-brand"
            onSubmit={(e) => {
              e.preventDefault();
              router.push(joinHref);
            }}
          >
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={placeholder}
              aria-label={placeholder}
              className="min-w-0 flex-1 bg-transparent px-4 py-3.5 text-[16px] text-ink outline-none"
            />
            <button
              type="submit"
              className="inline-flex shrink-0 items-center gap-2 rounded-full bg-magenta px-[22px] py-3 text-[15px] font-bold text-white transition-colors hover:bg-magenta-dark"
            >
              Search →
            </button>
          </form>

          {/*
            Real links, not styled spans. These carried `cursor-pointer` and an
            arrow while being inert — the clearest kind of dead end, because the
            page actively invited the click.
          */}
          <div className="mt-5 flex flex-wrap gap-3">
            {["Order-to-Cash SME", "Procure-to-Pay SME", "Record-to-Report SME"].map(
              (label) => (
                <Link
                  key={label}
                  href={joinHref}
                  className="inline-flex items-center gap-2 rounded-[10px] border border-white/30 bg-white/10 px-4 py-2.5 text-[14.5px] font-semibold text-white transition-colors hover:bg-white/20"
                >
                  {label} →
                </Link>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
