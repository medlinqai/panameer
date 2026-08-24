import Link from "next/link";
import { HeroBox } from "@/components/marketing/HeroBox";
import { HeroTwoUp } from "@/components/marketing/HeroTwoUp";
import { BRAND_BADGE_SHORT, HERO_COPY } from "@/lib/brand";

/**
 * `/find-work`'s HERO — THE TWO-COLUMN TREATMENT (`P1-J4-E001`).
 *
 * Scott, 2026-08-24: *"we need to change the WORK image to be like LEARN/OPTIMIZE."*
 *
 * ⚠⚠ THIS WORK STREAM IS THE CONTAINER ONLY. Scott gave no new copy for this page
 * beyond the `<h1>` (`P1-J4-E003`). Every other string below is MOVED UNCHANGED out
 * of `MarketingHero`'s `HERO_COPY.provider` — the sub, the search placeholder, the
 * CTA label, the six tags and the résumé caption are all read from that constant
 * rather than retyped, so they cannot drift from where they came from.
 *
 * ⚠ ITS OWN FILE, NOT AN EDIT TO `MarketingHero`, for the reason `HireTalentHero`
 * records: that component still serves `/buy-services`, `/enterprise` and
 * `/why-panameer`, and every change here is `/find-work`-only.
 *
 * ── ⚠⚠ WHAT IS DELIBERATELY ABSENT ─────────────────────────────────────────
 *
 * ⚠ NO STAT ROW. Same unsolved problem as `/hire-talent` (`P1-J1-E013`): there is
 * no honest provider-side count. The 85 `ProviderProfile` rows are SEED —
 * `decisions-01.md` 2026-08-24 puts only the admin and three experts in the
 * protected set and calls everything else disposable — and exactly ONE `Package` is
 * published. A seed count shipped as traction is the defect `E013` already refused.
 * ⚠ THE ROW IS ABSENT, NOT EMPTY AND NOT INVENTED. Scott picks.
 *
 * ⚠ NO BRIDGE LINE. `/optimize` and `/learn` have one; Scott has not written one for
 * this page and drafting it would put CC's words in his hero.
 *
 * ⚠ NO VIDEO. `P1-J1-E011`: he dropped the `/hire-talent` clip after it measured
 * +9.2MB on first load and 13.5x LCP on fast 3G.
 *
 * ── ⚠ THE PILL STAYS, AND THAT IS AN ASYMMETRY TO REPORT ───────────────────
 *
 * `/hire-talent`'s `FOR TEAMS READY TO HIRE` pill was removed on Scott's explicit
 * instruction (`P1-J1-E013`). He has said NOTHING about this one, so `GO DIRECT`
 * ships. ⚠ THE TWO SISTER PAGES NOW DIFFER ON WHETHER A HERO HAS AN EYEBROW PILL,
 * and `/optimize` has none either. Reported, not resolved.
 *
 * ── ⚠⚠ THE AUDIENCE FLIPPED AND MOST OF THIS COPY DID NOT ──────────────────
 *
 * `P1-J4-E002`: *"The audience for WORK are the service buyers."* The `<h1>` is now
 * buyer copy. ⚠ EVERYTHING ELSE IN THIS HERO IS STILL ADDRESSED TO A PROVIDER:
 *
 *   · the sub — *"Find consistent work. Break the hourly ceiling."* is a SELLER's
 *     rate problem, and it is the loudest remaining mismatch on the page;
 *   · the search placeholder — *"Describe your expertise…"* is what a provider
 *     types, not a buyer;
 *   · the CTA — `Find Work →`;
 *   · the caption — *"Drop your résumé or LinkedIn"*;
 *   · the six tags, which are neutral domain names and read either way.
 *
 * ⚠ SCOTT HAS NOT REPLACED ANY OF THEM AND CC MUST NOT. A section re-written by CC
 * is a section he never approved. All of it is reported.
 */
export function FindWorkHero() {
  const copy = HERO_COPY.provider;
  return (
    /*
      ⚠ THE SAME `HeroBox` + GRADIENT `MarketingHero` GAVE THIS PAGE, transcribed so
      the container change is not also a visual change. `HeroTwoUp` supplies the two
      columns; nothing about the surface is new.
    */
    <HeroBox cardClassName="bg-[radial-gradient(1100px_500px_at_82%_-10%,rgba(215,44,214,0.42),transparent_60%),linear-gradient(150deg,#0d1230_0%,#191a44_55%,#3a1c53_100%)] text-white">
      <section className="px-6 py-16 min-[900px]:py-[84px]">
        <div className="relative mx-auto max-w-[1120px]">
          {/*
            ⚠ THE `GO DIRECT` PILL — KEPT. See the note above; `/hire-talent` lost
            its equivalent on an explicit instruction this page never got.
          */}
          <span className="mb-[22px] inline-block rounded-full bg-magenta px-3.5 py-1.5 font-display text-[12.5px] font-semibold uppercase tracking-[0.18em] text-white">
            {copy.kicker}
          </span>

          <HeroTwoUp
            rowClassName="grid grid-cols-1 items-center gap-10 min-[901px]:grid-cols-2 min-[901px]:gap-14"
            left={
              <>
                {/*
                  ⚠ VERBATIM SCOTT, FINAL (`P1-J4-E003`): *"Deploy Faster. With Less
                  Risk. That works."* — he accepted chat's edit of his own first
                  draft, `Deploy Faster and/or with Less Risk`. `and/or` is a contract
                  construction, not a headline: no reader parses the slash and it
                  reads as hedging. Two sentences claim both and commit to both.

                  ⚠ BOTH TERMINAL PERIODS ARE PART OF THE STRING.

                  ⚠⚠ THIS IS THE AUDIENCE FLIP LANDING IN THE HERO AND IT IS CORRECT.
                  The old `<h1>` was *"Go direct. Find consistent work, break the
                  hourly ceiling."* — `break the hourly ceiling` is a rate ceiling,
                  a SELLER's problem. `Deploy Faster. With Less Risk.` is what a
                  buyer wants. ⚠ THE SUB BENEATH IT IS STILL THE OLD SELLER COPY;
                  see the file header.
                */}
                <h1 className="font-display text-[34px] font-bold leading-[1.08] tracking-[-0.8px] min-[901px]:text-[46px] min-[901px]:tracking-[-1px]">
                  Deploy Faster. With Less Risk.
                </h1>

                {/*
                  ⚠ THE SEARCH FORM STAYS UNTIL SCOTT SAYS OTHERWISE, and it is this
                  hero's only control — the same thing that made removing
                  `/hire-talent`'s trip `check:app-shell`'s PUBLIC HERO guard.

                  ⚠ WHERE IT POSTS, VERIFIED NOT ASSUMED (chat was wrong about the
                  sister page once — `P1-J1-E014`): `GET /explore` with `mode=work`.
                  Measured 2026-08-24 signed out — see the report.

                  ⚠ `Describe your expertise…` AND `Find Work →` BOTH ADDRESS A
                  PROVIDER on a page whose audience is now the buyer. Moved unchanged
                  and reported.
                */}
                <form
                  action="/explore"
                  method="get"
                  className="mt-8 flex w-full max-w-[620px] rounded-full bg-white py-[7px] pl-5 pr-[7px] shadow-[0_18px_40px_rgba(0,0,0,0.28)] sm:pl-[22px]"
                >
                  <input type="hidden" name="mode" value="work" />
                  <input
                    name="q"
                    aria-label={copy.searchPlaceholder}
                    placeholder={copy.searchPlaceholder}
                    className="min-w-0 flex-1 bg-transparent text-[16px] text-ink outline-none placeholder:text-[#9aa0b8]"
                  />
                  <button
                    type="submit"
                    className="shrink-0 whitespace-nowrap rounded-full bg-magenta px-4 py-3 text-[15px] font-semibold text-white transition-colors hover:bg-magenta-dark sm:px-6"
                  >
                    {copy.searchCta}
                  </button>
                </form>
              </>
            }
            right={
              <>
                {/* ⚠ MOVED UNCHANGED from `HERO_COPY.provider.subhead`, nbsp and all
                    — and it is the loudest audience mismatch left on the page. */}
                <p className="text-[17px] leading-[1.6] text-[#e9e6f5] min-[901px]:text-[19px]">
                  {copy.subhead}
                </p>

                {/* ⚠ THE SIX TAGS, UNCHANGED. Neutral domain names — they read for
                    either audience, which is why they are the one part of this hero
                    the flip does not strand. */}
                <div className="mt-[18px] flex flex-wrap gap-2.5">
                  {copy.chips.map((chip, i) => (
                    <Link
                      key={chip}
                      href={`/explore?mode=work&q=${encodeURIComponent(chip)}`}
                      className={
                        "rounded-full px-4 py-2 text-[13.5px] transition-colors " +
                        (i === 0
                          ? "border border-magenta bg-magenta/[0.16] text-white"
                          : "border border-white/[0.22] bg-white/[0.04] text-[#e4e1f2] hover:border-white/60")
                      }
                    >
                      {chip}
                    </Link>
                  ))}
                </div>

                {/*
                  ⚠ MICROCOPY, NOT A CONTROL — the note `MarketingHero` carries stays
                  true: the résumé parser is real, but there is no drop target in this
                  hero, so it is a sentence and never a button.
                  ⚠ AND IT ADDRESSES A PROVIDER. Reported, unchanged.
                */}
                <p className="mt-3.5 flex items-center gap-[7px] text-[13.5px] text-[#cdc9e6]">
                  <span aria-hidden className="text-magenta">
                    ✦
                  </span>
                  {copy.aiHint}
                </p>
              </>
            }
          />

          {/*
            ⚠ THE LOCKUP STAYS, AND IT STILL CONFLICTS (`P1-J1-E019`).
            `Learn. Connect. Create. Settle.` is four verbs; `/hire-talent`'s spine is
            five with `Sell` in the last slot, and this page's new spine
            (`P1-J4-E006`) is a different five again. Not instructed on any page.
          */}
          <p className="mt-7 font-display text-[13px] font-semibold uppercase tracking-[0.2em] text-[#a7a3c6]">
            {BRAND_BADGE_SHORT}
          </p>
        </div>
      </section>
    </HeroBox>
  );
}
