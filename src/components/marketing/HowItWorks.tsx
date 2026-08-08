"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Eyebrow, H2, Lead } from "@/components/marketing/section";

/**
 * "How it works" — four media tiles, one per beat of the badge (E016.9).
 *
 * WHAT WAS HERE: three numbered cards, and above them an eight-item grid whose
 * icons were `▦ ◇ $ ◈ ☺ ⚙ ⇄ ▣` — Geometric Shapes codepoints standing in for
 * artwork, which is what a deck looks like the week before the designer joins.
 * The glyphs are gone. The application list stays, because "we cover every
 * application" is a real claim and the list is the evidence, but it is set as
 * plain labelled chips instead of pretending each one has an icon.
 *
 * THE TREATMENT IS THE REFERENCE'S, NOT ITS CONTENT: large rounded media tiles
 * in a row, bold caption BENEATH each rather than inside, generous gaps, no
 * card borders, the first tile a muted autoplaying loop with a play/pause
 * control. Ours is four beats rather than three, brand-tinted magenta/navy, and
 * says "Create" where the badge says Create — E016.9(d).
 *
 * ⚠ ONLY ONE REAL PIECE OF FOOTAGE EXISTS. `panameer-office.mp4` is the whole
 * media library today, so tile 1 gets it and tiles 2–4 get designed brand
 * panels. Those panels are deliberately not stock photos and not empty grey
 * boxes: a gradient with the beat set into it reads as intentional, where a
 * placeholder rectangle reads as broken. Each tile's `media` is one field —
 * dropping in real photography later is a one-line change per tile.
 */

type Beat = {
  key: string;
  /** The badge word. Never reframed — these four ARE the brand. */
  word: string;
  /** What the beat means to whoever is reading. Reframed by the toggle. */
  caption: { requester: string; provider: string };
  clarifier: { requester: string; provider: string };
  /** The tile's backdrop. `video` is the one real asset; the rest are panels. */
  media: { kind: "video"; src: string } | { kind: "panel"; className: string };
};

const BEATS: Beat[] = [
  {
    key: "learn",
    word: "Learn",
    caption: {
      requester: "Know what you're buying",
      provider: "Build the skill",
    },
    clarifier: {
      requester:
        "Free paths on the applications your team runs, so a Work Request describes the work instead of guessing at it.",
      provider:
        "Free paths and certifications on the applications enterprises actually run.",
    },
    media: { kind: "video", src: "/panameer-office.mp4" },
  },
  {
    key: "connect",
    word: "Connect",
    caption: { requester: "Meet the experts", provider: "Meet the buyers" },
    clarifier: {
      requester:
        "Browse validated providers, or invite the ones you already trust.",
      provider:
        "Be matched to Work Requests that ask for the skills you've claimed.",
    },
    media: {
      kind: "panel",
      className:
        "bg-[radial-gradient(120%_120%_at_15%_10%,#3b1f6b_0%,#241541_45%,#171e3e_100%)]",
    },
  },
  {
    key: "create",
    word: "Create",
    caption: { requester: "Get the work done", provider: "Do the work" },
    clarifier: {
      requester:
        "Scope it, agree it and track it in one place — or straight from your ERP.",
      provider:
        "Deliver against milestones that were agreed before you started.",
    },
    media: {
      kind: "panel",
      className:
        "bg-[radial-gradient(120%_120%_at_85%_15%,#8a1f88_0%,#4a1c58_50%,#20153a_100%)]",
    },
  },
  {
    key: "paid",
    word: "Get Paid",
    caption: { requester: "Pay when it's done", provider: "Get paid for it" },
    clarifier: {
      requester:
        "By the hour, by milestone, or by draw-down — settled through Panameer.",
      provider:
        "By the hour, by milestone, or by draw-down — settled through Panameer.",
    },
    media: {
      kind: "panel",
      className:
        "bg-[radial-gradient(120%_120%_at_50%_100%,#d72cd6_0%,#7a1f78_45%,#1b1436_100%)]",
    },
  },
];

/** The application coverage claim. Labels only — the glyphs are gone (E016.9). */
const APPS = [
  "Inventory Mgmt.",
  "Procurement",
  "Financials Mgmt.",
  "Project Portfolio Mgmt.",
  "Core Human Resources",
  "Manufacturing",
  "Supply Chain Planning",
  "Financial Close",
];

/**
 * Has this element been scrolled into view yet?
 *
 * ONE-SHOT, on purpose: the tiles animate in the first time they are reached
 * and then stay put. Re-running on every scroll past would turn a piece of
 * polish into a flicker, so the observer disconnects itself on first hit.
 *
 * The setState happens inside the observer CALLBACK, not in the effect body —
 * `react-hooks/set-state-in-effect` is an error in this repo and it is right
 * to be: a synchronous set here would render twice before paint.
 */
function useInView<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    /*
      No IntersectionObserver must not mean no content — fail open to visible
      rather than leaving the row blank forever.

      Deferred to the next frame rather than set here: a synchronous setState in
      an effect body is a cascading render, and the lint rule that says so is
      right. One frame later the tiles appear without their entrance, which is
      exactly the intended degradation.
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
      { rootMargin: "0px 0px -12% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return { ref, seen };
}

/** The one tile with real footage, and the only one with a control. */
function VideoTile({ src }: { src: string }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [playing, setPlaying] = useState(true);

  const toggle = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      void v.play();
      setPlaying(true);
    } else {
      v.pause();
      setPlaying(false);
    }
  }, []);

  return (
    <>
      <video
        ref={videoRef}
        aria-hidden
        tabIndex={-1}
        className="absolute inset-0 h-full w-full object-cover"
        src={src}
        autoPlay
        muted
        loop
        playsInline
      />
      {/* Brand tint over the footage, so tile 1 belongs to the same set as the
          three panels beside it rather than looking like a different section. */}
      <div
        aria-hidden
        className="absolute inset-0 bg-[linear-gradient(140deg,rgba(23,30,62,0.55)_0%,rgba(90,31,90,0.45)_60%,rgba(215,44,214,0.35)_100%)]"
      />
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? "Pause video" : "Play video"}
        className="absolute bottom-3 right-3 z-[2] grid h-9 w-9 place-items-center rounded-full border border-white/40 bg-black/35 text-[13px] text-white backdrop-blur-sm transition-colors hover:bg-black/55"
      >
        <span aria-hidden>{playing ? "❙❙" : "▶"}</span>
      </button>
    </>
  );
}

function Tile({
  beat,
  side,
  index,
  seen,
}: {
  beat: Beat;
  side: "requester" | "provider";
  index: number;
  seen: boolean;
}) {
  return (
    <div
      className={
        "group transition-[opacity,transform] duration-700 ease-out motion-reduce:transition-none " +
        (seen ? "translate-y-0 opacity-100" : "translate-y-5 opacity-0")
      }
      // Staggered per tile. Inline because the delay is derived from the index
      // and Tailwind would need four hard-coded delay classes to say the same.
      style={{ transitionDelay: `${index * 110}ms` }}
    >
      <div
        className={
          "relative aspect-[4/3] overflow-hidden rounded-[20px] transition-transform duration-300 group-hover:-translate-y-1.5 motion-reduce:group-hover:translate-y-0 " +
          (beat.media.kind === "panel" ? beat.media.className : "bg-[#171e3e]")
        }
      >
        {beat.media.kind === "video" ? (
          <VideoTile src={beat.media.src} />
        ) : (
          /*
            The beat is set INTO the panel, large and low-contrast. It is what
            makes a gradient read as a designed tile rather than as an image
            that failed to load — and it disappears behind real photography the
            moment there is any, without the caption below changing.
          */
          <span
            aria-hidden
            className="absolute bottom-4 left-5 font-display text-[38px] font-bold leading-none tracking-[-1px] text-white/25"
          >
            {beat.word}
          </span>
        )}
      </div>

      <h3 className="mt-4 text-[18px] font-bold text-ink">
        {beat.caption[side]}
      </h3>
      <p className="mt-1 text-[14.5px] leading-relaxed text-ink-2">
        {beat.clarifier[side]}
      </p>
    </div>
  );
}

export function HowItWorks() {
  const [side, setSide] = useState<"requester" | "provider">("requester");
  const { ref, seen } = useInView<HTMLDivElement>();

  return (
    <section id="how" className="py-[76px]">
      <div className="mx-auto max-w-[1180px] px-6">
        <Eyebrow>How it works</Eyebrow>

        <div className="mb-3 flex flex-wrap items-start justify-between gap-4">
          <H2>Find service providers for every application</H2>

          {/*
            THE SEGMENTED TOGGLE mirrors the hero's "I want to hire / I want to
            work", and reframes the four captions rather than swapping the four
            words. The beats are the brand and do not change per audience; what
            each one MEANS to you does.
          */}
          <div
            role="group"
            aria-label="Show how it works for"
            className="inline-flex shrink-0 rounded-full border border-line bg-white p-1"
          >
            {(
              [
                ["requester", "For requesters"],
                ["provider", "For providers"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setSide(value)}
                aria-pressed={side === value}
                className={
                  "cursor-pointer rounded-full px-[18px] py-2 text-[14px] font-bold transition-colors " +
                  (side === value
                    ? "bg-magenta text-white"
                    : "text-ink-2 hover:text-magenta")
                }
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <Lead>
          Experts across the full enterprise stack — matched to exactly what you
          need done.
        </Lead>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {APPS.map((app) => (
            <div
              key={app}
              className="rounded-brand border border-line bg-white px-[18px] py-4 text-[15px] font-bold transition-all hover:-translate-y-0.5 hover:border-magenta hover:shadow-brand"
            >
              {app}
            </div>
          ))}
        </div>

        <div ref={ref} className="mt-14 grid gap-7 sm:grid-cols-2 lg:grid-cols-4">
          {BEATS.map((beat, i) => (
            <Tile key={beat.key} beat={beat} side={side} index={i} seen={seen} />
          ))}
        </div>
      </div>
    </section>
  );
}
