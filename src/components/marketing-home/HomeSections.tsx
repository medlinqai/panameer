import Link from "next/link";
import { HOME_SECTIONS, type HomeSection } from "@/lib/home-sections";
import { HeroVideoBackdrop } from "@/components/media/HeroVideoBackdrop";
import { LazyAutoplayVideo } from "@/components/media/LazyAutoplayVideo";
import {
  HERO_BUTTON,
  HERO_BUTTON_OUTLINE,
  HERO_GRADIENT,
  HERO_SCRIM,
} from "@/components/marketing/hero-treatment";

const INNER = "mx-auto w-full max-w-[1180px] px-[26px]";

const COL = "min-w-0";

const LABEL_WHITE = " text-white!";

const BAND_CLIPS: Record<string, string | undefined> = {
  talent: "/connect-hero.mp4",
  work: "/panameer-office-hero.mp4",
};

function Section({ s, i }: { s: HomeSection; i: number }) {
  const dark = i % 2 === 0;
  const isHero = i === 0;
  const bandClip = !isHero && dark ? BAND_CLIPS[s.key] : undefined;

  const eyebrow = dark ? "text-white" : "text-[#A61AA5]";
  const head = dark ? "text-white" : "text-[#272334]";
  const bodyc = dark ? "text-[#DDE0F0]" : "text-[#5B6183]";

  const grid = dark
    ? "min-[1151px]:grid-cols-[1.05fr_0.95fr]"
    : "min-[1151px]:grid-cols-[0.95fr_1.05fr]";

  const copy = (
    <div className={COL + (dark ? "" : " min-[1151px]:order-2")}>
      {}
      <p
        className={
          "mb-3 text-[14px] font-bold uppercase tracking-[0.12em] min-[1151px]:whitespace-nowrap min-[1151px]:tracking-[0.15em] " +
          eyebrow
        }
      >
        {s.eyebrow}
      </p>
      {}
      {isHero ? (
        <h1
          className={
            "mb-3.5 font-display text-[30px] font-bold leading-[1.2] " +
            "tracking-[-0.6px] " + head
          }
        >
          {s.headline.a}
          {s.headline.b && (
            <>
              <br />
              {s.headline.b}
            </>
          )}
        </h1>
      ) : (
        <h3
          className={
            "mb-3.5 font-display text-[30px] font-bold leading-[1.2] " +
            "tracking-[-0.6px] " + head
          }
        >
          {s.headline.a}
          {s.headline.b && (
            <>
              <br />
              {s.headline.b}
            </>
          )}
        </h3>
      )}
      {}
      {}
      <p className={"text-[15.5px] leading-[1.68] " + bodyc}>
        {s.body.replace("%s", s.ctaLabel)}
      </p>

      {}
      {}
      <div className={(isHero ? "" : "mt-[26px] ") + "flex flex-wrap gap-3"}>
        {}
        {s.ctaHref === null ? (
          <button
            type="button"
            aria-disabled="true"
            className={
              "cursor-default border-2 border-magenta bg-magenta " +
              "px-[26px] py-3.5 font-display text-[15px] font-bold text-white" + LABEL_WHITE
            }
          >
            {s.ctaLabel}
          </button>
        ) : (
          <Link
            href={s.ctaHref}
            className={
              (isHero
                ? HERO_BUTTON
                : "border-2 border-magenta bg-magenta px-[26px] py-3.5 " +
                  "font-display text-[15px] font-bold text-white transition-colors " +
                  "hover:border-magenta-dark hover:bg-magenta-dark") + LABEL_WHITE
            }
          >
            {s.ctaLabel}
          </Link>
        )}
        {/* `Learn More` → the menu page. All six exist and are public. */}
        <Link
          href={s.learnMoreHref}
          className={
            (isHero
              ? HERO_BUTTON_OUTLINE + LABEL_WHITE
              : "border-2 px-[26px] py-3.5 font-display text-[15px] " +
                "font-bold transition-colors " +
                (dark
                  ? "border-white/60 text-white hover:border-white hover:bg-white hover:text-[#272334]!" + LABEL_WHITE
                  : "border-[#272334] text-[#272334] hover:bg-[#272334] hover:text-white!"))
          }
        >
          Learn More
        </Link>
      </div>
    </div>
  );

  const media = (
    <div className={COL + (dark ? "" : " min-[1151px]:order-1")}>
      {}
      <div
        className={
          "rounded-[20px] bg-white p-6 " +
          (dark
            ? "border border-transparent shadow-[0_24px_60px_-28px_rgba(0,0,0,.7)]"
            : "border border-[#E3E6EF] shadow-[0_1px_2px_rgba(24,30,60,.05),0_18px_44px_-26px_rgba(24,30,60,.4)]")
        }
      >
        <h4 className="mb-4 font-display text-[12.5px] font-bold uppercase tracking-[0.1em] text-[#5B6183]">
          {s.chipsTitle}
        </h4>
        {s.chips.map((c, n) => (
          <div
            key={c}
            className={
              "flex items-start gap-3 py-[13px] " +
              (n === 0 ? "pt-0" : "border-t border-[#E3E6EF]")
            }
          >
            {}
            <span
              aria-hidden
              className="flex h-[26px] w-[26px] flex-none items-center justify-center rounded-[8px] border border-[#E7B9E6] bg-[#FBE7FB] text-[12px] font-bold text-[#A61AA5]"
            >
              {n + 1}
            </span>
            <span className="text-[14px] leading-[1.5] text-[#272334]">{c}</span>
          </div>
        ))}
      </div>
      {}
    </div>
  );

  return (
    <section
      id={`home-${s.key}`}
      className={
        "font-body py-[76px] " +
        (dark ? HERO_GRADIENT : "bg-[#F6F3FA]") +
        /*
          ⚠ `relative isolate` ONLY ON THE HERO — the clip is `absolute inset-0` and
          needs a positioned ancestor, and `isolate` keeps the video and scrim
          stacking inside this band instead of against the page.
          ⚠ NO `overflow-hidden` AND NO RADIUS: the band is deliberately square and
          edge-to-edge. The clip is `inset-0`, so it fills exactly without clipping.
        */
        /* ⚠ ALSO ON BANDS 3 AND 5 NOW — their clips are `absolute inset-0`
           and need a positioned, isolated ancestor exactly as the hero does. */
        (isHero || bandClip ? " relative isolate" : "")
      }
    >
      {bandClip && (
        /*
          ── ⚠⚠ THE OTHER TWO PURPLE BANDS GET A CLIP (`P1-J0-E338`) ──────────

          Scott asked for video behind the other purple bands. Sections 1, 3 and 5
          are the dark ones; 1 is the hero and already has `/consultation.mp4`.
          ⚠⚠ HE DID NOT NAME WHICH CLIP FOR 3 AND 5 — CHAT'S INFERENCE, STATED SO HE
          CAN CORRECT IT: each takes ITS OWN MENU PAGE'S hero video, so the band and
          the page it links to show the same footage. See `BAND_CLIPS`.
          ⚠ THE THREE LILAC BANDS GET NONE.

          ⚠⚠ `LazyAutoplayVideo`, NOT `HeroVideoBackdrop`, AND THAT IS THE WHOLE
          POINT. These are BELOW THE FOLD and must not compete with the hero's clip
          for bandwidth. `preload="none"` alone does NOT work — it is overridden the
          moment `autoplay` is present — so the `src` is withheld until an
          `IntersectionObserver` says the band is near the viewport.
          ⚠ `/`'s LCP was already 10,776ms and first-load 4.80MB. MEASURED AFTER:
          the numbers are in the brief report, and the gate was +0.2MB / +300ms.
          ⚠ THE SCRIM IS THE SAME `HERO_SCRIM` the hero uses — imported, not retyped.
        */
        <>
          <LazyAutoplayVideo
            src={bandClip}
            /*
              ⚠⚠ `rootMargin` 100px, NOT THE COMPONENT'S 600px DEFAULT, AND IT IS A
              MEASURED NUMBER. Section 3 sits only 229px below the fold at 1440
              (669px at 900, 1447px at 390) — so a 600px margin INTERSECTS AT LOAD
              and `connect-hero.mp4` was fetched before the reader had scrolled at
              all. `check:ui §51` caught it: *"/ fetched a below-the-fold sequence
              clip before the reader was anywhere near it — E018"*. That guarantee
              exists because `/find-work` once pulled 10.63MB of unseen video.
              ⚠ 100px CLEARS THE TIGHTEST WIDTH BY 129px and still starts the fetch
              before the band is on screen. Both clips are small (0.14MB / 1.01MB).
              ⚠ THE PROP IS PASSED HERE, NOT CHANGED IN THE COMPONENT — 600px is
              right for `VideoSequence`, whose clips sit much further down.
            */
            rootMargin="100px"
            className="absolute inset-0 h-full w-full object-cover opacity-40"
          />
          <div aria-hidden className={HERO_SCRIM} />
        </>
      )}
      {isHero && (
        /*
          ⚠ THE SAME CLIP `HomeHero` PLAYS — `/consultation.mp4` — with the same
          attributes, so `/` and `/optimize` still show the same footage.
          ⚠ `HeroVideoBackdrop` IS COMPOSED, NEVER EDITED.
          ⚠ `HERO_SCRIM` IS IMPORTED, NOT RETYPED. `a349e6f` fixed this constant being
          emitted as a broken string concatenation that Tailwind could not see — so
          `check:ui §64` asserts the COMPUTED scrim is non-null, and this section is
          now one of the places it looks.
        */
        <HeroVideoBackdrop
          src="/consultation.mp4"
          videoClassName="absolute inset-0 h-full w-full object-cover opacity-40"
          scrimClassName={HERO_SCRIM}
        />
      )}
      {/* ⚠ THE RAIL IS UNCHANGED — only the BAND is full-width. `z-[2]` lifts the
          content above the clip and its scrim. */}
      <div
        className={
          INNER +
          (isHero || bandClip ? " relative z-[2]" : "")
        }
      >
        <div
          className={
            "grid grid-cols-1 items-center gap-[30px] " +
            "min-[1151px]:gap-[54px] " +
            grid
          }
        >
          {/*
            ── ⚠⚠ DOM ORDER IS ALWAYS copy -> media (`P1-J0-E354`) ──────────────

            Scott, 2026-08-28: *"when switching to mobile, the home page doesn't go in
            order of the text first and what you get listing second."* He was right,
            and it was exactly the three LIGHT bands — 2, 4 and 6.

            ⚠ SUPERSEDED, quoted not deleted — this line used to read:
              *"⚠ DOM ORDER CARRIES THE READING ORDER — no `order` utilities, so a
              screen reader and a sighted reader get the same sequence."*
            with `{dark ? copy : media}` / `{dark ? media : copy}` below it. The
            ternary existed to alternate which column sits LEFT ON DESKTOP, but
            NOTHING SCOPED IT TO DESKTOP: the grid is `grid-cols-1` until
            `min-[1151px]`, so below that the two children simply stacked in DOM
            order and the card landed ABOVE the headline, body and buttons it is
            meant to follow. The old comment's claim was true of the mechanism and
            false of the result.

            ⚠⚠ THE TRADE THIS MAKES, RECORDED AS ONE. DOM order is now copy -> media
            on every band at every width — the sequence the copy was written for, and
            what a screen reader now gets on all six sections. The desktop swap moved
            onto the two children as `order` utilities scoped to `min-[1151px]`, so
            ON LIGHT BANDS AT >=1151px THE LEFT-TO-RIGHT POSITION NO LONGER MATCHES
            DOM ORDER. That is deliberate: visual order is a layout preference,
            reading order is not, and only one of them can win on a wide screen.

            ⚠ THE `grid` TRACKS ARE UNTOUCHED and that is what keeps desktop
            identical. The widths belong to the COLUMN POSITIONS, not the components:
            light bands stay `[0.95fr_1.05fr]`, so `media` moved into column 1 still
            gets 0.95fr and `copy` still gets 1.05fr. Verified by measuring both
            columns' x and width at 1440 before and after — unchanged.
            ⚠ `const dark = i % 2 === 0` IS UNTOUCHED. The index parity that stripes
            the page is Scott's and was not in scope.
          */}
          {copy}
          {media}
        </div>
      </div>
    </section>
  );
}

export function HomeSections() {
  return (
    <>
      {HOME_SECTIONS.map((s, i) => (
        <Section key={s.key} s={s} i={i} />
      ))}
    </>
  );
}
