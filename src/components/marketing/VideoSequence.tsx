import { SEQUENCE_COPY } from "@/lib/brand";
import { LazyAutoplayVideo } from "@/components/media/LazyAutoplayVideo";

/**
 * The four-beat video sequence — Learn → Connect → Create → Settle.
 *
 * Shared by both marketing pages; only the captions differ, and those come from
 * SEQUENCE_COPY keyed by audience.
 *
 * ── REDUCED MOTION WITHOUT JAVASCRIPT ────────────────────────────────────────
 *
 * This is the part worth reading. The previous version of these cards was a
 * client component that subscribed to `prefers-reduced-motion` with
 * useSyncExternalStore and conditionally rendered the <video>. That worked and
 * it cost the page an island.
 *
 * It does not need one. The poster is painted as the card's own
 * `background-image`, the <video> sits on top, and one media query in
 * globals.css hides the video when reduced motion is asked for — revealing the
 * poster that was always underneath. CSS decides, so the component stays a
 * server component, the page stays static, and the fallback works before any
 * JavaScript has loaded rather than after.
 *
 * The posters are generated SVG gradients matching each card (there is no
 * ffmpeg here to pull a real frame), so the still and the playing card read as
 * the same object rather than as a broken image.
 *
 * The videos are decorative: `aria-hidden`, not focusable, pointer-events off.
 * Every word a reader needs is in the text layer above them.
 *
 * ── ⚠⚠ AND THEY NO LONGER DOWNLOAD AT PAGE LOAD (`P1-J1-E018`) ──────────────
 *
 * This section is BELOW THE FOLD on both pages that render it, and it was
 * costing 10.63MB before the visitor had scrolled to it — more than a hero clip
 * would. The `<video>` is now `LazyAutoplayVideo`, which withholds `src` until
 * the card is approached. See that file for why this cannot be done in CSS.
 *
 * ⚠ NOTHING ABOUT WHAT THIS PLAYS CHANGED. Same four clips, same order, same
 * captions, same posters, same reduced-motion behaviour. The only difference is
 * WHEN the bytes are fetched.
 *
 * ⚠ THIS SECTION IS THEREFORE THE PAGE'S FIRST CLIENT ISLAND — one observer per
 * card, no state above them. Both routes still prerender static (`○`); a client
 * component is prerendered too, and a route only loses `○` when it reads
 * request-time data.
 */

/*
  ── ⚠⚠ THE `-hero` CUTS, NOT THE MASTERS (`P1-J1-E018` closed, `P1-J1-E030`) ─

  This array used to name `connect.mp4` (1.48MB), `consultation.mp4` (4.68MB) and
  `get-paid.mp4` (3.07MB). With `learn.mp4` that is **10.63MB across four clips**,
  and this section now renders on `/`, which ALREADY serves a hero clip — so moving
  it unchanged would have made `/` the heaviest page on the site.

  ⚠ THE RE-CUTS ARE THE SAME FOOTAGE at 1280x720, faststart, audio stripped:
  0.14 + 0.26 + 0.83 MB against 1.48 + 4.68 + 3.07. **2.63MB total, down from
  10.63MB, for identical content.**

  ⚠ `learn.mp4` STAYS AT 1.40MB — there is no `-hero` cut of it and it is already
  the smallest master. Do not invent one to make the set tidy.

  ⚠ THESE CLIPS ARE STILL LAZY. `LazyAutoplayVideo` withholds `src` until the card
  is approached; this changes WHAT is fetched, not WHEN.
*/
const MEDIA = [
  {
    src: "/learn.mp4",
    poster: "/posters/learn.svg",
    grad: "from-[#3b2a63] to-[#6d3b8e]",
  },
  {
    src: "/connect-hero.mp4",
    poster: "/posters/connect.svg",
    grad: "from-[#28306b] to-[#4a5db0]",
  },
  {
    src: "/consultation-hero.mp4",
    poster: "/posters/create.svg",
    grad: "from-[#5a2a63] to-[#a13c8e]",
  },
  {
    src: "/get-paid-hero.mp4",
    poster: "/posters/settle.svg",
    grad: "from-[#1f2a58] to-[#3a4c92]",
  },
] as const;

export function VideoSequence({
  audience,
  tone = "white",
}: {
  audience: "buyer" | "provider";
  /** The seller page runs this section on the soft wash. */
  tone?: "white" | "soft";
}) {
  const beats = SEQUENCE_COPY.beats[audience];

  return (
    <section
      id="sequence"
      className={"py-16 " + (tone === "soft" ? "bg-[#f6f4fb]" : "bg-white")}
    >
      <div className="mx-auto max-w-[1120px] px-7">
        <p className="mb-3 font-display text-[12px] font-semibold uppercase tracking-[0.16em] text-magenta">
          {SEQUENCE_COPY.eyebrow[audience]}
        </p>
        <h2 className="text-[30px] font-semibold leading-[1.1] sm:text-[36px]">
          {SEQUENCE_COPY.headline}
        </h2>
        <p className="mt-3.5 max-w-[640px] text-balance text-[18px] text-[#3a4266]">
          {SEQUENCE_COPY.lead[audience]}
        </p>

        <div className="relative mt-9 grid gap-6 sm:grid-cols-2 lg:grid-cols-4 lg:gap-[34px]">
          {beats.map((beat, i) => {
            const m = MEDIA[i];
            return (
              <article
                key={beat.word}
                className={
                  "relative flex min-h-[260px] flex-col justify-end overflow-hidden rounded-[16px] bg-gradient-to-br bg-cover bg-center px-5 py-[22px] text-white shadow-[0_14px_34px_rgba(23,30,62,0.22)] " +
                  m.grad
                }
                // The poster, painted on the card itself — this is what a
                // reduced-motion visitor sees once the video is hidden.
                style={{ backgroundImage: `url('${m.poster}')` }}
              >
                <LazyAutoplayVideo
                  className="absolute inset-0 h-full w-full object-cover"
                  src={m.src}
                  poster={m.poster}
                />

                {/* The scrim, over the media, under the words. */}
                <div
                  aria-hidden
                  className="absolute inset-0 bg-[linear-gradient(180deg,rgba(13,18,48,0.15)_0%,rgba(13,18,48,0.85)_100%)]"
                />

                <span
                  aria-hidden
                  className="absolute left-4 top-3 font-display text-[58px] font-bold leading-none text-white/[0.16]"
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                {/*
                  ⚠ A GLYPH, NOT A CONTROL. The mockup shows a play badge in the
                  corner; these clips autoplay muted and have no controls, so
                  this is decoration. Rendered as a span rather than a button so
                  nobody can tab to it and press a thing that does nothing.
                */}
                <span
                  aria-hidden
                  className="absolute right-4 top-4 grid h-[30px] w-[30px] place-items-center rounded-full bg-white/[0.18] text-[11px]"
                >
                  ▶
                </span>

                <div className="relative">
                  <h3 className="text-[22px] font-semibold">{beat.word}</h3>
                  <p className="mb-2 mt-0.5 font-display text-[14px] font-medium text-[#f0d6f4]">
                    {beat.cap}
                  </p>
                  <p className="text-[13px] leading-[1.45] text-[#d9d6ec]">
                    {beat.body}
                  </p>
                </div>
              </article>
            );
          })}

          {/*
            The three connective arrows, on the seams. lg only: at sm the grid
            is 2×2 and below that a single column, where an arrow pointing right
            points at nothing.
          */}
          {[25, 50, 75].map((pct) => (
            <span
              key={pct}
              aria-hidden
              className="absolute top-1/2 hidden h-[34px] w-[34px] -translate-y-1/2 place-items-center rounded-full bg-magenta text-[15px] text-white shadow-[0_6px_14px_rgba(215,44,214,0.4)] lg:grid"
              style={{ left: `calc(${pct}% - 17px)` }}
            >
              →
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
