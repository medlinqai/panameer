"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Eyebrow, H2, Lead } from "@/components/marketing/section";
import { usePrefersReducedMotion } from "@/lib/use-reduced-motion";

/**
 * "Why Panameer" — the four beats of the badge, as four media tiles
 * (E025, E026, E027, E051).
 *
 * RENAMED FROM HowItWorks, because the fork changed what it is. As one section
 * on one page it explained a process. As the differentiator section on all
 * THREE pages — the one thing every audience sees — it is the answer to "why
 * here rather than anywhere else", told as the arc a person actually travels.
 * Same four tiles, same footage; the captions now depend on who is reading.
 *
 * E027 — THE AUDIENCE TOGGLE IS GONE. Walk 1 built a "For Requesters / For
 * Providers" segmented control that reframed all four captions. It worked, and
 * it was still wrong: a visitor who has not yet decided which side they are on
 * — which is most of them, on a home page — was being asked to pick before
 * being told what the thing does. One neutral caption set says it once.
 *
 * E025 — EVERYTHING IS ON THE CARD NOW. The captions used to sit underneath
 * the tiles, in the reference's arrangement, which left the media doing nothing
 * but decorate: tile 1 was a video with no word on it at all. Beat word, caption
 * and clarifier are all overlaid on the media, over a scrim heavy enough to
 * carry them, and every tile carries its word.
 *
 * The sequence is numbered 1–4 with a connective arrow between tiles, because
 * four captioned squares in a row do not read as an order — and the order is
 * the entire point of "how it works".
 */

import Link from "next/link";
import type { Audience } from "@/lib/audience";

type Copy = { caption: string; clarifier: string };

type Beat = {
  n: number;
  /** The badge word. Never varies — the four beats ARE the brand. */
  word: string;
  /**
   * What the beat means to whoever is reading. Only the meaning changes per
   * audience; a page that renamed the beats would be a different product to
   * each side rather than one product seen from two ends.
   */
  copy: Record<Audience, Copy>;
  video: string;
  /**
   * Where this beat is actually elaborated (engagement audit, WS-E).
   *
   * Every one is a real section that exists today — no invented anchors. Used
   * only on `/`: on an audience page the beat's own elaboration is already the
   * next thing down the page, so a link would send the reader away from it.
   */
  href: string;
};

/*
  E026 — WHICH CLIP GOES WHERE.

  The filenames could not be trusted, so the assignment came from viewing the
  frames: hands typing on Learn, people in conversation on Connect, the office
  team on Create (Scott's steer — it was the hero clip and it reads as work
  happening), the analytics dashboard on Settle.

  This resolves E016.13: walk 1 shipped one real clip and three gradient panels
  because one clip was all that existed. All four are real footage now.

  ⚠ I could not independently re-verify the frames — there is no ffmpeg on this
  machine to extract one — so this is the brief's viewed-and-corrected mapping
  taken as given, not re-checked.
*/
const BEATS: Beat[] = [
  {
    n: 1,
    word: "Learn",
    href: "/for-providers#learn",
    video: "/learn.mp4",
    copy: {
      neutral: {
        caption: "Learn the Applications",
        clarifier:
          "Free paths on the systems that run real businesses — watch without an account.",
      },
      buyer: {
        caption: "Learn About Apps & Tech",
        clarifier:
          "Know what you are buying before you buy it. The same free paths your providers trained on.",
      },
      provider: {
        caption: "Build In-Demand Skills, Free",
        clarifier:
          "Guided paths on the applications enterprises actually run, each ending in a certification.",
      },
    },
  },
  {
    n: 2,
    word: "Connect",
    href: "/explore?mode=hire",
    video: "/connect.mp4",
    copy: {
      neutral: {
        caption: "Meet the Experts",
        clarifier:
          "Browse validated providers, or invite the ones you already trust.",
      },
      buyer: {
        caption: "Connect at Every Stage",
        clarifier:
          "Scope with an expert before you commit, then keep the same people through delivery.",
      },
      provider: {
        caption: "Connect With Buyers & Mentors",
        clarifier:
          "Be found by the companies asking for your skills, and by the people who have done it longer.",
      },
    },
  },
  {
    n: 3,
    word: "Create",
    href: "/for-buyers#packages",
    video: "/panameer-office.mp4",
    copy: {
      neutral: {
        caption: "Get the Work Done",
        clarifier:
          "Scope it, agree it, and track it in one place — or straight from your ERP.",
      },
      buyer: {
        caption: "Create With Your Experts",
        clarifier:
          "Agreed scope, tracked in one place — or ordered straight from your ERP.",
      },
      provider: {
        caption: "Do the Work, Never Alone",
        clarifier:
          "Deliver against a scope agreed before you started, with the community behind you.",
      },
    },
  },
  {
    n: 4,
    word: "Settle",
    href: "/for-buyers#pricing",
    video: "/get-paid.mp4",
    copy: {
      neutral: {
        caption: "Settle With Confidence",
        clarifier:
          "By the hour, by milestone, or by draw-down — settled through Panameer.",
      },
      buyer: {
        caption: "Pay in One Payment",
        clarifier:
          "One settlement through Panameer — no contractor paperwork, no compliance or legal exposure.",
      },
      provider: {
        caption: "Get Paid On-Platform",
        clarifier:
          "By the hour, by milestone, or by draw-down — settled through Panameer, not chased.",
      },
    },
  },
];

/**
 * Has this element been scrolled into view yet?
 *
 * ONE-SHOT: the tiles animate in the first time they are reached and then stay
 * put. Re-running on every scroll past would turn polish into a flicker, so the
 * observer disconnects itself on first hit.
 *
 * It now does a second job. Four autoplaying clips is roughly 6MB of video in a
 * section most visitors have not scrolled to yet, so the <video> elements are
 * not mounted until this fires — the row costs nothing until it is on screen.
 */
function useInView<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    /*
      No IntersectionObserver must not mean no content. Deferred to the next
      frame rather than set here: a synchronous setState in an effect body is a
      cascading render, and the lint rule that says so is right.
    */
    if (typeof IntersectionObserver === "undefined") {
      const id = requestAnimationFrame(() => setSeen(true));
      return () => cancelAnimationFrame(id);
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setSeen(true);
          io.disconnect();
        }
      },
      { rootMargin: "200px 0px -8% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return { ref, seen };
}

function Card({
  linked,
  href,
  children,
}: {
  linked: boolean;
  href: string;
  children: React.ReactNode;
}) {
  return linked ? (
    <Link href={href} className="block">
      {children}
    </Link>
  ) : (
    <>{children}</>
  );
}

function Tile({
  beat,
  audience,
  seen,
  playMedia,
  isLast,
}: {
  beat: Beat;
  audience: Audience;
  seen: boolean;
  playMedia: boolean;
  isLast: boolean;
}) {
  const { caption, clarifier } = beat.copy[audience];
  /*
    ENGAGEMENT AUDIT (WS-E) — on `/` this section was READ-ONLY: four videos
    and twelve lines of copy with nothing to click. Each tile now leads to the
    page where that beat is actually elaborated. Only on `/`: on an audience
    page the elaboration is the next section down, and a link would carry the
    reader away from the thing they were about to reach anyway.
  */
  const linked = audience === "neutral";
  return (
    <div
      className={
        "group relative transition-[opacity,transform] duration-700 ease-out motion-reduce:transition-none " +
        (seen ? "translate-y-0 opacity-100" : "translate-y-5 opacity-0")
      }
      // Staggered per tile. Inline because the delay comes from the index, and
      // Tailwind would need four hard-coded delay classes to say the same.
      style={{ transitionDelay: `${(beat.n - 1) * 110}ms` }}
    >
      {/*
        A conditional wrapper rather than a polymorphic `as` component: two
        plain branches type themselves, where `Shell = linked ? Link : "div"`
        needs a cast to reconcile Link's href with div's props — a cast that
        would then hide a real mistake in either branch.
      */}
      <Card linked={linked} href={beat.href}>
      <div className="relative aspect-[4/5] overflow-hidden rounded-[20px] bg-[#171e3e] transition-transform duration-300 group-hover:-translate-y-1.5 motion-reduce:group-hover:translate-y-0">
        {playMedia && (
          <video
            aria-hidden
            tabIndex={-1}
            className="absolute inset-0 h-full w-full object-cover"
            src={beat.video}
            autoPlay
            muted
            loop
            playsInline
            preload="none"
            style={{ pointerEvents: "none" }}
          />
        )}

        {/*
          TWO OVERLAYS, TWO JOBS. The brand wash is the vibe and is nowhere near
          enough contrast on its own; the bottom-weighted scrim is what makes
          three lines of white type legible over footage nobody graded. Text
          contrast must not depend on which frame is showing.
        */}
        <div
          aria-hidden
          className="absolute inset-0 bg-[linear-gradient(150deg,rgba(23,30,62,0.45)_0%,rgba(90,31,90,0.40)_55%,rgba(215,44,214,0.30)_100%)]"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-[linear-gradient(180deg,rgba(9,11,28,0.30)_0%,rgba(9,11,28,0.55)_45%,rgba(9,11,28,0.90)_100%)]"
        />

        {/*
          E064 — A GHOSTED EDITORIAL NUMERAL, not a badge. The 32px pill in the
          corner was a UI chip: it read as a control and it was small enough to
          scan past, which left four near-identical dark rectangles with no
          visible order. Set at 96px in the artwork itself, "01" is part of the
          image and reads as sequence from across the room.

          Low contrast on purpose. It has to lose to the caption underneath —
          it is orientation, not content — so it sits at 22% white with the
          scrim already darkening that corner.
        */}
        <span
          aria-hidden
          className="pointer-events-none absolute left-4 top-1 z-[1] font-display text-[96px] font-bold leading-none tracking-[-4px] text-white/[0.22]"
        >
          {String(beat.n).padStart(2, "0")}
        </span>

        <div className="absolute inset-x-0 bottom-0 z-[2] p-5">
          {/* E025(a) — the beat word, on EVERY tile including the video ones. */}
          <p className="font-display text-[26px] font-bold leading-none tracking-[-0.6px] text-white/95">
            {beat.word}
          </p>
          <h3 className="mt-2.5 text-[16px] font-bold leading-snug text-white">
            {caption}
          </h3>
          <p className="mt-1.5 text-[13.5px] leading-relaxed text-white/80">
            {clarifier}
          </p>
          {linked && (
            <span className="mt-2.5 inline-flex items-center gap-1 text-[13px] font-bold text-white">
              See How
              <span aria-hidden className="transition-transform group-hover:translate-x-0.5">
                →
              </span>
            </span>
          )}
        </div>
      </div>
      </Card>

      {/*
        The connective arrow — the other half of the sequence read. Only between
        tiles, and only where they are actually side by side: at sm the grid is
        2×2 and at base it is a single column, so an arrow pointing right would
        be pointing at nothing.
      */}
      {/*
        E064 — BIGGER, AND ACTUALLY VISIBLE. A 20px glyph at 70% opacity in a
        28px gutter was doing nothing the numerals could not do better. This is
        a filled magenta disc with a white chevron: it survives being scrolled
        past, and it sits ON the seam between two cards so it reads as "then",
        not as decoration belonging to either one.
      */}
      {!isLast && (
        <span
          aria-hidden
          className="pointer-events-none absolute -right-[30px] top-[36%] z-[3] hidden h-9 w-9 place-items-center rounded-full bg-magenta text-[16px] font-black text-white shadow-[0_2px_10px_rgba(215,44,214,0.45)] lg:grid"
        >
          →
        </span>
      )}
    </div>
  );
}

export function WhyPanameer({ audience = "neutral" }: { audience?: Audience }) {
  const { ref, seen } = useInView<HTMLDivElement>();
  const reducedMotion = usePrefersReducedMotion();

  /*
    Mount the clips only once the row is on screen AND motion is welcome. Both
    conditions matter: the first saves the bandwidth, the second respects the
    setting, and neither should silently cover for the other.
  */
  const playMedia = seen && !reducedMotion;

  const trackRef = useCallback(
    (node: HTMLDivElement | null) => {
      ref.current = node;
    },
    [ref]
  );

  return (
    /*
      E019 — THE STEPS GET A BAND OF THEIR OWN. As four dark tiles on white they
      floated between two other white sections and read as a row of pictures;
      the shade is what makes them a block with a beginning and an end. It also
      keeps the alternation honest now that the order changed — see page.tsx for
      the full sequence.
    */
    /*
      E067 — THE BAND DEPENDS ON WHAT FOLLOWS IT, which differs per page:

        /               white  · the fork chooser below is soft
        /for-buyers     soft   · Packages below is white
        /for-providers  white  · Learn below is soft

      Derived rather than passed as a prop. A `tone` prop would let a page set
      a shade that collides with its own neighbour, and the neighbour is a fact
      about the page, which this component already knows via `audience`.
    */
    <section
      id="why"
      className={
        "py-[76px] " + (audience === "buyer" ? "bg-bg-soft" : "bg-white")
      }
    >
      <div className="mx-auto max-w-[1180px] px-6">
        {/*
          E028(ii) — THE EYEBROW LIVES HERE NOW. It used to label the
          application grid, which is a coverage claim rather than a process;
          the grid is its own section (ProvidersBrowse) and this is the only
          thing on the page that is actually a sequence.
        */}
        <Eyebrow>Why Panameer</Eyebrow>
        {/*
          E071 — ONE HEADLINE FOR ALL THREE PAGES, and it is a claim rather
          than a description. "Four Steps, Start to Settle" told you the shape
          of the graphic underneath it, which the graphic already does; this
          says what the shape is FOR. "Outcomes and incomes" is the two-sided
          version in three words — the buyer's outcome, the provider's income —
          and it is the only line on the page that names both without picking.
        */}
        <H2>We Improve Outcomes and Incomes… Together.</H2>

        {/*
          E063/E066 — the old subhead restated the four steps in a sentence,
          directly above four tiles that are the four steps. Removed. What
          replaces it on `/` is positioning: the same two-sidedness as the
          headline, said once more in plain terms.

          The buyer and provider lines are kept as they are. The brief expects
          neutral copy here and audience variants "when we go down a level" —
          these already ARE those variants, written in the fork brief, and
          replacing working per-audience positioning with the neutral line
          would be a regression on both fork pages to satisfy an ordering.
        */}
        <Lead>
          {audience === "buyer"
            ? "One place for the whole engagement — the training your team needs, the expert who does the work, and a single settlement at the end."
            : audience === "provider"
              ? "One place for the whole arc — the skills, the buyers, the work itself, and getting paid for it without chasing anybody."
              : "Learn, connect, build, and settle — so the right talent and the right work find each other."}
        </Lead>

        {/*
          E059/E064 — "Four Steps, Start to Settle" survives as the small label
          ON the graphic, which is where a description of the graphic belongs.
        */}
        <p className="mb-5 text-[12.5px] font-extrabold uppercase tracking-[0.09em] text-ink-2">
          Four Steps, Start to Settle
        </p>

        <div
          ref={trackRef}
          className="grid gap-7 sm:grid-cols-2 lg:grid-cols-4 lg:gap-11"
        >
          {BEATS.map((beat, i) => (
            <Tile
              key={beat.word}
              beat={beat}
              audience={audience}
              seen={seen}
              playMedia={playMedia}
              isLast={i === BEATS.length - 1}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
