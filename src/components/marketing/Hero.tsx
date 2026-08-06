"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  BRAND_BADGE,
  BRAND_DESCRIPTOR,
  BRAND_MONEY_LINE,
} from "@/lib/brand";

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
      {/*
        E005 — THE HERO WAS PURPLE ON PURPLE. A #3a1f5c→#8a1f88 panel with a
        magenta radial wash laid over it: three values within a few steps of
        each other, so nothing had an edge and the whole block read as one muddy
        field. The white search card was the only thing that separated from it.

        The /login aurora is the target feel, and what makes that work is RANGE
        — it starts at near-black ink and travels to magenta, so there is a real
        dark end to read light type against and a real bright end to give the
        panel depth. This does the same: a deep ink base, two well-separated
        aurora blooms placed off opposite corners, and a vignette that pulls the
        edges down so the middle lifts.

        The blooms are positioned AWAY from the copy column (top-right, bottom-
        right) rather than washing the whole surface. Contrast for the headline
        comes from the dark base being left alone where the text sits, which is
        the same reason the login backdrop puts its vignette over the card.
      */}
      <div className="relative mt-[26px] min-h-[520px] overflow-hidden rounded-[22px] bg-[#0f1330]">
        {/* Aurora blooms — separated in hue and position, not stacked. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(900px_600px_at_88%_-15%,rgba(215,44,214,0.55),transparent_62%),radial-gradient(700px_520px_at_72%_115%,rgba(88,44,190,0.5),transparent_60%),radial-gradient(600px_400px_at_-5%_20%,rgba(23,30,62,0.9),transparent_70%)]"
        />
        {/* Vignette: darkens the edges so the panel has depth rather than
            being one flat wash, and guarantees the copy column stays dark. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_30%_50%,rgba(9,11,28,0.72)_0%,rgba(9,11,28,0.35)_45%,transparent_75%)]"
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
          {/*
            THE BADGE IS THE HEADLINE and the descriptor is the subhead
            (brief_brand_tagline_rollout WS-A). What was here — "Work at the
            speed of opportunity" over a line about deploying best practices —
            described a benefit without ever saying what Panameer IS, which is
            the job of the first two lines on a page nobody has visited before.

            Both strings come from lib/brand.ts. Neither is typed here, because
            a hero that carries its own copy is the file people re-word without
            touching the onboarding shell that says the same thing.
          */}
          <h1 className="mb-[18px] text-[40px] font-extrabold leading-[1.02] tracking-[-1.5px] text-white sm:text-[60px]">
            {BRAND_BADGE}
          </h1>
          <p className="mb-[30px] max-w-[560px] text-[19px] leading-relaxed text-white/85">
            {BRAND_DESCRIPTOR}
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
            THE MONEY LINE sits directly above the chips (WS-A): this is the
            point on the page where somebody is about to act, and it is the one
            place the four-verb sequence is worth spelling out rather than
            gesturing at.
          */}
          <p className="mt-6 max-w-[560px] text-[16px] font-semibold text-white">
            {BRAND_MONEY_LINE}
          </p>

          {/*
            Real links, not styled spans. These carried `cursor-pointer` and an
            arrow while being inert — the clearest kind of dead end, because the
            page actively invited the click.
          */}
          <div className="mt-4 flex flex-wrap gap-3">
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
