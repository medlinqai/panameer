import { HeroBox } from "@/components/marketing/HeroBox";
import { HeroTwoUp } from "@/components/marketing/HeroTwoUp";
import { HeroVideoBackdrop } from "@/components/media/HeroVideoBackdrop";
import { talentHeroStats } from "@/lib/talent-stats";

/**
 * `/buy-services`'s HERO — THE TWO-COLUMN TREATMENT (`P1-J2-E001`).
 *
 * ⚠⚠ IT REPLACES A HERO WHOSE KICKER AND `<h1>` LITERALLY READ `PLACEHOLDER —
 * Shop` AND `PLACEHOLDER — headline about packaged services goes here.` on a
 * top-level nav destination. That is what came off.
 *
 * Scott, 2026-08-24: *"By mistake i confused WORK with SHOP in the main name
 * (Deploy faster...). So we can use that tagline on the SHOP page Hero."*
 *
 * ⚠ SO THE `<h1>` IS NOT NEW COPY — IT MOVED. `Deploy Faster. With Less Risk.`
 * was `/find-work`'s headline (`P1-J4-E003`) until `P1-J4-E017` replaced it there
 * with `Save Money. Go Direct.` ⚠ THE TWO BRIEFS MUST RUN IN ORDER OR THE SAME
 * HEADLINE SITS ON TWO PAGES; verified before this shipped that `/find-work` no
 * longer renders it, and verified after that exactly one page does.
 *
 * ⚠ ITS OWN FILE, NOT AN EDIT TO `MarketingHero`, for the reason `HireTalentHero`
 * and `FindWorkHero` both record: that component still serves `/enterprise` and
 * `/why-panameer`, and every change here is `/buy-services`-only. ⚠ FOURTH PAGE
 * ON `HeroTwoUp` (`5d50135`).
 *
 * ⚠ NO PILL. `P1-J4-E009` and `P1-J1-E013` removed the other two; no public hero
 * carries one, and the `PLACEHOLDER — Shop` kicker was the last. ⚠
 * `BUY_SERVICES_HERO` IS LEFT ON DISK, NOW UNIMPORTED — the `E164` resolution,
 * and the same treatment `HIRE_HERO.kicker` got.
 * ⚠ NO STAT ROW AND NO BRIDGE LINE. Scott has given neither, and nothing on this
 * page is countable: ONE published `Package`, and it is ours.
 */
export async function ShopHero() {
  const stats = await talentHeroStats();
  return (
    /*
      ⚠ THE SAME `HeroBox` CARD AND GRADIENT `MarketingHero` GAVE THIS PAGE,
      transcribed so the container change is not also a visual change. The
      surface is byte-identical to the string that hero renders; `HeroTwoUp`
      supplies the columns and nothing about the skin is new.
    */
    <HeroBox cardClassName="isolate bg-[radial-gradient(1100px_500px_at_82%_-10%,rgba(215,44,214,0.42),transparent_60%),linear-gradient(150deg,#0d1230_0%,#191a44_55%,#3a1c53_100%)] text-white">
      <section className="relative px-6 pb-[48px] pt-[44px] min-[901px]:pb-[72px] min-[901px]:pt-[64px]">
        {/*
          ── ⚠⚠ THE HERO CLIP (`P1-J2-E009`) ─────────────────────────────────

          `get-paid-hero.mp4`, 0.83MB — Scott's revised mapping 2026-08-25: the page
          whose spine ENDS IN A PAYMENT gets the get-paid footage.

          ⚠ THE `-hero` CUT, NEVER `get-paid.mp4` (3.07MB). Faststart verified
          (`moov` before `mdat`), ~4.5s to download whole on fast 3G. ⚠ IT IS THE
          HEAVIEST OF THE THREE CLIPS IN THIS BRIEF and the only one worth watching
          in the throttled numbers.

          ⚠ THE CARD'S GRADIENT STAYS AND IS NOT DECORATION — it paints before the
          clip arrives, it is what a `prefers-reduced-motion` visitor sees, and it is
          what keeps the white `<h1>` legible. `isolate` keeps the video and scrim
          stacking inside the card; `overflow-hidden` still comes from `HeroBox`,
          which is what makes the clip respect the radius.

          ⚠ `HeroVideoBackdrop` IS COMPOSED, NEVER EDITED.

          ⚠ THIS PAGE IS NO LONGER `PLACEHOLDER` — `1d790be` gave it a real hero
          (`Deploy Faster. With Less Risk.`, Scott's sub-copy, a `Start Shopping Now`
          control) and a real five-step spine. The clip lands behind finished copy
          here, unlike `/enterprise`.
        */}
        <HeroVideoBackdrop
          src="/get-paid-hero.mp4"
          poster="/posters/settle.svg"
          videoClassName="absolute inset-0 h-full w-full object-cover opacity-40"
          scrimClassName="absolute inset-0 bg-[linear-gradient(150deg,rgba(13,18,48,0.86)_0%,rgba(25,26,68,0.72)_55%,rgba(58,28,83,0.62)_100%)]"
        />
        <div className="relative z-[2] mx-auto max-w-[1120px]">
          <HeroTwoUp
            rowClassName="grid grid-cols-1 items-center gap-10 min-[901px]:grid-cols-2 min-[901px]:gap-14"
            left={
              <>
                {/*
                  ⚠ VERBATIM, AND IT IS THE STRING THAT LEFT `/find-work` — both
                  terminal periods are part of it. Scott accepted chat's edit of his
                  own `Deploy Faster and/or with Less Risk` when it was that page's
                  headline; `and/or` is a contract construction, not a headline.
                */}
                <h1 className="font-display text-[34px] font-bold leading-[1.08] tracking-[-0.8px] min-[901px]:text-[46px] min-[901px]:tracking-[-1px]">
                  Deploy Faster. With Less Risk.
                </h1>

                {/*
                  ── ⚠⚠ THE BUTTON SHIPS. IT HAS NOWHERE TO GO. (`P1-J2-E002`) ──

                  Every candidate destination was checked live, signed out, rather
                  than assumed:

                    · `(app)/packages` (Search Packages)  ComingSoon **and** 307 -> /login
                    · `(app)/services/offers`             ComingSoon **and** 307 -> /login
                    · `(app)/providers/[id]`              307 -> /login — and it is the
                      ONLY page in the app that renders a published `Package` at all
                      (`listPublishedPackages`, one caller)
                    · `/explore?mode=hire`                200, but it lists PEOPLE;
                      the one published product does not appear on it
                    · this page's own `ErpPackages`       agent CATEGORIES, no price,
                      no provider, nothing purchasable — its own header says so

                  ⚠ SO THERE IS NO PUBLIC SURFACE ANYWHERE IN THE APP THAT LISTS
                  SERVICE PRODUCTS, AND THE HREF IS THE ONE THING THIS WORK STREAM
                  STOPPED ON. `P1-J0-E316` is the precedent and it is explicit: a
                  primary CTA landing on a `ComingSoon` — or worse, on a login wall —
                  is WORSE than no CTA, and Scott has been burned by it once already
                  on `/learn`.

                  ⚠ SHIPPED AS A DISABLED `<button>`, WHICH IS A DELIBERATE CHOICE
                  AND A REPORTED ONE. An `<a>` with no `href` is not a control at
                  all — not focusable, invisible to `check:app-shell`'s PUBLIC HERO
                  guard, which requires a hero to offer something clickable. A live
                  link to any of the five above would be the false door. A button
                  that is visibly not yet live is the only option that is neither a
                  lie nor a removal. ⚠ THE DESTINATION IS SCOTT'S DECISION; the
                  moment a public catalog exists this becomes a `<Link>`.

                  ⚠ NO CAPTION UNDER IT EXPLAINING WHY. That would be CC inventing
                  copy for a hero, which is exactly what the rest of this file
                  refuses to do.
                */}
                {/*
                  ── ⚠⚠ WS6 — IT READS AS DELIBERATE NOW, NOT BROKEN ───────────

                  Scott: *"Button seems to be behind the color shading? Something
                  is off."* He was right, and the cause was the previous state: a
                  FILLED MAGENTA PRIMARY at `opacity-60`. A dimmed primary reads as
                  a rendering fault, which is worse than either a live button or an
                  honest one.

                  ⚠ NO REAL DESTINATION EXISTS AND I CHECKED RATHER THAN ASSUMED.
                  `/explore` takes ONE parameter, `mode`, and `page.tsx:54` reads
                  `sp.mode !== "work"` — so it serves EXPERTS or WORK REQUESTS and
                  has no product mode at all. `(app)/packages` and
                  `(app)/services/offers` are `ComingSoon` AND auth-gated;
                  `(app)/providers/[id]` is the only page that renders a published
                  `Package` and it 307s signed out. ⚠ NO ROUTE WAS INVENTED.

                  ⚠ SO IT IS NOW AN OUTLINED, NON-INTERACTIVE STATE WITH ITS REASON
                  ON IT: a bordered control at full opacity — no magenta fill, so it
                  cannot be mistaken for a broken primary — carrying the word
                  `Soon`. `aria-disabled` rather than `disabled` so it stays in the
                  reading order for a screen reader, which is the honest thing for a
                  label that explains itself.
                */}
                <button
                  type="button"
                  disabled
                  className="mt-8 inline-flex cursor-default items-center gap-2.5 rounded-[12px] border border-white/35 px-7 py-4 font-display text-[16px] font-bold text-white"
                >
                  Start Shopping Now
                  <span className="rounded-full bg-white/15 px-2 py-[3px] text-[11px] font-bold uppercase tracking-[0.08em] text-[#e9e6f5]">
                    Soon
                  </span>
                </button>
              </>
            }
            right={
              <>
                {/*
                  ── ⚠⚠ VERBATIM SCOTT, WITH TWO RECORDED CORRECTIONS ────────────

                    · `guarantee`, NOT his typed `garauntee` — his standing spelling
                      instruction, recorded here so it does not read as a rewrite.
                    · HIS DOUBLE SPACE inside the first sentence is normalised to
                      one. JSX collapses runs of whitespace anyway; it is written as
                      one space so the source and the render agree.

                  ⚠⚠ `guarantee delivery at a price` IS A LEGAL COMMITMENT, NOT AN
                  ADJECTIVE, AND IT IS COUNSEL-GATED. Nothing in the schema or the
                  code guarantees delivery: there is no `WorkOrder`, no SLA field, no
                  remedy, no `Offer`, no `Invoice`. It ships as typed alongside the
                  AIP claim and the Oracle mark, and it is reported as its own line
                  rather than folded into the copy notes.

                  ⚠ IT ALSO READS AS A FRAGMENT — two clauses joined by a comma with
                  no subject: *"From mentoring… , guarantee delivery at a price."*
                  `guaranteed delivery at a price` is the likely intent. ⚠ NOT
                  SILENTLY FIXED; it is his sentence and the change would alter what
                  is being promised, not just the grammar.

                  ── ⚠ THE TWO CLAIMS CHAT FLAGGED, AND WHY THEY SHIP ──────────────

                  `ever-increasing list` and `created by our experts` were flagged as
                  unbacked. ⚠ SCOTT CORRECTED THAT 2026-08-24: *"every provider that
                  is validated can post service products."* THE MECHANISM IS REAL AND
                  OPEN — 13 of 85 `ProviderProfile` rows are `VALIDATED` — and the
                  shelf is simply new: THREE `Package` rows exist, ONE is `PUBLISHED`
                  (*"Install DocuSign for Oracle Cloud"*, $40,000), and it is owned by
                  PANAMEER ADMIN rather than by an expert. Live read 2026-08-24.

                  ⚠ AND HIS OWN RULE SETTLES IT: *"the dangerous ones are the testable
                  ones."* Nobody can click `created by our experts` and disprove it,
                  because there is no public catalog to check it against — which is
                  also, separately, why the button above has no destination.

                  ⚠ `mentoring, demos, integrations, AI agents` NAMES FOUR CATEGORIES
                  AND ONLY TWO EXIST ANYWHERE. `solution-types.ts` derives SIX labels
                  from three stored kinds — AI Agents · Consultation · Monthly
                  Retainer · Packaged Deployment · Mentoring · Support. `mentoring`
                  and `AI agents` are two of the six; `demos` and `integrations` are
                  in neither the enum nor the labels. ⚠ NEITHER LIST CHANGED —
                  reported so Scott can reconcile them in one message.

                  ⚠⚠ AND NOTHING HERE IMPLIES THESE PRODUCTS FEED THE OPTIMIZATION
                  DASHBOARD. `decisions-01.md` 2026-08-24: publishing a product is NOT
                  the same as being dashboard-eligible, there is a CURATION GATE, and
                  the field that would express it does not exist — the dashboard ships
                  eight hardcoded strings (`lib/assessment/solutions.ts:47`).
                */}
                <p className="text-[17px] leading-[1.6] text-[#e9e6f5] min-[901px]:text-[19px]">
                  Search the ever-increasing list of pre-defined service
                  products created by our experts. From mentoring, to demos, to
                  integrations, to AI agents, guarantee delivery at a price.
                </p>
                {/*
                  ── ⚠ THE BRIDGE LINE (`WS4`) ────────────────────────────────
                  `/optimize`'s exact string in its MEASURED treatment — #efa3ee,
                  weight 600, 19px, read off `.hero-bridge`'s computed style.
                  ⚠ TAILWIND, MIRRORED — this page is outside `.pm-home`.
                  ⚠ IT SITS OVER THIS PAGE'S OWN CLIP, so it was measured over that
                  clip and the WS2 ladder applied per page. Ratios in the report.
                */}
                <p className="mt-4 text-[19px] font-semibold leading-[1.5] text-[#efa3ee]">
                  Check out the steps below to see how it works.
                </p>

                {/*
                  ── ⚠⚠ THE THREE LIVE-COUNT TILES (`WS3`) ────────────────────
                  Scott, twice: *"where are the counter cards here? I specifically
                  called out what i wanted counted, still nothing."* Same three
                  tiles as `/talent`, from the same `talentHeroStats()` build-time
                  read, so the three pages cannot disagree.
                  ⚠ `Providers` IS 85 AND IT IS SEED. Scott decided it ships with
                  the number in front of him; it is on the pre-launch list. Do not
                  re-argue it here.
                  ⚠ CHROME COPIED FROM `LearnStats`, not extracted.
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
        </div>
      </section>
    </HeroBox>
  );
}
