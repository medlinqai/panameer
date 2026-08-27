import Link from "next/link";
import { HOME_SECTIONS, type HomeSection } from "@/lib/home-sections";
import { HERO_GRADIENT } from "@/components/marketing/hero-treatment";

/**
 * ── ⚠⚠ HOME'S SIX MENU SECTIONS — ONE COMPONENT, SIX INSTANCES (`P1-J0-E336`) ─
 *
 * ⚠⚠ THERE IS ONE `<Section>` AND IT RENDERS SIX TIMES. Writing six components was
 * the `one_hero` defect and Scott's words about it were *"what do you want from me
 * here??? I couldnt be more clear."* Everything that differs between the six is
 * DATA, in `lib/home-sections.ts`; everything that is the same is here, once.
 *
 * Source of truth: `mockups/home_sections_2026-08-27.html`. Its CSS is reproduced in
 * Tailwind, value for value — `no new global CSS` is a gate.
 *
 * ── ⚠ THE `.pm-home` MEASUREMENT, BEFORE ANYTHING WAS BUILT ─────────────────
 *
 * `brief_erp_punchout_to_home` died on this (33 differences across 37 elements), so
 * it was MEASURED at the exact insertion point rather than assumed. Injected a bare
 * `<div><h3><p>` immediately after `HomeHero` on `/` and read the computed values:
 *
 *     insertion parent   div.pm-home        inside .pm-home: TRUE
 *     <p>  inherits      Montserrat  rgb(42,51,69)  16px/24px
 *     <h3> inherits      Comfortaa   rgb(42,51,69)  16px/24px 700
 *     <body> outside     Geist       rgb(23,23,23)
 *
 * ⚠ SO THIS IS **NOT** THE `ErpPunchout` CASE. That section sat OUTSIDE `.pm-home`
 * and fell back to `<body>`'s Geist; this insertion point is INSIDE the wrapper and
 * already inherits Montserrat. NO FONT DRIFT TO FIX.
 *
 * ⚠⚠ `font-body` IS STILL ON THE ROOT, AND FOR A REASON THAT IS NOT THE FONT:
 * Scott's first act is to REORDER THESE SECTIONS, and if any of them lands outside
 * `.pm-home` the inherited face changes under it. Pinning the face means the block
 * renders identically wherever he moves it. That is `E333`'s lesson applied forward.
 * ⚠ `text-ink` IS DELIBERATELY **NOT** USED. `--color-ink` FLIPS to `#f2f0f7` under
 * `:root[data-theme="dark"]`, and the light bands here are a HARDCODED `#F6F3FA` —
 * a themed ink on a permanently-light band is exactly `P1-J0-E333`'s bug. Every text
 * colour below is explicit instead.
 * ⚠ NO `.pm-home` CLASS AND NO `.pm-home` VARIABLE IS REUSED. Values are mirrored.
 *
 * ── ⚠ THE EYEBROW SPECIFICITY TRAP DOES NOT EXIST HERE ──────────────────────
 *
 * In the mockup `.sec p{font-size:15.5px}` is (0,1,1) and `.eyebrow` is (0,1,0), so
 * the body rule silently won and three "shrink the font" edits did nothing; the fix
 * was `.sec .eyebrow` at (0,2,0). ⚠ TAILWIND HAS NO DESCENDANT SELECTORS — the
 * eyebrow carries `text-[11.5px]` on itself and nothing can outrank it. Measured
 * computed size is in the report.
 */

/** ⚠ 1180px + 26px gutters — the mockup's `.in`. */
const INNER = "mx-auto w-full max-w-[1180px] px-[26px]";

/**
 * ⚠ `min-w-0` IS LOAD-BEARING ON BOTH GRID CHILDREN. `fr` tracks default to
 * `min-width:auto`, so the `whitespace-nowrap` eyebrow would widen its OWN column
 * and the six sections would stop sharing a ratio. The mockup records the same fix
 * as `.sec>div{min-width:0}`.
 */
const COL = "min-w-0";

function Section({ s, i }: { s: HomeSection; i: number }) {
  /*
    ⚠ THE STRIPE AND THE SIDE BOTH COME FROM THE INDEX, so reordering
    `HOME_SECTIONS` re-stripes the page. Scott intends to reorder.
    Alternation starts DARK: 1 dark · 2 light · 3 dark · 4 light · 5 dark · 6 light.
  */
  const dark = i % 2 === 0;

  const eyebrow = dark ? "text-[#efa3ee]" : "text-[#A61AA5]";
  const head = dark ? "text-white" : "text-[#181E3C]";
  const bodyc = dark ? "text-[#DDE0F0]" : "text-[#5B6183]";

  /*
    ⚠ REVERSED SECTIONS FLIP THE **TRACKS**, NOT JUST THE ORDER. `order` alone left
    the copy column at 510px on even sections and 564px on odd, and the gate is that
    ALL SIX COPY COLUMNS MEASURE EQUAL. Odd: 1.05fr .95fr with copy first. Even:
    .95fr 1.05fr with copy second — so the copy track is 1.05fr on every section.
  */
  const grid = dark
    ? "min-[1151px]:grid-cols-[1.05fr_0.95fr]"
    : "min-[1151px]:grid-cols-[0.95fr_1.05fr]";

  const copy = (
    <div className={COL}>
      {/*
        ⚠⚠ ONE LINE ABOVE 1150px — Scott: *"do NOT wrap the SECTIONAL HEADERS."*
        ⚠ `whitespace-nowrap` IS SCOPED TO `min-[1151px]` ONLY. Below that the grid
        stacks to one column and a locked line would force HORIZONTAL PAGE SCROLL.
        Letter-spacing eases from .15em to .12em when it is allowed to wrap.
      */}
      <p
        className={
          "mb-3 text-[11.5px] font-bold uppercase tracking-[0.12em] " +
          "min-[1151px]:whitespace-nowrap min-[1151px]:tracking-[0.15em] " +
          eyebrow
        }
      >
        {s.eyebrow}
      </p>
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
      <p className={"text-[15.5px] leading-[1.68] " + bodyc}>{s.body}</p>

      <div className="mt-[26px] flex flex-wrap gap-3">
        {/*
          ⚠ THE CTA. `ctaHref === null` MEANS `aria-disabled` WITH NO `href` — Shop
          only, because there is no public catalogue (`P1-J2-E010`). It takes the
          same magenta fill so the page reads consistently, and `aria-disabled`
          rather than `disabled` keeps it in the reading order.
          ⚠ NOT `href="#"`, NOT an empty href, NOT a dead handler.
          ⚠ THE LABEL'S WHITE-ON-#D72CD6 IS 4.02 — `P1-J4-E020`, brand-level and
          pre-existing. Reported, not fixed; no colour token touched.
        */}
        {s.ctaHref === null ? (
          <button
            type="button"
            aria-disabled="true"
            className={
              "cursor-default rounded-[12px] border-2 border-magenta bg-magenta " +
              "px-[26px] py-3.5 font-display text-[15px] font-bold text-white"
            }
          >
            {s.ctaLabel}
          </button>
        ) : (
          <Link
            href={s.ctaHref}
            className={
              "rounded-[12px] border-2 border-magenta bg-magenta px-[26px] py-3.5 " +
              "font-display text-[15px] font-bold text-white transition-colors " +
              "hover:border-magenta-dark hover:bg-magenta-dark"
            }
          >
            {s.ctaLabel}
          </Link>
        )}
        {/* `Learn More` → the menu page. All six exist and are public. */}
        <Link
          href={s.learnMoreHref}
          className={
            "rounded-[12px] border-2 px-[26px] py-3.5 font-display text-[15px] " +
            "font-bold transition-colors " +
            (dark
              ? "border-white/60 text-white hover:border-white hover:bg-white hover:text-[#181E3C]"
              : "border-[#181E3C] text-[#181E3C] hover:bg-[#181E3C] hover:text-white")
          }
        >
          Learn More
        </Link>
      </div>
    </div>
  );

  const media = (
    <div className={COL}>
      {/* ⚠ THE PANEL IS WHITE ON BOTH BANDS — navy text on white, 16.28:1. */}
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
            {/* ⚠ THE NUMERAL IS DECORATION — the chip text carries the meaning. */}
            <span
              aria-hidden
              className="flex h-[26px] w-[26px] flex-none items-center justify-center rounded-[8px] border border-[#E7B9E6] bg-[#FBE7FB] text-[12px] font-bold text-[#A61AA5]"
            >
              {n + 1}
            </span>
            <span className="text-[14px] leading-[1.5] text-[#181E3C]">{c}</span>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <section
      id={`home-${s.key}`}
      className={
        "font-body py-[76px] " + (dark ? HERO_GRADIENT : "bg-[#F6F3FA]")
      }
    >
      <div className={INNER}>
        <div
          className={
            "grid grid-cols-1 items-center gap-[30px] " +
            "min-[1151px]:gap-[54px] " +
            grid
          }
        >
          {/* ⚠ DOM ORDER CARRIES THE READING ORDER — no `order` utilities, so a
              screen reader and a sighted reader get the same sequence. */}
          {dark ? copy : media}
          {dark ? media : copy}
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
