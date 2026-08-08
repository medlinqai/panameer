"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { usePrefersReducedMotion } from "@/lib/use-reduced-motion";
import { BRAND_BADGE_SHORT, BRAND_DESCRIPTOR } from "@/lib/brand";

/**
 * The hero — video backdrop, hire/work toggle, search, and search quick-tags.
 *
 * E016.1 — THE VIDEO IS THE BACKGROUND, not a picture beside the words. The
 * previous build reserved a right-hand 38% slot for a photo that was never
 * dropped in, which meant the copy column was squeezed to 760px of a 1180px
 * panel to leave room for nothing. Making the footage the backdrop gives the
 * words the whole width back — which is most of E016.2's wrap fix on its own —
 * and it is the treatment the reference actually uses.
 *
 * E016.2 — THE WRAP WAS A CONTAINER, NOT A LINE BREAK. Nothing here ever forced
 * one: the headline wrapped early because it lived in a 760px column, and the
 * two paragraphs under it wrapped earlier still at max-w-[560px]. At those
 * widths a four-beat badge takes three lines and the hero has to be 520px tall
 * to hold them. Widened, "Learn. Connect. Create. Get Paid." sets on one line
 * and the whole block collapses to roughly two-thirds the height — which is
 * E016.2c ("MUCH thinner") arriving as a consequence rather than as a squeeze.
 */

/**
 * E020 — THE QUICK-TAGS ARE SEARCH TERMS, NOT LEARN LINKS.
 *
 * Walk 1 turned three invented scopes into four links to real learning paths,
 * on the reading that "must resolve to a real catalog slug" meant they had to
 * navigate somewhere real. Wrong destination: they sit directly under a search
 * box, between a hire/work toggle and nothing else, so what they look like is
 * what people expect them to be — one-tap searches. Sending them to a course
 * page instead was a category error dressed as a fix.
 *
 * They now run the SAME submit as the field above, with the tag as the query
 * and the toggle deciding the side. The "Start learning — free:" label that
 * explained the old behaviour is gone with it — chips under a search box need
 * no explanation, and the Learn section is directly below anyway.
 *
 * THE AI CHIP IS BACK. It was left out of walk 1 for one reason — there is no
 * AI learning path to link to — and that reason evaporates the moment these
 * are search terms. "Enterprise AI" is the skill Scott means: building and
 * extending enterprise applications with AI, which is exactly what the
 * AI-Specialist role in the catalog covers.
 */
const SEARCH_TAGS = [
  "Procurement",
  "Supply Chain",
  "Human Capital Mgt",
  "Finance & Accounting",
  "Enterprise AI",
];


export function Hero() {
  const router = useRouter();
  const [mode, setMode] = useState<"hire" | "work">("hire");
  const [query, setQuery] = useState("");
  const reducedMotion = usePrefersReducedMotion();

  const placeholder =
    mode === "hire"
      ? "Describe what you need done…"
      : "Describe the work you want to find…";

  /*
    E016.4 — SEARCH NAVIGATES, AND CARRIES WHAT WAS TYPED.

    It used to swallow the query and push everyone to /join, on the reasoning
    that a term surviving into a URL and changing nothing is a worse promise
    than not appearing to search. That reasoning was right about the promise and
    wrong about the fix: the answer is a destination that tells the truth, not a
    search box that forgets.

    /explore is that destination — a real public page that shows the query back,
    says results are not live yet, and offers the two things that ARE live. The
    mode picks which side of the funnel it points at, so "hire" and "work" land
    somewhere different, as E016.4 asks.
  */
  const searchFor = (term: string) => {
    const params = new URLSearchParams({ mode });
    if (term.trim()) params.set("q", term.trim());
    router.push(`/explore?${params}`);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    searchFor(query);
  };

  return (
    <div className="mx-auto max-w-[1180px] px-6">
      <div className="relative mt-[26px] overflow-hidden rounded-[22px] bg-[#0f1330]">
        {/*
          THE GRADIENT IS UNDER THE VIDEO, NOT INSTEAD OF IT. It paints
          instantly, so the panel is branded during the seconds the 9.7MB file
          is still arriving, on a slow connection, and for anyone who has asked
          for reduced motion. Without it the hero's first state is a black
          rectangle with white text on it.
        */}
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(900px_600px_at_85%_-10%,rgba(215,44,214,0.55),transparent_62%),radial-gradient(700px_520px_at_70%_115%,rgba(88,44,190,0.5),transparent_60%)]"
        />

        {!reducedMotion && (
          <video
            aria-hidden
            className="absolute inset-0 h-full w-full object-cover"
            src="/panameer-office.mp4"
            autoPlay
            muted
            loop
            playsInline
            /*
              DECORATIVE, so it must never be the reason a control is missed:
              no `controls`, aria-hidden, and pointer-events off so a click
              anywhere in the hero reaches whatever is actually there.
            */
            tabIndex={-1}
            style={{ pointerEvents: "none" }}
          />
        )}

        {/*
          THE PURPLE SHADE (Scott: "shade it purple to keep the vibe right") —
          and the thing that makes the white type legible over footage nobody
          has colour-graded. Two layers with different jobs:

            1. A magenta → navy wash across the whole frame. This is the brand
               vibe, and on its own it is nowhere near enough contrast.
            2. A left-weighted ink scrim. The copy sits left, so the darkest
               part of the overlay sits left. Text contrast cannot depend on
               what the footage happens to be doing behind it — this panel is
               dark on the left whatever frame is showing.
        */}
        <div
          aria-hidden
          className="absolute inset-0 bg-[linear-gradient(115deg,rgba(23,30,62,0.92)_0%,rgba(40,20,80,0.78)_45%,rgba(215,44,214,0.42)_100%)]"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-[linear-gradient(90deg,rgba(9,11,28,0.88)_0%,rgba(9,11,28,0.62)_45%,rgba(9,11,28,0.25)_100%)]"
        />

        {/*
          E016.2c — MUCH THINNER. py-16 and a 520px floor became py-10/py-12
          with no minimum: the block is now as tall as its content, and its
          content is one line of headline instead of three.
        */}
        <div className="relative z-[2] px-[26px] py-10 sm:px-12 sm:py-12">
          {/*
            No max-width on the headline — that was the wrap. At 1130px of
            usable width the four beats set on one line from `sm` up, and the
            phone breakpoint wraps where it genuinely has to.
          */}
          <h1 className="text-[34px] font-extrabold leading-[1.05] tracking-[-1.4px] text-white sm:text-[54px] lg:text-[60px]">
            {BRAND_BADGE_SHORT}
          </h1>
          {/*
            E016.3 — the money line is gone from here. It restated the badge
            immediately above it in smaller type, which is the definition of a
            line that costs height and adds nothing.

            The descriptor keeps a measure, but 820px rather than 560px: prose
            still needs a readable line length, and this is one sentence that
            now fits on one line at desktop widths.
          */}
          <p className="mt-3 max-w-[820px] text-[17px] leading-relaxed text-white/90 sm:text-[19px]">
            {BRAND_DESCRIPTOR}
          </p>

          <div className="mt-6 inline-flex rounded-full border border-white/30 bg-white/10 p-[5px]">
            <button
              type="button"
              onClick={() => setMode("hire")}
              aria-pressed={mode === "hire"}
              className={
                "cursor-pointer rounded-full px-[26px] py-2.5 text-[14.5px] font-bold transition-colors " +
                (mode === "hire" ? "bg-white text-magenta" : "text-white")
              }
            >
              I want to hire
            </button>
            <button
              type="button"
              onClick={() => setMode("work")}
              aria-pressed={mode === "work"}
              className={
                "cursor-pointer rounded-full px-[26px] py-2.5 text-[14.5px] font-bold transition-colors " +
                (mode === "work" ? "bg-white text-magenta" : "text-white")
              }
            >
              I want to work
            </button>
          </div>

          <form
            className="mt-3.5 flex max-w-[680px] rounded-[14px] bg-white p-[7px] shadow-brand"
            onSubmit={submit}
          >
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={placeholder}
              aria-label={placeholder}
              className="min-w-0 flex-1 bg-transparent px-4 py-3 text-[16px] text-ink outline-none"
            />
            <button
              type="submit"
              className="inline-flex shrink-0 items-center gap-2 rounded-full bg-magenta px-[22px] py-2.5 text-[15px] font-bold text-white transition-colors hover:bg-magenta-dark"
            >
              Search →
            </button>
          </form>

          {/*
            No lead-in label. These are chips under a search field with a
            hire/work toggle on top of it — the only thing they can plausibly
            be is a search, and a row of buttons that has to introduce itself
            is a row of buttons in the wrong place.
          */}
          <div className="mt-4 flex flex-wrap items-center gap-2.5">
            {SEARCH_TAGS.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => searchFor(tag)}
                className="inline-flex items-center rounded-full border border-white/30 bg-white/10 px-[15px] py-2 text-[14px] font-semibold text-white transition-colors hover:border-white hover:bg-white hover:text-magenta"
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
