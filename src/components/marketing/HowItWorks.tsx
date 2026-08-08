"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Eyebrow, H2, Lead } from "@/components/marketing/section";
import { usePrefersReducedMotion } from "@/lib/use-reduced-motion";

/**
 * "How It Works" — the four beats of the badge, as four media tiles
 * (E025, E026, E027).
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

type Beat = {
  n: number;
  /** The badge word. */
  word: string;
  /** Neutral, both-audience (E027). Title Case per conventions.md. */
  caption: string;
  clarifier: string;
  video: string;
};

/*
  E026 — WHICH CLIP GOES WHERE.

  The filenames could not be trusted, so the assignment came from viewing the
  frames: hands typing on Learn, people in conversation on Connect, the office
  team on Build (Scott's steer — it was the hero clip and it reads as work
  happening), the analytics dashboard on Get Paid.

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
    caption: "Learn the Applications",
    clarifier:
      "Free paths on the systems that run real businesses — watch without an account.",
    video: "/learn.mp4",
  },
  {
    n: 2,
    word: "Connect",
    caption: "Meet the Experts",
    clarifier: "Browse validated providers, or invite the ones you already trust.",
    video: "/connect.mp4",
  },
  {
    n: 3,
    word: "Build",
    caption: "Get the Work Done",
    clarifier:
      "Scope it, agree it, and track it in one place — or straight from your ERP.",
    video: "/panameer-office.mp4",
  },
  {
    n: 4,
    word: "Get Paid",
    caption: "Settle With Confidence",
    clarifier:
      "By the hour, by milestone, or by draw-down — settled through Panameer.",
    video: "/get-paid.mp4",
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

function Tile({
  beat,
  seen,
  playMedia,
  isLast,
}: {
  beat: Beat;
  seen: boolean;
  playMedia: boolean;
  isLast: boolean;
}) {
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

        {/* The step number — half of what makes four tiles read as a sequence. */}
        <span className="absolute left-4 top-4 z-[2] grid h-8 w-8 place-items-center rounded-full bg-white/15 text-[14px] font-extrabold text-white ring-1 ring-inset ring-white/35 backdrop-blur-sm">
          {beat.n}
        </span>

        <div className="absolute inset-x-0 bottom-0 z-[2] p-5">
          {/* E025(a) — the beat word, on EVERY tile including the video ones. */}
          <p className="font-display text-[26px] font-bold leading-none tracking-[-0.6px] text-white/95">
            {beat.word}
          </p>
          <h3 className="mt-2.5 text-[16px] font-bold leading-snug text-white">
            {beat.caption}
          </h3>
          <p className="mt-1.5 text-[13.5px] leading-relaxed text-white/80">
            {beat.clarifier}
          </p>
        </div>
      </div>

      {/*
        The connective arrow — the other half of the sequence read. Only between
        tiles, and only where they are actually side by side: at sm the grid is
        2×2 and at base it is a single column, so an arrow pointing right would
        be pointing at nothing.
      */}
      {!isLast && (
        <span
          aria-hidden
          className="pointer-events-none absolute -right-[22px] top-[38%] hidden text-[20px] font-bold text-magenta/70 lg:block"
        >
          →
        </span>
      )}
    </div>
  );
}

export function HowItWorks() {
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
    <section id="how" className="bg-bg-soft py-[76px]">
      <div className="mx-auto max-w-[1180px] px-6">
        {/*
          E028(ii) — THE EYEBROW LIVES HERE NOW. It used to label the
          application grid, which is a coverage claim rather than a process;
          the grid is its own section (ProvidersBrowse) and this is the only
          thing on the page that is actually a sequence.
        */}
        <Eyebrow>How It Works</Eyebrow>
        <H2>Four Steps, Start to Settled</H2>
        <Lead>
          Learn the systems, meet the people who know them, get the work done,
          and settle it — without leaving Panameer.
        </Lead>

        <div
          ref={trackRef}
          className="grid gap-7 sm:grid-cols-2 lg:grid-cols-4 lg:gap-11"
        >
          {BEATS.map((beat, i) => (
            <Tile
              key={beat.word}
              beat={beat}
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
