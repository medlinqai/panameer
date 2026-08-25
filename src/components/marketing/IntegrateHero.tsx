import Link from "next/link";
import { HeroBox } from "@/components/marketing/HeroBox";
import { HeroTwoUp } from "@/components/marketing/HeroTwoUp";
import { HeroVideoBackdrop } from "@/components/media/HeroVideoBackdrop";
import { INTEGRATE_SUB, integrateHeroStats } from "@/lib/integrate-hero";

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
    <HeroBox cardClassName="isolate bg-[radial-gradient(1100px_500px_at_82%_-10%,rgba(215,44,214,0.42),transparent_60%),linear-gradient(150deg,#0d1230_0%,#191a44_55%,#3a1c53_100%)] text-white">
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
          scrimClassName="absolute inset-0 bg-[linear-gradient(150deg,rgba(13,18,48,0.86)_0%,rgba(25,26,68,0.72)_55%,rgba(58,28,83,0.62)_100%)]"
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

                  ⚠⚠ THE ANCHOR IS REAL AND ON THIS PAGE. `ErpPunchout` renders
                  `<section id="punchout">` further down `/integrate`, so this CTA
                  goes somewhere that exists — which is the entire point.
                  ⚠ `P1-J0-E300` IS FOUR DEAD FRAGMENTS ON `/optimize`; the report
                  carries proof that this one resolves AND scrolls, not just that
                  the id is in the markup.

                  ⚠ STYLED BY MIRRORING `/optimize`'s `.hero-cta` COMPUTED VALUES —
                  Montserrat / 17px / 600 / #d72cd6 / radius 12px / padding 16px
                  30px / lh 25.5px. NOT by reusing the class: `home.css` is
                  `.pm-home`-scoped and this hero is outside that wrapper.

                  ⚠ THE LABEL'S 4.02:1 ON ITS OWN MAGENTA FILL IS `P1-J4-E020` — a
                  brand-token failure, footage-independent, reported not fixed.
                */}
                <Link
                  href="#punchout"
                  className="mt-8 inline-block rounded-[12px] bg-magenta px-[30px] py-4 text-[17px] font-semibold leading-[25.5px] text-white transition-colors hover:bg-magenta-dark"
                >
                  See How Punchout Works
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
                <p className="text-[17px] leading-[1.6] text-[#e9e6f5] min-[901px]:text-[19px]">
                  {INTEGRATE_SUB}
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
                <p className="mt-4 text-[19px] font-semibold leading-[1.5] text-[#efa3ee]">
                  Check out the steps below to see how it works.
                </p>

                {/*
                  ── ⚠⚠ THE COUNTERS: ONE TILE SHIPS, NOT THREE (`P1-J0-E327`) ────

                  Scott asked for three. ⚠ ONLY ONE HAS AN HONEST NON-ZERO SOURCE:
                  `Integration Methods` = `INTEGRATION_METHODS.length`, the three his
                  own sub-copy names. The `Work Request` count READ 0, and the third
                  has no model at all. Both are explained in `lib/integrate-hero.ts`
                  and in the brief report.

                  ⚠ THE GRID IS SIZED FROM THE DATA, not fixed at three — a 3-column
                  grid holding one tile leaves two empty cells, which reads as a
                  loading failure. The chrome is `LearnStats`' values, copied.
                */}
                {stats.length > 0 && (
                  <dl
                    className="mt-[26px] grid gap-[14px]"
                    style={{
                      gridTemplateColumns: `repeat(${Math.min(stats.length, 3)}, minmax(0, 1fr))`,
                    }}
                  >
                    {stats.map((s) => (
                      <div
                        key={s.label}
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
