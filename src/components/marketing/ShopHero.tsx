import Link from "next/link";
import { HeroBox } from "@/components/marketing/HeroBox";
import {
  SERVICE_PRODUCTS_EXPLAINED_LABEL,
  SHOP_CTA_LABEL,
} from "@/lib/shop-steps";
import {
  HERO_BUTTON,
  HERO_BUTTON_OUTLINE,
  HERO_CARD,
  HERO_SCRIM,
  HERO_BRIDGE_TEXT,
  HERO_BRIDGE_CLASS,
  HERO_DESC_CLASS,
} from "@/components/marketing/hero-treatment";
import { HeroTwoUp } from "@/components/marketing/HeroTwoUp";
import { HeroVideoBackdrop } from "@/components/media/HeroVideoBackdrop";
import { shopHeroStats } from "@/lib/shop-stats";

export async function ShopHero() {
  const stats = await shopHeroStats();
  return (
    <HeroBox cardClassName={HERO_CARD}>
      <section className="relative px-6 pb-[48px] pt-[44px] min-[901px]:pb-[72px] min-[901px]:pt-[64px]">
        {}
        <HeroVideoBackdrop
          src="/get-paid-hero.mp4"
          poster="/posters/settle.svg"
          videoClassName="absolute inset-0 h-full w-full object-cover opacity-40"
          scrimClassName={HERO_SCRIM}
        />
        <div className="relative z-[2] mx-auto max-w-[1120px]">
          <HeroTwoUp
            rowClassName="grid grid-cols-1 items-center gap-10 min-[901px]:grid-cols-2 min-[901px]:gap-14"
            left={
              <>
                {}
                <h1 className="font-display text-[34px] font-bold leading-[1.08] tracking-[-0.8px] min-[901px]:text-[46px] min-[901px]:tracking-[-1px]">
                  Deploy Faster. With Less Risk.
                </h1>

                {}
                {}
                {}
                <button
                  type="button"
                  aria-disabled="true"
                  className={`${HERO_BUTTON} inline-flex cursor-default items-center gap-2.5 hover:bg-magenta`}
                >
                  {SHOP_CTA_LABEL}
                  <span className="rounded-full bg-white/20 px-2 py-[3px] text-[11px] font-bold uppercase tracking-[0.08em] text-white">
                    Soon
                  </span>
                </button>
                {/*
                  ── ⚠⚠ THE SECOND, OUTLINED CONTROL (`P1-J0-E358`) ─────────────

                  Scott: *"create a button like what we did on /optimize, but call it
                  'What are Service Products?'. Lastly, I want to link the button to
                  the page."* Same shape `E352` shipped in `/optimize`'s hero:
                  `HERO_BUTTON_OUTLINE`, stacked BELOW the primary control.

                  ⚠⚠ `HERO_BUTTON_OUTLINE` IS IMPORTED, NEVER RE-TYPED, RE-WRAPPED OR
                  CONCATENATED. It is a single unbroken literal with `prettier-ignore`
                  guards, and the reason is `E338`: `HERO_SCRIM` was implemented as a
                  JS concatenation, Tailwind emitted NO CSS for it, and it shipped
                  DEAD on seven pages for two days behind a warm cache. Tailwind scans
                  source text for whole class tokens and never evaluates JavaScript.

                  ⚠⚠ IT GETS NO `Soon` PILL, DELIBERATELY. `/service-products` EXISTS
                  — the pill above marks a promise that cannot be kept yet, and
                  putting one here would say the opposite of the truth.
                  ⚠ THE PRIMARY CONTROL ABOVE IS UNCHANGED: still a
                  `<button aria-disabled="true">` with NO `href` and its pill.
                  `P1-J2-E010` and `P1-J2-E011` are unaffected by this control.

                  ⚠ THE STACK GAP IS SET HERE, NOT IN THE CONSTANT. Both `HERO_BUTTON`
                  and `HERO_BUTTON_OUTLINE` carry `mt-8`; two stacked is too much air,
                  so this call site overrides the second one down. SIX OTHER HEROES
                  render those constants — editing either to fix spacing here would
                  move all of them. The override is a wrapper `div`, so the constant's
                  class string stays whole and Tailwind still sees it.
                */}
                <div className="-mt-4">
                  <Link href="/pre-defined-services" className={HERO_BUTTON_OUTLINE}>
                    {SERVICE_PRODUCTS_EXPLAINED_LABEL}
                  </Link>
                </div>
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
                {/*
                  ── ⚠⚠ SCOTT-APPROVED DESCRIPTION (`P1-ALL-E031` amendment §3) ──

                  ⚠ HIS WORDS. SHIP AS WRITTEN. Not a draft, not chat's.
                  ⚠⚠ THIS SENTENCE SAYS `Click` AND THE BUTTON IS `aria-disabled` WITH NO
                  `href`. THAT IS A KNOWN MISMATCH AND SCOTT APPROVED THE SENTENCE
                  KNOWING IT — the amendment is explicit that it overrides the body's
                  "its sentence must not say click". ⚠ DO NOT REWORD IT AND DO NOT
                  ENABLE THE BUTTON TO MAKE IT TRUE. Reported for his call on which
                  moves when the `P1-J2` item list ships.
                  ⚠ HIS HYPHEN `-` BEFORE `agents, demos`, not an em dash.

                  ⚠ THE QUOTED LABEL IS INTERPOLATED FROM `SHOP_CTA_LABEL`,
                  NEVER RETYPED (`P1-J4-E024`).
                  ⚠ `HERO_DESC_CLASS` CARRIES THE FOUR-LINE `min-height` — the
                  hero's height is the breadcrumb, so all seven must match. See
                  `hero-treatment.ts`. ⚠ SHORTER COPY LEAVES WHITESPACE ON PURPOSE.
                */}
                <p className={HERO_DESC_CLASS}>
                  Click the &ldquo;{SHOP_CTA_LABEL}&rdquo; button and buy fixed-scope &amp;
                  fixed-price items built by our experts - agents, demos,
                  retainers, and more.
                </p>
                {/*
                  ── ⚠ THE BRIDGE LINE (`WS4`) ────────────────────────────────
                  `/optimize`'s exact string in its MEASURED treatment — #efa3ee,
                  weight 600, 19px, read off `.hero-bridge`'s computed style.
                  ⚠ TAILWIND, MIRRORED — this page is outside `.pm-home`.
                  ⚠ IT SITS OVER THIS PAGE'S OWN CLIP, so it was measured over that
                  clip and the WS2 ladder applied per page. Ratios in the report.
                */}
                <p className={HERO_BRIDGE_CLASS}>{HERO_BRIDGE_TEXT}</p>

                {/*
                  ── ⚠⚠ THE THREE TILES, AND THEY ARE THIS PAGE'S OWN (`P1-J1-E041`) ─

                  Scott, 2026-08-27: `/shop` counts Service Providers · Service
                  Products · Work Orders, from `shopHeroStats()` — a build-time read,
                  so `/shop` stays `○`.

                  ⚠⚠ SUPERSEDED 2026-08-27 — the dead claim, quoted not deleted:
                    *"Same three tiles as `/talent`, from the same `talentHeroStats()`
                     build-time read, so the three pages cannot disagree."*
                  ⚠ THAT WAS THE DEFECT, NOT THE DESIGN. One function fed three pages,
                  so this page printed `Lessons` — which `/shop` does not sell. They
                  CAN now disagree, and they SHOULD.

                  ⚠ `Service Providers` IS 85 AND IT IS SEED. Scott decided it ships
                  with the number in front of him; it is on the pre-launch list. Do
                  not re-argue it here.
                  ⚠ `Work Orders` IS A STUB `0` — no `WorkOrder` model exists — and it
                  comes from the SAME constant `/work` reads, so the two pages cannot
                  print different numbers for the same claim. See
                  `unbuilt-counters.ts` and its tripwire test.
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
