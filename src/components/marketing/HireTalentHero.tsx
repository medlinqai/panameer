import { HeroBox } from "@/components/marketing/HeroBox";
import { HeroTwoUp } from "@/components/marketing/HeroTwoUp";
import { HeroVideoBackdrop } from "@/components/media/HeroVideoBackdrop";
import { talentHeroStats } from "@/lib/talent-stats";

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
export async function HireTalentHero() {
  const stats = await talentHeroStats();
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
      <section className="relative px-6 pb-[48px] pt-[44px] min-[901px]:pb-[72px] min-[901px]:pt-[64px]">
        {/*
          ── ⚠⚠ THE HERO CLIP (`P1-J1-E028`) ─────────────────────────────────

          Scott: *"INTEGRATE, SHOP, WORK, TALENT — they do not have a video
          background. please add this fix."*

          ⚠ `connect-hero.mp4`, 0.14MB, ASSIGNED BY SCOTT 2026-08-25. His revised
          mapping moved `panameer-office-hero.mp4` (1.01MB) off this page and
          reserved it for `/find-work`, which is a separate brief
          (`brief_hero_video_trim`, `P1-J4-E019`). ⚠ THE FULL-SIZE CLIPS ARE
          FORBIDDEN HERE: `connect.mp4` is 1.48MB and `panameer-office.mp4` is
          9.21MB — the second is what got a hero video REJECTED on this exact page
          on 2026-08-24 (+9.21MB first load, fast-3G LCP 1,036 -> 14,028ms).

          ⚠ THIS CLIP IS SMALLER THAN EVERY OTHER HERO CLIP ON THE SITE.
          `/learn.mp4` is 1.40MB and already ships on two pages; this is a tenth of
          that, faststart (`moov` before `mdat`, verified), ~0.8s to download whole
          on fast 3G.

          ⚠⚠ AND IT IS ONLY AFFORDABLE BECAUSE `P1-J1-E018` WAS FIXED FIRST. Until
          `9d7b133` this page eager-loaded 10.63MB of below-the-fold `VideoSequence`
          clips; a hero clip would have landed on top of that. Measured on this
          branch before the clip: first load 0.39MB, media 0.00MB. The brief's note
          that E018 "makes this costlier" is out of date — it makes it possible.

          ⚠ THE CARD'S GRADIENT IS NOT DECORATION AND STAYS. It paints before the
          clip arrives, it is what a `prefers-reduced-motion` visitor sees
          (`globals.css` hides `[data-autoplay-video]` outright), and it is the only
          thing guaranteeing the white `<h1>` is legible — footage is whatever the
          camera saw. `isolate` stays on the card; `overflow-hidden` keeps coming
          from `HeroBox`, which is what makes the clip respect the radius.

          ⚠⚠ THE SCRIM ALPHAS WERE DEEPENED, AND THAT IS RUNG 2 OF THE BRIEF'S
          OWN LADDER — PRE-AUTHORISED, NOT AN ADAPTATION. It shipped at `/learn`'s
          alphas `0.82 / 0.62 / 0.30` and the WS3a pink bridge line measured
          **4.16 / 4.13 / 4.18** over the clip — a FAIL at AA 4.5 at all three
          widths. The ladder's rung 2 is *"deepen the scrim under the hero text
          column only, and re-measure"*, and it changes NO COLOUR SCOTT CHOSE.

          ⚠ `0.86 / 0.72 / 0.62`. The far stop moved most because that is where the
          RIGHT COLUMN sits — the sub-copy and the bridge line — and 0.30 was the
          weakest point on the card. ⚠ THE HEXES ARE UNCHANGED; only alpha moved,
          and it is reversible in three numbers.

          ⚠ NOT TOUCHED, per the ladder: the pink, the type size, the video opacity,
          the sub-copy, and no text-shadow anywhere.

          ⚠ `HeroVideoBackdrop` IS COMPOSED, NEVER EDITED — no props added, no
          behaviour changed. It still serves `/` and `/learn` unchanged.
        */}
        <HeroVideoBackdrop
          src="/connect-hero.mp4"
          poster="/posters/connect.svg"
          videoClassName="absolute inset-0 h-full w-full object-cover opacity-40"
          scrimClassName="absolute inset-0 bg-[linear-gradient(150deg,rgba(13,18,48,0.86)_0%,rgba(25,26,68,0.72)_55%,rgba(58,28,83,0.62)_100%)]"
        />
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

                {/*
                  ── ⚠⚠ THE NAMED CTA (`P1-J1-E025`) — AND ITS DESTINATION IS A
                  REPORTED DEVIATION, NOT THE ONE THE BRIEF NAMED ──────────────

                  The brief specified `/join/provider/start` and called it "VERIFIED
                  ON DISK". ⚠ THE FILE EXISTS; THE ROUTE IS NOT REACHABLE. Measured
                  signed-out 2026-08-25:

                      /join/provider/start   307 -> /login?callbackUrl=...
                      /join/provider         200
                      /join/provider/preview 307 -> /dashboard

                  ⚠ `join/provider/start/page.tsx` IS AN IN-WIZARD PAGE, not an entry
                  point: its own header calls it *"the FIRST page of the
                  profile-building process: verify email -> HERE -> step 1/12"*, and it
                  redirects on THREE conditions — no viewer, not a provider or no
                  `providerProfile`, and unverified email. A signed-out visitor cannot
                  reach it by construction.

                  ⚠⚠ SO IT POINTS AT `/join/provider`, WHICH IS A DEVIATION FROM THE
                  BRIEF'S NAMED DESTINATION AND IS REPORTED AS ONE. Three reasons it is
                  the right target rather than a guess:

                    · it is the ONLY public (200, signed-out) provider entry, and it
                      is the provider signup wizard itself — `SignUpForm` +
                      `VerifyGate` — so it does what the label promises;
                    · `join/provider/start/page.tsx:33` ITSELF redirects there
                      (`redirect("/join/provider")`) for an unverified user, so this is
                      the app's own answer, not CC's;
                    · the brief forbade substituting **`/join`**, the generic
                      chooser. This is not that.

                  ⚠ ONE-WORD CHANGE IF HE WANTS IT ELSEWHERE. Flagged in the report
                  with the measurements.

                  ── ⚠ THE STYLING MIRRORS `/optimize`'s HERO CTA, MEASURED ────────

                  `.hero-cta` computed at 1440 on 2026-08-25: Montserrat / 17px / 600 /
                  `#d72cd6` / white / radius 12px / padding 16px 30px / line-height
                  25.5px. ⚠ MIRRORED IN TAILWIND, NOT REUSED — `home.css` is entirely
                  `.pm-home`-scoped INCLUDING ITS VARIABLES and this page is outside
                  that wrapper. That trap has bitten four times in one day.

                  ⚠ THIS BUTTON IS WHAT LETS THE SEARCH BOX GO. `check:app-shell`'s
                  PUBLIC HERO guard requires the hero to offer something clickable and
                  the box was the only thing satisfying it. ⚠ THE GUARD IS NOT
                  WEAKENED — it is run and green.

                  ⚠ THE LABEL'S 4.02:1 ON ITS OWN MAGENTA FILL IS `P1-J4-E020` — a
                  site-wide, pre-existing, brand-token AA failure with nothing to do
                  with any clip. Reported; NOT a stop condition here, per Scott
                  2026-08-25.
                */}
                <a
                  href="/join/provider"
                  className="mt-8 inline-block rounded-[12px] bg-magenta px-[30px] py-4 text-[17px] font-semibold leading-[25.5px] text-white transition-colors hover:bg-magenta-dark"
                >
                  Join Panameer &amp; Create My Profile
                </a>

                {/*
                  ── ⚠⚠ THE BUTTON'S PAYOFF LINE (`P1-J1-E031`) ──────────────────

                  Scott moved this out of the right column. ⚠ VERBATIM, INCLUDING
                  THE FULL STOP — his sentence, unchanged, only relocated.

                  ⚠ IT IS THE STRONGEST CLAIM ON THE PAGE AND IT NOW SITS DIRECTLY
                  UNDER THE CTA, which is the right place for it: the résumé parser
                  is REAL and shipped — `lib/resume/ai-extract.ts`, `ai-provider.ts`,
                  `/api/onboarding/provider/resume-ai`, `/skill-suggestions`,
                  `/import` — and it was measured end to end for `P1-J1-E026`
                  (6 runs, 9.0s to 31.8s). Nothing else in this hero is that solid.

                  ⚠ `mt-4` TIES IT TO THE BUTTON, NOT TO THE COLUMN. It is the same
                  gap the right column already uses between its sub-copy and its
                  bridge line — no new spacing value was invented, and a larger gap
                  would let it float free of the control it explains.

                  ⚠⚠ `HeroTwoUp`'s LEFT-BEFORE-RIGHT DOM ORDER IS LOAD-BEARING AND
                  UNCHANGED. Below 901px the grid collapses to ONE column, so DOM
                  order IS reading order: headline -> button -> this line -> the
                  right column. Reordering with `order` would read the hero to a
                  screen reader in a sequence nobody designed. ⚠ PROVEN AT 390 IN
                  THE BRIEF REPORT, not asserted.
                */}
                <p className="mt-4 text-[17px] leading-[1.6] text-[#e9e6f5] min-[901px]:text-[19px]">
                  Use AI to auto-create your profile.
                </p>
              </>
            }
            right={
              <>
                {/*
                  ── ⚠⚠ APPROVED COPY, NOT A DRAFT (`P1-J1-E031`, 2026-08-25) ────

                  Scott invited a rewrite — *"FOR THIS SECTION FEEL FREE TO SUGGEST
                  BETTER WORDING."* — chat offered one, and he approved it verbatim:
                  *"this is it."* ⚠ THIS IS NOT CC's DRAFT. It ships as written and
                  must not be softened, shortened or re-punctuated. The em dashes are
                  part of the approved string.

                  ⚠ HIS EARLIER VERSION IS SUPERSEDED AND IS RECORDED HERE ONLY SO
                  THE DEAD ONE IS LEGIBLE AND NOBODY REBUILDS IT: *"Start by creating
                  your profile to sell services. Then create service products
                  (previous deploy-ables, a consultation, retainers, mentoring, or
                  application demos) and list them for sale in the Panameer SHOP."*

                  ⚠ WHY IT DIFFERS, RECORDED NOT ARGUED: `Start by… Then…` duplicated
                  `TalentSpine` directly below, which already carries the order; the
                  parenthetical buried `Shop` mid-sentence where the em-dash aside now
                  puts it at the end, as the point; and the opening carries the thesis
                  from `ORIENTATION_2026-08-24.md` §2 — *"On LinkedIn you ARE the
                  product. On Panameer you HAVE products."* ⚠ `deploy-ables` ->
                  `deployables` and `SHOP` -> `Shop` are the standing corrections.

                  ⚠⚠ AND IT SENDS A SELLER TO A SHOP THEY CANNOT BROWSE. `/shop`'s
                  `Start Shopping Now` is DISABLED — no public product listing exists
                  (`walk-fixes` WS6). Two public pages now contradict each other and a
                  seller disproves it in four seconds. ⚠ FILED AND ON THE PRE-LAUNCH
                  LIST. It closes when `/shop` gets a real catalog, NOT by weakening
                  this sentence.

                  ── ⚠ THE PREVIOUS STRING'S NOTES, SUPERSEDED ──────────────────

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
                  Your profile sells your time. Service products sell everything
                  else &mdash; a past deployable, a consultation, a retainer,
                  mentoring, an application demo &mdash; listed for sale in the
                  Panameer Shop.
                </p>

                {/*
                  ── ⚠⚠ THE BRIDGE LINE (`P1-J1-E027`) ────────────────────────

                  Scott, 2026-08-25: *"they all follow the same style.... meaning
                  they are all pink."* ⚠ EXACTLY `/optimize`'s STRING, and its
                  MEASURED treatment: `color:#efa3ee`, `font-weight:600`, 19px —
                  read off `.hero-bridge`'s computed style at 1440, not copied from
                  the stylesheet.

                  ⚠ TAILWIND, MIRRORED — `/hire-talent` IS NOT INSIDE `.pm-home`, so
                  `home.css`'s class and its variables are both unavailable here.
                  Fifth instance of that scoping trap in two days.

                  ⚠ THE STRING IS NOW A LITERAL IN FOUR PLACES (`/optimize`,
                  `/learn`, here, and `/find-work`'s absence). ⚠ A SHARED CONSTANT IS
                  PROBABLY RIGHT AND IS DELIBERATELY NOT CREATED IN THIS BRIEF —
                  reported instead, because a constant introduced mid-walk is a
                  fifth file to review for a copy change nobody asked for.

                  ⚠⚠ IT SITS OVER THE NEW CLIP, so it carries the AA exposure the
                  flat gradient did not have — and pink is the lightest text on the
                  card. MEASURED against 9 sampled frames at three widths before
                  shipping; the numbers are in the report.
                */}
                <p className="mt-4 text-[19px] font-semibold leading-[1.5] text-[#efa3ee]">
                  Check out the steps below to see how it works.
                </p>

                {/*
                  ── ⚠⚠ THE THREE LIVE-COUNT TILES (`P1-J1-E029`) ─────────────────

                  Scott, answering the WS5 fork on 2026-08-25: *"these would all be
                  counts of what is in the DB."* ⚠ THE EARLIER RUN STOPPED HERE on a
                  contradiction between the brief and its launch text; the
                  contradiction was chat's stale paste and the answer is TILES.

                  ⚠ THEY GO IN THE RIGHT COLUMN UNDER THE BRIDGE LINE — the position
                  `/optimize` and `/learn` both use. That is what *"they all follow
                  the same style"* means structurally: every hero's right column is
                  sub-copy -> bridge line -> stat row. This column used to end after
                  the sub-copy, which is why the hero looked half-empty.

                  ⚠ THE CHROME IS `LearnStats`' VALUES, COPIED, NOT THE COMPONENT
                  EXTRACTED. Extracting it would mean re-measuring `/learn`, and a
                  shared component moving pages has bitten four times in two days
                  (`.sd-n`, `E290`, `E303`, the footer). Copying is the cheap,
                  reversible choice here and the brief asked for it explicitly.

                  ⚠⚠ `Providers` IS 85 AND IT IS SEED DATA. `decisions-01.md`
                  2026-08-24 names those rows as seed and disposable and says NO SEED
                  COUNT MAY SHIP AS TRACTION. ⚠ SCOTT WAS SHOWN `522 / 85 / 1` IN
                  WRITING AND ASKED FOR THEM ANYWAY — a decision, not an oversight.
                  It is on the pre-launch list. DO NOT RE-ARGUE IT HERE.

                  ⚠ PLURALS COME OFF THE NUMBER, in `talent-stats.ts` — today
                  `Service Product` is SINGULAR because there is exactly one, and
                  that is the live case rather than a theoretical one.
                */}
                <dl className="mt-[26px] grid grid-cols-3 gap-[14px]">
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
              </>
            }
          />

          {/*
            ── ⚠⚠ THE SEARCH BOX IS GONE (`P1-J1-E025`) ─────────────────

            A ~45-line comment used to sit here arguing for its retention, and it is
            REMOVED WITH THE CODE rather than left behind. Its argument was sound and
            explicitly conditional: Scott's `E014` said *"REMOVE the search box (unless
            it is a teaser to see sample profiles)"*, `/explore` signed-out really does
            return 22 experts, so the box WAS the teaser his condition asked for — and
            the comment closed by saying it goes the moment he names a CTA. ⚠ HE HAS
            NAMED ONE (above). The condition is spent.

            ⚠ A STALE ARGUMENT FOR A DELETED ELEMENT IS HOW THINGS GET RESTORED BY
            MISTAKE. That is the whole reason it is not preserved here.

            ⚠ `/explore` IS UNTOUCHED and still works signed out; only this doorway to
            it is closed. The buyer placeholder and search-CTA strings stay in
            `lib/brand.ts`, still rendered by `MarketingHero` on `/enterprise` and
            `/why-panameer`.
          */}

          {/*
            ── ⚠⚠ THE FOUR-VERB LOCKUP IS GONE, CLOSING `P1-J1-E019` ────────

            The constant is `Learn. Connect. Create. Settle.` and this page's spine
            (`P1-J1-E012`) is `Join · Learn · Connect · Create · Sell` — four verbs
            against five, three shared, and `Settle` against `Sell` in the last slot.
            Two four/five-beat stories on one page, and it was Scott's third walk item.
            ⚠ THIS WAS THE OPEN HALF OF `E019`; `/find-work` lost its copy in
            `718abc3`. Both halves are now closed.

            ⚠ THE CONSTANT STAYS IN `src/lib/brand.ts` AND ITS OTHER CALL SITES ARE
            UNTOUCHED — enumerated in the report. Only this page's render goes.
          */}
        </div>
      </section>
    </HeroBox>
  );
}
