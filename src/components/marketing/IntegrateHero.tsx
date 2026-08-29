import Link from "next/link";
import { INTEGRATE_CTA_LABEL } from "@/lib/integrate-steps";
import {
  HERO_CARD,
  HERO_SCRIM,
  HERO_BUTTON,
  HERO_BRIDGE_TEXT,
  HERO_BRIDGE_CLASS,
  HERO_DESC_CLASS,
} from "@/components/marketing/hero-treatment";
import { HeroBox } from "@/components/marketing/HeroBox";
import { HeroTwoUp } from "@/components/marketing/HeroTwoUp";
import { HeroVideoBackdrop } from "@/components/media/HeroVideoBackdrop";
/*
  ⚠ `INTEGRATE_SUB` IS NO LONGER IMPORTED (`P1-ALL-E031`). Scott's approved
  description replaced it in the hero, so the import went with it — an unused
  import is a new lint warning and the baseline is 0-new.
  ⚠ THE CONSTANT STAYS ON DISK at `lib/integrate-hero.ts:83`, unimported, per the
  `E164` rule. It is the record of what this hero said before, and the brief is
  explicit that nothing existing is deleted.
*/
import { integrateHeroStats } from "@/lib/integrate-hero";

/**
 * `/integrate`'s HERO (`P1-J0-E325`). ⚠ WALK 1 — this page had never been walked
 * and its kicker and `<h1>` literally read `PLACEHOLDER`.
 *
 * ⚠⚠ NOT A FOURTH HERO IMPLEMENTATION. It composes the SAME THREE SHARED PIECES
 * `/learn`, `/talent`, `/shop` and `/find-work` use — `HeroBox` (the inset card and
 * radius), `HeroVideoBackdrop` (clip + scrim) and `HeroTwoUp` (the two columns).
 * Only the CONTENT is local.
 *
 * ⚠ ITS OWN FILE RATHER THAN AN EDIT TO `MarketingHero`, WHICH ALSO SERVES
 * `/why-panameer`. That page is not in this brief and comes out byte-identical —
 * proven by `innerText` hash and geometry at three widths, not by inspection.
 *
 * ── ⚠ WHAT CAME OUT, ALL FIVE FROM SCOTT'S SCREENSHOT ──────────────────────
 *
 *   1. the `PLACEHOLDER — ENTERPRISE` magenta kicker pill
 *   2. the search form (input + Search)
 *   3. the six filter chips
 *   4. the ⚡ AI microcopy line
 *   5. the `LEARN. CONNECT. CREATE. SETTLE.` lockup
 *
 * ⚠ `ENTERPRISE_HERO` STAYS IN `lib/brand.ts`, NOW UNIMPORTED BY THIS PAGE — the
 * `E164` shape. `BRAND_BADGE_SHORT` stays too; only this page's render goes.
 *
 * ⚠ REMOVING THE SEARCH LEFT NOTHING CLICKABLE, which is what turned
 * `check:app-shell`'s PUBLIC HERO guard red on `/hire-talent`. The CTA below is
 * what satisfies it, and the guard was not weakened.
 */
export async function IntegrateHero() {
  const stats = await integrateHeroStats();

  return (
    /*
      ⚠ THE CARD GRADIENT IS NOT DECORATION AND STAYS. It paints before the clip
      arrives, it is what a `prefers-reduced-motion` visitor sees, and it is the only
      thing guaranteeing the white `<h1>` is legible over footage. `isolate` keeps
      the video and scrim stacking inside the card; `overflow-hidden` comes from
      `HeroBox` and is what makes the clip respect the radius.
    */
    <HeroBox cardClassName={HERO_CARD}>
      <section className="relative px-6 pb-[48px] pt-[44px] min-[901px]:pb-[72px] min-[901px]:pt-[64px]">
        {/*
          ⚠ THE CLIP IS UNCHANGED — `consultation-hero.mp4`, 0.26MB, with the poster
          `brief_hero_posters` wired. It was already on this page via
          `MarketingHero`'s `videoSrc`; moving to a local hero must not lose it.
          ⚠ THE SCRIM IS THIS CARD'S OWN RAMP at the deepened alphas `/talent` and
          `/shop` use, which is what carries their pink bridge lines.
        */}
        <HeroVideoBackdrop
          src="/consultation-hero.mp4"
          poster="/posters/create.svg"
          videoClassName="absolute inset-0 h-full w-full object-cover opacity-40"
          scrimClassName={HERO_SCRIM}
        />
        <div className="relative z-[2] mx-auto max-w-[1120px]">
          <HeroTwoUp
            rowClassName="grid grid-cols-1 items-center gap-10 min-[901px]:grid-cols-2 min-[901px]:gap-14"
            left={
              <>
                {/* ⚠ SCOTT'S STRING, VERBATIM. `&` not `and`. */}
                <h1 className="font-display text-[34px] font-bold leading-[1.08] tracking-[-0.8px] min-[901px]:text-[46px] min-[901px]:tracking-[-1px]">
                  Punchout for Talent &amp; Services, Not Just Parts
                </h1>

                {/*
                  ── ⚠⚠ THE CTA — ⚠ DRAFT, CC's WORDS, NOT SCOTT'S ───────────────

                  Reported verbatim so he can overwrite it in one line. It exists
                  because removing the search box left the hero with nothing to
                  click, and `check:app-shell`'s PUBLIC HERO guard requires a
                  control — the same dependency that turned that guard red on
                  `/hire-talent`.

                  ⚠⚠ IT IS A PAGE LINK NOW, NOT AN ANCHOR (`P1-J0-E359`). Scott:
                  *"this page is incorrect. It puts the image on the same page
                  (muddies the water) and then scrolls down to it... I want to move
                  image 2 to a secon[d] page. then i want to link the button - image
                  3 - to that page."*
                  ⚠ SUPERSEDED, quoted not deleted: *"THE ANCHOR IS REAL AND ON THIS
                  PAGE. `ErpPunchout` renders `<section id="punchout">` further down
                  `/integrate`, so this CTA goes somewhere that exists."* `E333`
                  re-homed that id onto `ErpIntegration`'s wrapper; `E359` moved the
                  section, the wrapper and the id to `/erp-integration` together.
                  ⚠ THE POINT IT MADE STILL HOLDS — the destination must EXIST. It is
                  a real page now, and `E359` proved it by CLICKING the control in a
                  browser rather than reading the href. `P1-J0-E300` is four dead
                  fragments on `/optimize`; this is not one of them.

                  ⚠ STYLED BY MIRRORING `/optimize`'s `.hero-cta` COMPUTED VALUES —
                  Montserrat / 17px / 600 / #d72cd6 / radius 12px / padding 16px
                  30px / lh 25.5px. NOT by reusing the class: `home.css` is
                  `.pm-home`-scoped and this hero is outside that wrapper.

                  ⚠ THE LABEL'S 4.02:1 ON ITS OWN MAGENTA FILL IS `P1-J4-E020` — a
                  brand-token failure, footage-independent, reported not fixed.
                */}
                <Link
                  href="/erp-integration"
                  className={HERO_BUTTON}
                >
                  {/*
                    ⚠ RELABELLED `How We Integrate` (`P1-ALL-E031` §4, Scott
                    2026-08-26) AND READ FROM `INTEGRATE_CTA_LABEL`, because the
                    approved description above QUOTES it.
                    ⚠⚠ THE LABEL IS UNCHANGED BY `P1-J0-E359` — only the `href` moved,
                    `#punchout` -> `/erp-integration`. ⚠ SUPERSEDED, quoted not
                    deleted: *"THE `href="#punchout"` DID NOT CHANGE — only the
                    label."* That was `E031`'s statement and `E359` inverts it: this
                    time the href changed and the label did not.
                    ⚠ `integrate-steps.ts` WAS NOT TOUCHED beyond its comment — the
                    constant is byte-identical and the description still interpolates
                    it. `P1-J4-E024` is why that matters.
                    ⚠ SUPERSEDED LABEL: *`See How Punchout Works`*.
                  */}
                  {INTEGRATE_CTA_LABEL}
                </Link>
              </>
            }
            right={
              <>
                {/*
                  ⚠ SCOTT'S SUB-COPY, VERBATIM, with the curly apostrophe in
                  `Panameer’s`. ⚠ `in minutes` IS TESTABLE AND NOTHING BEHIND IT IS
                  BUILT — no `Integration` model, no punchout endpoint, no cXML
                  handler. Unlike `/talent`'s `in under one minute`, this one cannot
                  even be timed, because there is nothing to time. PRE-LAUNCH LIST.
                */}
                {/*
                  ── ⚠⚠ SCOTT-APPROVED DESCRIPTION (`P1-ALL-E031` amendment §3) ──

                  ⚠ HIS WORDS. SHIP AS WRITTEN. Not a draft, not chat's.
                  ⚠ REVISED BY SCOTT 2026-08-26: his rewrite ADDS the word `button`, so it
                  now matches every other page, and drops `immediately`.
                  ⚠ `ERP&rsquo;s` — a curly apostrophe, to match the curly quotes
                  around the label. His text used a straight one.

                  ⚠ THE QUOTED LABEL IS INTERPOLATED FROM `INTEGRATE_CTA_LABEL`,
                  NEVER RETYPED (`P1-J4-E024`).
                  ⚠ `HERO_DESC_CLASS` CARRIES THE FOUR-LINE `min-height` — the
                  hero's height is the breadcrumb, so all seven must match. See
                  `hero-treatment.ts`. ⚠ SHORTER COPY LEAVES WHITESPACE ON PURPOSE.
                */}
                <p className={HERO_DESC_CLASS}>
                  Click the &ldquo;{INTEGRATE_CTA_LABEL}&rdquo; button to see how existing
                  technologies expand your ERP&rsquo;s functionality and optimize
                  its processing.
                </p>

                {/*
                  ⚠ THE BRIDGE LINE — `/optimize`'s exact string in its measured
                  treatment (#efa3ee / 600 / 19px). Tailwind, mirrored.
                  ⚠⚠ AND IT POINTS AT STEPS THAT DO NOT EXIST YET. `/integrate` has
                  no `Here's How It Works` spine — Scott has a draft set of steps in
                  chat and has not approved them, so THIS BRIEF DOES NOT BUILD ONE.
                  The line says "the steps below" and there are none. ⚠ OPEN ROW,
                  reported; it closes with the spine brief, not this one.
                */}
                <p className={HERO_BRIDGE_CLASS}>{HERO_BRIDGE_TEXT}</p>

                {/*
                  ── ⚠⚠ ALL THREE TILES, SCOTT'S LABELS (`P1-J0-E327`) ────────────

                  ⚠ `integrate-walk1` SHIPPED ONE TILE, `Integration Methods = 3`,
                  AND THAT WAS A SUBSTITUTION HE NEVER ASKED FOR — it counted the
                  methods Panameer SUPPORTS, not the integrations it HAS, and the
                  label had been bent to fit the only number available. It is gone.

                  ⚠ TWO OF THE THREE ARE NAMED STUBS, NOT LITERALS:
                  `STUB_INTEGRATIONS` and `STUB_SERVICE_PRODUCT_REQUESTS` in
                  `lib/integrate-hero.ts`, each carrying the exact query that
                  replaces it when its model lands. The middle tile is the only live
                  read — `prisma.workRequest.count()`.

                  ⚠⚠ ALL THREE RENDER `0` TODAY, and the live one reads 0 for the
                  same reason `/explore?mode=work` says out loud: nothing is posted
                  yet. ⚠ EXACTLY ONE OF THEM WILL MOVE ON ITS OWN — which is why the
                  stubs are named constants and why `stat.stub` exists.

                  ⚠ `0` IS HONEST AND `0` SHIPS. No "coming soon", no dash, and no
                  tile hidden because its number is unflattering. ⚠ THE WALK-1 FILTER
                  THAT DROPPED ZERO-VALUED TILES IS REMOVED.

                  ⚠ FIXED THREE-COLUMN GRID NOW, not sized from the data — there are
                  always three. The chrome is `LearnStats`' values, copied.
                */}
                {stats.length > 0 && (
                  <dl className="mt-[26px] grid grid-cols-3 gap-[14px]">
                    {stats.map((s) => (
                      <div
                        key={s.label}
                        /* ⚠ `data-stub` MARKS THE PLACEHOLDERS FOR THE GUARD AND FOR
                           WHOEVER READS THE DOM. It changes NOTHING visually — a
                           stub and a live read are indistinguishable to a visitor,
                           and dressing one up as provisional would be the "coming
                           soon" hedge Scott ruled out. */
                        data-stub={s.stub ? "true" : "false"}
                        className="rounded-[14px] border border-white/[0.13] bg-white/[0.06] px-4 py-[18px]"
                      >
                        <dd className="font-display text-[34px] font-bold leading-[34px] text-white">
                          {s.value}
                        </dd>
                        <dt className="mt-2 text-[12.5px] font-normal leading-[16.25px] text-[#cec7db]">
                          {s.label}
                        </dt>
                      </div>
                    ))}
                  </dl>
                )}
              </>
            }
          />
        </div>
      </section>
    </HeroBox>
  );
}
