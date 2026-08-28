import Link from "next/link";
import { HOME_SECTIONS, type HomeSection } from "@/lib/home-sections";
import { HeroVideoBackdrop } from "@/components/media/HeroVideoBackdrop";
import { LazyAutoplayVideo } from "@/components/media/LazyAutoplayVideo";
/*
  ⚠ `HERO_BRIDGE_CLASS` AND `HERO_BRIDGE_TEXT` ARE NO LONGER IMPORTED
  (`P1-J0-E338`). `/` dropped the bridge line — see the note where it used to
  render — and an unused import is a new lint warning against a 0-new baseline.
  ⚠ BOTH CONSTANTS STAY IN `hero-treatment.ts`, UNEDITED: six public pages still
  render them. This file simply stopped being one of the callers.
*/
import {
  HERO_BUTTON,
  HERO_BUTTON_OUTLINE,
  HERO_GRADIENT,
  HERO_SCRIM,
} from "@/components/marketing/hero-treatment";

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
 * eyebrow carries its size on itself and nothing can outrank it. Measured computed
 * size is in the report.
 * ⚠ THAT SIZE IS `text-[14px]` ON ALL SIX AS OF `P1-J0-E345`. This line used to name
 * `text-[11.5px]`, which was true only of sections 2-6 and is now true of none.
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

/*
  ── ⚠⚠ `text-white!` — A SPECIFICITY FIX, NOT A COLOUR CHOICE (`P1-J0-E338`) ──

  Every `<Link>` on `/` was rendering its label in `rgb(42,51,69)` instead of white,
  and the components were already ASKING for white. `home.css:106` is
  `.pm-home a { color: inherit }` — specificity (0,1,1). Tailwind's `text-white` is
  a single class, (0,1,0). THE STYLESHEET WINS, so every anchor inherits its
  parent's colour. MEASURED before the fix: 11 of 12 labels `rgb(42,51,69)`.
  ⚠ THE ONE THAT WAS ALREADY WHITE IS `/shop`'s, because it is a `<button>` — the
  rule only matches `a`. That is the tell.

  ⚠ IT AFFECTS `/` ALONE. Only `/` is wrapped in `.pm-home` (`page.tsx:110`), which
  is why the same constants render correctly on six other heroes.

  ⚠ TAILWIND v4 PUTS THE IMPORTANT MODIFIER AT THE END — `text-white!`, not
  `!text-white`. The v3 prefix form is silently ignored here.

  ⚠⚠ THE FIX IS AT THE CALL SITES, DELIBERATELY:
    · NOT in `hero-treatment.ts` — those constants are shared with six heroes that
      render correctly, and `!important` would follow them everywhere.
    · NOT in `home.css:106` — 21 legacy sections depend on `color: inherit`.
  Scott asked for *"all pink buttons on the page"*, so it is on all four labels
  (both hero controls and both of the other five sections'), magenta and clear alike.
*/
const LABEL_WHITE = " text-white!";

/**
 * ⚠⚠ WHICH CLIP EACH DARK BAND PLAYS — CHAT'S INFERENCE, NOT SCOTT'S INSTRUCTION.
 *
 * He asked for *"video behind the other purple bands"* and did not name the files.
 * Each band takes ITS OWN MENU PAGE'S hero clip, so the band on `/` and the page it
 * links to show the same footage:
 *
 *     section 3  Talent  ->  /connect-hero.mp4          0.14MB   (what `/talent` uses)
 *     section 5  Work    ->  /panameer-office-hero.mp4  1.01MB   (what `/work` uses)
 *
 * ⚠ THE `-hero` CUTS, NOT THE FULL FILMS. `connect.mp4` is 1.47MB and
 * `panameer-office.mp4` is 9.21MB; both are unused and must stay that way here.
 * ⚠ SECTION 1 IS ABSENT ON PURPOSE — the hero renders `/consultation.mp4` eagerly
 * through `HeroVideoBackdrop`, because it IS the fold.
 * ⚠ THE LILAC BANDS ARE ABSENT ON PURPOSE — video only behind the purple.
 */
const BAND_CLIPS: Record<string, string | undefined> = {
  talent: "/connect-hero.mp4",
  work: "/panameer-office-hero.mp4",
};

function Section({ s, i }: { s: HomeSection; i: number }) {
  /*
    ⚠ THE STRIPE AND THE SIDE BOTH COME FROM THE INDEX, so reordering
    `HOME_SECTIONS` re-stripes the page. Scott intends to reorder.
    Alternation starts DARK: 1 dark · 2 light · 3 dark · 4 light · 5 dark · 6 light.
  */
  const dark = i % 2 === 0;
  /*
    ⚠⚠ SECTION 1 IS `/`'s HERO NOW (`P1-J0-E337`). Scott, 2026-08-27: *"Let's start
    by removing the first (duplicate) section for optimization. HOWEVER — I want to
    style the next section down with the same background and video, but I want to
    keep it fullwidth."*

    `/` printed `Optimize Your Business with AI` TWICE — once in `HomeHero` and once
    here. `HomeHero`'s call site on `/` is gone; this section inherited the job.
    ⚠ `HomeHero` ITSELF SURVIVES UNTOUCHED and still renders `/optimize`.

    ⚠⚠ FULL-WIDTH IS THE POINT, AND IT IS WHY THIS IS NOT `HeroBox`. `HomeHero`
    wraps itself in an INSET, ROUNDED card. This band keeps the edge-to-edge shape it
    already had and gains only the gradient, the scrim and the clip.
    ⚠ NO `HeroBox`, NO `hero-card` CLASS, NO BORDER RADIUS, NO INSET.
    ⚠ THE INNER CONTENT STAYS ON THE SAME `max-w-[1180px]` RAIL as the other five,
    so only the BAND is full-width — the copy does not run to the screen edge.
    ⚠ THE OTHER FIVE SECTIONS ARE UNCHANGED. `isHero` gates every difference.
  */
  const isHero = i === 0;
  /* ⚠ HOISTED so TypeScript narrows it — `BAND_CLIPS[key]` is `string | undefined`. */
  const bandClip = !isHero && dark ? BAND_CLIPS[s.key] : undefined;

  /*
    ⚠⚠ WHITE ON THE DARK BANDS, `#A61AA5` ON THE LILAC (`P1-J0-E339` §1b).
    Scott, 2026-08-27, of this section's pink text: *"looks better if it is white."*
    He confirmed it against a render; it was written into a follow-up that was only
    half-run, so it never shipped until now.
    ⚠⚠ THE LILAC BANDS MUST NOT FOLLOW. White on `#F6F3FA` measures ~1.1:1 and
    simply disappears — the `dark` gate is what keeps them apart.
    ⚠ WHITE ALSO MEASURES BETTER ON THE DARK BANDS: 14.28 against the gradient's
    darkest stop `#3a1c53`, where `#efa3ee` is 7.58. Both pass; white is his call.
    ⚠ `HERO_BRIDGE_CLASS` ALSO CARRIES `#efa3ee` AND SIX OTHER PAGES RENDER IT.
    IT IS NOT TOUCHED — this is a local colour, not the shared constant.
    ⚠ SUPERSEDED: `dark ? "text-[#efa3ee]" : "text-[#A61AA5]"`.
  */
  const eyebrow = dark ? "text-white" : "text-[#A61AA5]";
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
          /*
            ⚠⚠ ONE SIZE FOR ALL SIX — 14px (`P1-J0-E345`). Scott: *"please make ALL
            HEADER SECTION TEXT the same size as SECTION 1."* Section 1 was already
            14px and sections 2-6 were 11.5px, so the two branches now agree and the
            ternary was COLLAPSED rather than left as two strings saying one thing.
            ⚠ SUPERSEDED, quoted not deleted — the branch this replaces:
                (isHero
                  ? "mb-3 text-[14px] ..."
                  : "mb-3 text-[11.5px] ...") +
            ⚠ SIZE ONLY. The COLOUR is still per-band and still branches — see the
            `eyebrow` const above, `dark ? "text-white" : "text-[#A61AA5]"`. Do NOT
            collapse that one: white on the lilac `#F6F3FA` measures ~1.1:1.

            ⚠ HISTORY OF THIS NUMBER, NOT LIVE INSTRUCTIONS: 18px shipped at `E339`;
            `E341` cut the hero to 14px on *"This is too big. Perhaps a size between
            that and image 2?"*. ⚠ THE `E341` BRIEF CALLED THE OUTGOING SIZE 17px
            TWICE — it was 18px, and 17px was never shipped.
            ⚠ THE `E339` SWEEP AT 1160 (column 553px), for the HERO's string only:
              22px 646 ✗ · 21px 617 ✗ · 20px 587 ✗ · 19px 558 ✗ · 18px 529 ✓ · 17px 499

            ⚠⚠ 14px IS NOT FREE FOR EVERY STRING — IT ONLY FITS BECAUSE THREE OF THEM
            WERE SHORTENED IN THE SAME COMMIT. Measured at 11.5px BEFORE `E345`,
            section 3 was 457px and section 6 was 481px; scaled to 14px those are
            ~556px and ~586px against a 553px column, i.e. BOTH WOULD HAVE OVERFLOWED.
            Sections 2, 3 and 6 got new, shorter strings, which is what made the
            uniform size possible. ⚠ LENGTHENING ANY HEADER CAN NOW BREAK THE PAGE.
            ⚠ MEASURED AT 14px AFTER (`Range`, 1160, column 553px):
              1: 411 · 2: 502 · 3: 408 · 4: 447 · 5: 445 · 6: 488 — all one line,
              tightest is section 2 with 51px of slack.

            ⚠⚠ MEASURE THE TEXT WITH A `Range`, NEVER A LINE COUNT. These are
            `whitespace-nowrap` above 1150px, so an oversized line does NOT wrap — it
            OVERFLOWS its column silently while the box still reports one clean line.
            That false pass cost `E337` a cut, and `E343`'s branch produced 28px of
            real page scroll at 1160 the same way. ⚠ `§65` asserts overflow now.
            ⚠ NO `nowrap` WAS ADDED TO BUY A FIT — the rule above predates `E345` and
            applies to the whole line; the fit comes from the strings being shorter.
          */
          "mb-3 text-[14px] font-bold uppercase tracking-[0.12em] min-[1151px]:whitespace-nowrap min-[1151px]:tracking-[0.15em] " +
          eyebrow
        }
      >
        {s.eyebrow}
      </p>
      {/*
        ── ⚠⚠ THE HERO'S HEADING IS AN `<h1>`; THE OTHER FIVE STAY `<h3>` ────────

        ⚠ NOT COSMETIC, AND NOT OPTIONAL. Removing `<HomeHero />` from `/`
        (`P1-J0-E337`) took the page's ONLY `<h1>` with it — `/` shipped for a few
        minutes with no top-level heading at all, which is a real accessibility and
        SEO defect, and it is also what made `check:ui §64` time out on
        `waitForSelector("h1")`.
        ⚠ THIS SECTION IS NOW THE PAGE'S HERO, so its headline IS the page's `<h1>`.
        That is the semantically correct fix, not a workaround for the test.
        ⚠ ONLY THE HERO. Six `<h1>`s on one page would be a different defect.
        ⚠ THE VISUAL TREATMENT IS IDENTICAL either way — same classes, same 30px.
        `.marketing-surface`'s `:is(h1,h2,h3,h4)` rules already cover both tags.
      */}
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
      {/*
        ── ⚠⚠ THE TAGLINE LEFT THE HERO (`P1-J0-E340`) ─────────────────────────

        Scott, 2026-08-27: *"I also do not want the tagline IN the hero...should be
        somewhere outside."* `E339` §6b had put `BRAND_DESCRIPTOR` here, in the slot
        the bridge line vacated. It now renders in a BAND OF ITS OWN in
        `app/page.tsx`, directly below `<HomeSections />` and above `<OneWayTwoWay />`.

        ⚠⚠ THE BAND IS ON `/` ONLY, AND IT LIVES IN `page.tsx`, NOT HERE. Putting it
        back inside this component would paint it on the hero again, and — because
        this component renders six sections — risks painting it six times.
        ⚠ `BRAND_DESCRIPTOR` IS NO LONGER IMPORTED BY THIS FILE. Nothing else here
        used it, so the import went with the render; an import kept for a render that
        no longer exists is a new lint warning against a 0-new baseline (`E338`).
        ⚠ THE CONSTANT ITSELF IS UNTOUCHED in `lib/brand.ts`, and its other three
        consumers — `MarketingFooter`'s band 2, that footer's legal bar, and
        `OnboardingFrame` — are untouched. They all still move together.

        ⚠ HISTORY, NOT A LIVE INSTRUCTION: `E339` chose WHITE here over `#efa3ee`,
        on the strength of *"looks better if it is white"*. The band restates the
        colour question on a light ground and answers it with navy; see `page.tsx`.
      */}
      {/*
        ⚠ `%s` IS THE PAGE'S OWN CTA LABEL, SUBSTITUTED HERE FROM `s.ctaLabel` —
        the copy QUOTES the button and must never hold a second typed copy of it
        (`P1-J4-E024`: `/work` shipped two different strings for one control).
        ⚠ ONLY THE OPTIMIZE BODY CONTAINS `%s`; `replace` is a no-op on the other five.
      */}
      <p className={"text-[15.5px] leading-[1.68] " + bodyc}>
        {s.body.replace("%s", s.ctaLabel)}
      </p>

      {/*
        ── ⚠⚠ NO BRIDGE LINE ON `/` (`P1-J0-E338`, Scott 2026-08-27) ────────────

        ⚠ IT WAS HERE AND IT IS GONE ON PURPOSE. `P1-J0-E337` had ADDED it, because
        removing `<HomeHero />` took `/`'s copy of the line with it and `check:ui`
        went red. Scott has now looked at the result and cut it.
        ⚠⚠ DO NOT PUT IT BACK. `E337` already made that mistake once; this is the
        second pass over the same line and the answer is that `/` does not carry it.

        ⚠ THE REASON IS THE WORDING: the line reads *"Check out the steps BELOW to
        see how it works."* and `/` has no step spine below the hero — it has five
        marketing sections. `E337` flagged exactly that when it restored the line.
        ⚠ THE OTHER SIX PUBLIC PAGES KEEP IT WORD FOR WORD, and
        `HERO_BRIDGE_TEXT`/`HERO_BRIDGE_CLASS` ARE NOT EDITED — they still serve
        those six. `check:ui`'s assertion dropped `/` from its URL list with the
        reason recorded there.
      */}
      {/*
        ⚠ THE HERO'S ROW DROPS ITS OWN `mt-[26px]`, AND THAT IS THE `mt-8`
        RECONCILIATION: `HERO_BUTTON` and `HERO_BUTTON_OUTLINE` both start with
        `mt-8`, which applies to each BUTTON inside a flex row. Keeping the row
        margin too would stack 26px + 32px = 58px above the buttons. The row margin
        goes; the constants' own `mt-8` (32px) provides the gap, and the constants
        are NOT edited — they are shared with six other heroes.
      */}
      <div className={(isHero ? "" : "mt-[26px] ") + "flex flex-wrap gap-3"}>
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
              "px-[26px] py-3.5 font-display text-[15px] font-bold text-white" + LABEL_WHITE
            }
          >
            {s.ctaLabel}
          </button>
        ) : (
          <Link
            href={s.ctaHref}
            className={
              /*
                ⚠ THE HERO TAKES `HERO_BUTTON` — Scott: *"CHANGE the style to the
                section above it."* ⚠ THE OTHER FIVE KEEP THEIR OWN CLASSES, which
                means HOME now runs TWO button treatments. REPORTED, NOT RESOLVED —
                Scott asked for this section only.
              */
              (isHero
                ? HERO_BUTTON
                : "rounded-[12px] border-2 border-magenta bg-magenta px-[26px] py-3.5 " +
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
            /*
              ⚠ `Learn More` ON THE HERO TAKES `HERO_BUTTON_OUTLINE` — Scott: *"CHANGE
              the button next to it (Learn More) to the clear style we used in Browse
              Catalog."*
              ⚠⚠ THAT CONSTANT CARRIES `bg-[rgba(13,18,48,0.40)]` (`P1-J3-E033`) AND
              THE FILL IS THE POINT — it is what makes a white label legible over
              video, which is exactly the situation here. DO NOT STRIP IT.
            */
            (isHero
              ? HERO_BUTTON_OUTLINE + LABEL_WHITE
              : "rounded-[12px] border-2 px-[26px] py-3.5 font-display text-[15px] " +
                "font-bold transition-colors " +
                /* ⚠ THE LILAC BANDS' OUTLINE IS NAVY-ON-LILAC BY DESIGN — it is not
                   over video and must NOT be forced white. Only the DARK bands'
                   outline takes the override. */
                /*
                  ── ⚠⚠ THE HOVER BUG (`P1-J0-E348`) — AND THE MECHANISM IS CASCADE
                     LAYERS, NOT SPECIFICITY ────────────────────────────────────

                  Scott: *"ALL rollover buttons not built with correct rollover
                  colors."* FIVE of the six `Learn More` controls were unreadable on
                  hover. AUDITED, not guessed — all 31 button-like controls on `/`
                  were measured resting AND hovered, sampling the PAINTED fill.

                  ⚠⚠ THE CAUSE IS NOT `(0,1,1)` BEATING `(0,1,0)`. CDP's
                  `getMatchedStylesForNode` resolves it as:
                      a                        color:inherit   layer=base
                      .text-[#181E3C]          color:#181e3c   layer=utilities
                      .hover:text-white:hover  color:#fff      layer=utilities
                      .pm-home a               color:inherit   layer=(none)  <- WINS
                  `home.css` is UNLAYERED and Tailwind's utilities are in
                  `@layer utilities`. AN UNLAYERED NORMAL DECLARATION BEATS A LAYERED
                  ONE WHATEVER THE SPECIFICITY — `.hover:text-white:hover` is (0,2,0)
                  and still loses to `.pm-home a` at (0,1,1). Specificity never got a
                  say. ⚠ THIS IS WHY `!important` IS THE FIX AND THE ONLY FIX SHORT OF
                  EDITING `home.css`: an important LAYERED declaration outranks a
                  normal UNLAYERED one.

                  DARK BANDS (3 and 5): `LABEL_WHITE` is `text-white!`, important, so
                  it beat the normal `hover:text-[#181E3C]`. Background went white,
                  label stayed white. MEASURED 1.00:1 — invisible.
                  ⚠ FIX: `hover:text-[#181E3C]!`. Both are important and in the same
                  layer, so specificity decides between them and the `hover:` variant
                  (0,2,0) beats the base (0,1,0).

                  LILAC BANDS (2, 4 and 6): ⚠⚠ THE BRIEF'S TABLE SAID THESE WERE "OK —
                  no LABEL_WHITE". THEY WERE NOT. Having no `!` is exactly what broke
                  them: BOTH `text-[#181E3C]` and `hover:text-white` lost to the
                  unlayered rule, so the label sat at the inherited `rgb(42,51,69)` in
                  both states while the background went navy. MEASURED 1.29:1.
                  ⚠ FIX: `hover:text-white!` only.

                  ⚠ THE RESTING LILAC LABEL IS STILL THE INHERITED `rgb(42,51,69)`,
                  NOT the `#181E3C` this class asks for — the same layer defeat. It
                  measures 11.53 on lilac, so it is LEGIBLE and was left alone: this
                  brief authorises `!` only where a HOVER state is unreachable.
                  Reported at `E348` as a separate cosmetic deviation.
                  ⚠ `!` WAS ADDED TO EXACTLY TWO PLACES. The hero outline, the magenta
                  buttons and the disabled control were all measured and are fine.
                */
                (dark
                  ? "border-white/60 text-white hover:border-white hover:bg-white hover:text-[#181E3C]!" + LABEL_WHITE
                  : "border-[#181E3C] text-[#181E3C] hover:bg-[#181E3C] hover:text-white!"))
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
      {/*
        ── ⚠⚠ THE TILES CAME OFF `/` AGAIN (`P1-J0-E340`) ──────────────────────

        Scott, 2026-08-27: *"Can you replace the tiles with the six?"* — the
        What-you-get card went back to SIX chips (see `home-sections.ts`) and
        `<ProofStats />` rendered here, directly below it, until this commit. The
        card replaces it; nothing took its place in the layout.

        ⚠⚠ `ProofStats.tsx` IS STILL ON DISK, UNEDITED, AND IS NOT UNUSED. It is
        rendered by `HomeHero.tsx:266`, which `/optimize` calls — so `/optimize`
        STILL SHOWS ALL THREE TILES and is untouched by `E340`. DO NOT "tidy away"
        the component as dead; deleting it breaks that page.
        ⚠ THE IMPORT WAS REMOVED FROM THIS FILE'S HEADER TOO. An import left behind
        for a render that no longer exists is a new lint warning against a 0-new
        baseline — `E338` cost exactly that, twice.

        ⚠⚠ THIS TAKES THE INVENTED FIGURES OFF THE HOME PAGE AGAIN. `942 Assessments
        Completed`, `10M+ Total Savings` and `$6M+ Tax Savings` are stated as
        INVENTED in `ProofStats.tsx:9` and are NOT live reads. They still render on
        `/optimize`, so THAT ROW STAYS OPEN — this narrows the exposure to one page,
        it does not close it.

        ⚠ HISTORY, NOT A LIVE INSTRUCTION: `E338` put the tiles here on the
        instruction *"Scott wants the tiles back"*, and `E337` had removed them
        before that by taking `<HomeHero />` off `/`. Third move of this strip. Do
        not re-add it on the strength of the `E338` quote.
      */}
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
