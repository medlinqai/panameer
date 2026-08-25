import { HeroBox } from "@/components/marketing/HeroBox";
import { HeroTwoUp } from "@/components/marketing/HeroTwoUp";
import { BRAND_BADGE_SHORT, HERO_COPY } from "@/lib/brand";

/**
 * `/hire-talent`'s HERO — ITS OWN COMPOSITION, NOT `MarketingHero` (`P1-J1-E013`).
 *
 * Scott, 2026-08-24, with `/optimize` beside it: *"image 1 needs to look like
 * image 2 in style and formatting."*
 *
 * ── ⚠ WHY THIS IS A NEW FILE AND NOT AN EDIT TO `MarketingHero` ─────────────
 *
 * `MarketingHero` is rendered by FIVE pages — `/hire-talent`, `/find-work`,
 * `/buy-services`, `/enterprise` and `/why-panameer`. Every change Scott asked
 * for here is `/hire-talent`-only: the video backdrop, the two-column shape, the
 * removed eyebrow pill, the removed search box. Editing the shared hero would
 * have silently applied all four to four pages he did not walk.
 *
 * ⚠ THIS IS NOT A THIRD HERO IMPLEMENTATION. It composes the SAME three shared
 * pieces `/learn` does — `HeroBox` for the inset card, `HeroVideoBackdrop` for
 * the clip and scrim, `HeroTwoUp` for the two columns. Nothing about the shape is
 * re-implemented; only the content is local.
 *
 * ⚠ `MarketingHero` IS UNTOUCHED and still serves the other four pages. Its
 * search form, chips and AI hint all still exist there.
 *
 * ── ⚠⚠ THIS PAGE IS NOW UNAMBIGUOUSLY THE SUPPLY-SIDE PAGE ──────────────────
 *
 * `Sell More than Just Your Resume` is addressed to a SELLER, and so is the sub.
 * Combined with the `JOIN · LEARN · CONNECT · CREATE · SELL` spine (`P1-J1-E012`)
 * — whose step 5 is `Sell Direct to Oracle Licensees` — `/hire-talent` sells to
 * PROVIDERS. Chat argued for buyer-facing; Scott answered by writing seller copy
 * twice.
 *
 * ⚠ THE BUYER NOW HAS NOWHERE TO GO, AND THAT IS STILL OPEN. There is no
 * `/providers` route; `(app)/hire` and `(app)/search` are both `ComingSoon`. The
 * page's own `AiMatch` section still says *"Post what you need. Get ranked,
 * vetted experts."* — a buyer sentence under a seller headline. Reported, not
 * resolved here.
 *
 * ── ⚠ WHAT SCOTT DID NOT GIVE, AND IS THEREFORE ABSENT ──────────────────────
 *
 * `/optimize`'s hero has a pink bridge line, a three-up stat row and a CTA
 * button. All three are MISSING here on purpose:
 *
 *   · THE STAT ROW — nothing may be invented and there is no honest figure.
 *     Measured live 2026-08-24: 85 `ProviderProfile` rows (seeded, not public),
 *     7 `Certification` rows of which 1 is `issued_from = LEARN`, and ONE
 *     published `Package`. A "85 experts" tile would be a seed count dressed as
 *     traction. ⚠ THE ROW IS ABSENT RATHER THAN EMPTY OR INVENTED.
 *   · THE BRIDGE LINE — Scott has not written one, and drafting one here would
 *     put chat's words in his hero. ⚠ It would also have to be measured against
 *     this clip's footage before shipping; `/learn` shipped a failing pink over
 *     video exactly that way (`P1-J0-E299`).
 *   · THE CTA — he has not named a button, and none is invented. ⚠ THE SEARCH FORM
 *     IS THE HERO'S CONTROL, and it is retained deliberately — see the note on it
 *     below. Without it this hero had NOTHING to click, which `check:app-shell`'s
 *     PUBLIC HERO guard catches by design: *"the hero offers nothing to click"*.
 *     ⚠ A NAMED BUTTON IS STILL WANTED and is still Scott's to name.
 *
 * ⚠ DO NOT FILL ANY OF THE THREE IN WITHOUT HIM. An invented stat, a drafted
 * bridge line and a guessed CTA label are three different ways to put words he
 * did not write on his own hero.
 */

/**
 * ⚠⚠ THERE IS NO VIDEO BACKDROP, AND IT IS NOT COMING BACK WITHOUT A NEW ASSET.
 *
 * `P1-J1-E011` asked for one; `panameer-office.mp4` was the only clip not already
 * a header elsewhere or playing further down this same page. It was built,
 * measured, and DROPPED. Scott, 2026-08-24, after the numbers: *"dont want the
 * video there - remove as i said."*
 *
 * Why, so nobody re-proposes it:
 *
 *   · IT IS 9.2MB. Adding it measured +9.21MB on first load (12.20 -> 21.41MB,
 *     +75%), and LCP on fast 3G went 1,036ms -> 14,028ms — 13.5x. ⚠ LOCALHOST HID
 *     IT COMPLETELY; there the LCP got faster. Only throttled numbers showed it.
 *   · A SMALLER OR SHORTER CUT IS AN ASSET DECISION AND SCOTT'S. Not a transcode
 *     to be done on CC's initiative.
 *
 * ⚠ `public/panameer-office.mp4` STAYS ON DISK — it is Scott's asset, not build
 * output.
 *
 * ⚠ AND THE CONTRAST FAILURE DIED WITH IT. `Learn. Connect. Create. Settle.`
 * measured 3.00 / 2.50 / 2.70 : 1 against the footage — failing AA at every width
 * — but 5.74 / 6.05 / 6.17 on the flat gradient below, which passes and always
 * did. ⚠ THE FAILURE WAS CONDITIONAL ON THE CLIP. No colour was ever changed, and
 * none needs to be. ⚠ IF A CLIP IS EVER PUT BACK, THAT LOCKUP HAS TO BE
 * RE-MEASURED FIRST.
 *
 * ⚠ `HeroVideoBackdrop` IS UNTOUCHED and still serves `/` and `/learn`.
 *
 * ⚠ `P1-J1-E018` IS FIXED — this header used to warn that `VideoSequence` eagerly
 * loaded all four of its clips (10.63MB) on this page. `9d7b133` made them lazy
 * (`LazyAutoplayVideo`): first load went 11.01MB -> 0.39MB, media 10.63 -> 0.00MB.
 * ⚠ THAT IS WHAT MADE A HERO CLIP AFFORDABLE HERE AT ALL — see `E028` below.
 */
export function HireTalentHero() {
  return (
    /*
      ⚠ THE GRADIENT IS ON THE CARD AND IT IS NOT DECORATION. It paints before the
      clip arrives — which on a 9.2MB file is a visible window — it is what a
      reduced-motion visitor sees, and it is the only thing guaranteeing the white
      headline is legible, because footage is whatever the camera saw. Same rule
      recorded on `/learn`'s hero.

      ⚠ `isolate` KEEPS THE VIDEO AND SCRIM STACKING INSIDE THIS CARD rather than
      against the page; `overflow-hidden` comes from `HeroBox` and is what makes
      the clip respect the radius.
    */
    <HeroBox cardClassName="isolate bg-[radial-gradient(1100px_500px_at_82%_-10%,rgba(215,44,214,0.42),transparent_60%),linear-gradient(150deg,#0d1230_0%,#191a44_55%,#3a1c53_100%)] text-white">
      <section className="px-6 py-16 min-[900px]:py-[84px]">
        <div className="relative z-[2] mx-auto max-w-[1120px]">
          {/*
            ⚠ THE `FOR TEAMS READY TO HIRE` PILL IS GONE (`P1-J1-E014`, his image 3).
            It was a BUYER label, and this page just became the SELLER page — so
            removing it is consistency, not tidying. `/optimize`'s hero has no pill
            either. `HIRE_HERO.kicker` still holds the string and is still used by
            nothing else; the constant is left alone.
          */}
          <HeroTwoUp
            rowClassName="grid grid-cols-1 items-center gap-10 min-[901px]:grid-cols-2 min-[901px]:gap-14"
            left={
              <>
                {/*
                  ⚠ VERBATIM SCOTT, 2026-08-24 (`P1-J1-E013`).

                  ⚠ `Resume`, NOT `Résumé` — HIS SPELLING, SHIPPED AS TYPED. The rest
                  of the codebase uses the accented form (`signedResumeUrl`'s copy,
                  the Learn panels), so the site is now inconsistent on one word.
                  REPORTED; nothing else changed.

                  ⚠ NO CTA BENEATH IT, AND THAT IS THE GAP. See the file header — the
                  search box was removed by `E014` and Scott has not named a button.
                */}
                <h1 className="font-display text-[34px] font-bold leading-[1.08] tracking-[-0.8px] min-[901px]:text-[46px] min-[901px]:tracking-[-1px]">
                  Sell More than Just Your Resume
                </h1>
              </>
            }
            right={
              <>
                {/*
                  ── ⚠⚠ VERBATIM SCOTT, 2026-08-25 (`P1-J1-E024`) ────────────────

                  It REPLACES *"Don't just upload your resume and sit — create
                  service products and use AI to sell them directly to buyers."*

                  ⚠ AND THE REPLACEMENT RETIRES A FLAGGED CLAIM RATHER THAN ADDING
                  ONE. The old sentence put the AI on the SELLING side, which the
                  build does not do — `work-request-match.ts` ranks PEOPLE against a
                  `WorkRequest` and contains zero `Package` references. ⚠ THE NOTE
                  THAT RECORDED THAT IS DELETED FROM THIS FILE'S HEADER, not left
                  teaching a claim the page no longer makes.

                  ⚠⚠ SENTENCE ONE IS THE STRONGEST CLAIM ON THE PAGE AND IT IS
                  BACKED — checked, not assumed. `lib/resume/ai-extract.ts` +
                  `ai-provider.ts` run live against the Anthropic API;
                  `/api/onboarding/provider/resume-ai`, `/skill-suggestions` and
                  `/import` all exist; `ProviderSkill.weight` is derived from dated
                  jobs. `TALENT_STEPS[1].description` already says the same thing.
                  ⚠ MEASURED 2026-08-25 for `E026`: 6 real end-to-end runs on two
                  fixture CVs, 9.0s to 31.8s. The AI does the work it claims.

                  ── ⚠ THREE CORRECTIONS, ALL REPORTED, NONE SILENT ──────────────

                    · `auto create` -> `auto-create`. Compound adjective before a noun.
                    · `deploy-ables` -> `deployables`. ⚠ THIS IS THE WORD
                      `ORIENTATION_2026-08-24.md` §2 USES for the stack's top layer
                      (*"a deployable asset (a report, an AI agent)"*), so the site
                      now agrees with itself. ⚠ IF HE MEANT `deliverables` THAT IS A
                      ONE-WORD REVERT — asked in the report.
                    · his double spaces after the periods collapse to one.
                      Typographic only.

                  ⚠⚠ `offering retainer... hours` IS THE SECOND RETAINER CLAIM ON THE
                  PUBLIC SITE THIS WEEK and the position is the same as the first
                  (`P1-J0-E311`, `FourAudiences`): it says what the PROVIDER offers,
                  not what the platform sells, schedules or bills — and NONE of that
                  is built. Zero `Conversation` models, zero `Message` models, no
                  booking, and `/messages` ships a disabled composer
                  (`P1-J3-E014`). ⚠ SHIPPED AS HIS WORDS; FLAGGED FOR CONSISTENCY
                  WITH THE OTHER SURFACE.
                */}
                <p className="text-[17px] leading-[1.6] text-[#e9e6f5] min-[901px]:text-[19px]">
                  Use AI to auto-create your profile. Expand existing and create
                  new income streams by building new or sharing existing skills,
                  reselling previous deployables, and offering retainer,
                  mentoring, or application demo hours.
                </p>
              </>
            }
          />

          {/*
            ── ⚠⚠ THE SEARCH FORM STAYS, AND SCOTT'S OWN CONDITION IS WHY ─────

            `P1-J1-E014`: *"REMOVE the search box (unless it is a teaser to see
            sample profiles)."* The brief read that condition as unmeetable and
            instructed removal, on the stated grounds that *"There is NO public
            profile browse anywhere"* — no `/providers` route, `(app)/hire` and
            `(app)/search` both `ComingSoon`.

            ⚠⚠ THAT PREMISE IS FALSE, AND IT WAS CHECKED RATHER THAN ASSUMED.
            `/explore` is the public browse and it WORKS SIGNED OUT. Measured
            2026-08-24: `GET /explore?mode=hire&q=oracle` returns 200 and renders
            *"These experts match what you need — Showing matches for 'oracle' ·
            22 experts found"* with real provider cards. This form posts to exactly
            that URL with `mode=hire`.

            ⚠ SO THE BOX **IS** THE TEASER HIS CONDITION ASKED FOR, and his
            conditional says keep it. The three `ComingSoon` routes the brief cites
            are all INSIDE `(app)` — signed-in surfaces — which is why they read as
            "no browse exists" from a route listing and are not what a signed-out
            visitor hits.

            ⚠ IT IS ALSO THE ONLY THING IN THIS HERO TO CLICK. Removing it turned
            `check:app-shell`'s PUBLIC HERO guard red — *"the hero offers nothing to
            click"* — and the honest fixes were to keep it or to invent a CTA Scott
            has not named. ⚠ WEAKENING THAT GUARD WAS NOT AN OPTION.

            ⚠⚠ REPORTED FOR SCOTT TO OVERRIDE. If he wants it gone regardless, it
            goes the moment he names a CTA to replace it — not before.

            ── ⚠ WHAT DID COME OUT, WHICH IS THE PART HE ACTUALLY OBJECTED TO ──

            Scott: *"this seems to be confused with WORK."* The Work-journey framing
            is GONE:

              · the caption *"Describe it in a sentence or drop a document — AI
                drafts your scoped Work Request"* — ⚠ THIS was the Work journey on a
                Talent page, and it is the removal that matters;
              · the six domain filter chips (`P1-J1-E015` — see the report: only ONE
                published `Package` exists, so product tags could not replace them);
              · the `For teams ready to hire` buyer pill (`P1-J1-E014`).

            ⚠ THE PLACEHOLDER IS `MarketingHero`'s OWN, from `HERO_COPY.buyer`, so
            the two pages still ask for the same thing in the same words. It is a
            BUYER-shaped prompt under a SELLER headline — reported, not rewritten,
            because rewriting it would put chat's words in the hero's only control.
          */}
          <form
            action="/explore"
            method="get"
            className="relative z-[2] mt-8 flex w-full max-w-[620px] rounded-full bg-white py-[7px] pl-5 pr-[7px] shadow-[0_18px_40px_rgba(0,0,0,0.28)] sm:pl-[22px]"
          >
            <input type="hidden" name="mode" value="hire" />
            <input
              name="q"
              aria-label={HERO_COPY.buyer.searchPlaceholder}
              placeholder={HERO_COPY.buyer.searchPlaceholder}
              className="min-w-0 flex-1 bg-transparent text-[16px] text-ink outline-none placeholder:text-[#9aa0b8]"
            />
            <button
              type="submit"
              className="shrink-0 whitespace-nowrap rounded-full bg-magenta px-4 py-3 text-[15px] font-semibold text-white transition-colors hover:bg-magenta-dark sm:px-6"
            >
              {HERO_COPY.buyer.searchCta}
            </button>
          </form>

          {/*
            ⚠ THE LOCKUP STAYS, AND IT NOW CONFLICTS WITH THE SPINE BELOW IT.
            `BRAND_BADGE_SHORT` is `Learn. Connect. Create. Settle.`; the new spine
            (`P1-J1-E012`) is `Join · Learn · Connect · Create · Sell`. Four verbs
            versus five, three shared, and `Settle` versus `Sell` in the last slot —
            two different four/five-beat stories on one page.
            ⚠ NOT INSTRUCTED. Scott did not ask for either to change. REPORTED.
          */}
          <p className="relative z-[2] mt-7 font-display text-[13px] font-semibold uppercase tracking-[0.2em] text-[#a7a3c6]">
            {BRAND_BADGE_SHORT}
          </p>
        </div>
      </section>
    </HeroBox>
  );
}
