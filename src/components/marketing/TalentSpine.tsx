import type { ReactNode } from "react";
import { StepDisclosures } from "@/components/marketing/StepDisclosures";
import { PathProgressShot } from "@/components/learn/public/PathProgressShot";
import {
  ProviderProfileShot,
  ServiceProductsShot,
} from "@/components/marketing/talent-shots";
import { TALENT_STEPS, TALENT_SPINE_HEADING } from "@/lib/talent-steps";

/**
 * `/hire-talent`'s FIVE-STEP SPINE (`P1-J1-E012`).
 *
 * ⚠ THE SAME `StepDisclosures` SHELL AS `/optimize` AND `/learn` (`5d50135`).
 * Native `<details>`, no client boundary, `E097` holds. A third hand-rolled
 * accordion is what `E242`/`E264`/`E281` all exist to prevent — one behaviour,
 * one implementation, three callers.
 *
 * ── ⚠⚠ THE PANELS ARE FILLED NOW, AND EVERY SENTENCE IS CC's DRAFT ──────────
 *
 * Scott gave the five LABELS only. `P1-J1-E016` asked for the descriptions to be
 * DRAFTED, not decided: each is marked `⚠ DRAFT — CC's words, not Scott's` at its
 * site in `lib/talent-steps.ts`, together with the repo fact that backs it or an
 * explicit UNBACKED, and all five were reported verbatim so he can overwrite them
 * in one message.
 *
 * ⚠ ONE SENTENCE PER PANEL, matching `/optimize`'s panel-headline shape. ⚠ NO BODY
 * PARAGRAPH — `/learn`'s five were deleted in `brief_learn_walk3` and must not come
 * back through this door.
 *
 * ── ⚠⚠ TWO PANELS SHIP WITH NO GRAPHIC, AND THAT IS THE POINT ───────────────
 *
 * `spine-steps.ts` records the rule: an empty graphic renders NOTHING, and a drawn
 * stand-in for software that does not exist is worse than a gap.
 *
 * ⚠ STEP 3 (`Connect with Experts`) HAS NO GRAPHIC. A connections screen would be a
 * picture of unbuilt software — there is no `Connection`, `Conversation`, `Message`
 * or `Thread` model, and `/messages` ships a disabled composer. `MentorDmShot` and
 * `CohortRoomShot` exist and BOTH carry their own warnings that no model backs
 * them; reusing one here would import that problem rather than solve it.
 *
 * ⚠ STEP 5 (`Sell Direct to Oracle Licensees`) HAS NO GRAPHIC. A "a buyer bought
 * your product" screen is the same category of lie: `(app)/packages`,
 * `(app)/services/offers`, `(app)/hire` and `(app)/search` are all `ComingSoon` and
 * there is no `Offer` model. ⚠ `/explore` DOES work and returns 22 real experts, so
 * a SEARCH-RESULTS shot would have been honest — but search is how you get FOUND,
 * not the sale, and drawing it under a step called *Sell* would imply the
 * transaction. Left empty and reported.
 *
 * ⚠ DO NOT FILL EITHER GAP WITH A DRAWING. Fill them when the software exists.
 *
 * ── ⚠ TWO OF FIVE STEPS ARE REAL. See `lib/talent-steps.ts` ─────────────────
 *
 * Step 3 (`Connect with Experts`) has NO `Connection` model at all, and step 5
 * (`Sell Direct to Oracle Licensees`) has only the seller half — no buyer can
 * browse or offer, and there is no `Offer` model. ⚠ BOTH ARE FLAGGED FOR THE
 * PRE-LAUNCH LIST. Shipped because outstanding parts gate promotion, not the build.
 *
 * ⚠ THIS PAGE IS NOT INSIDE `.pm-home`, so the heading is Tailwind mirroring
 * `/optimize`'s computed eyebrow values — 19px / 700 / #d72cd6 / ls 2.66px /
 * uppercase / lh 28.5px. Fifth instance of that scoping trap; measured, not
 * assumed.
 */
/**
 * ⚠ THE GRAPHIC PER STEP, AS A REGISTRY — the same shape `spine-steps.ts` uses, so
 * adding or removing one is an edit here and nothing else.
 *
 * ⚠⚠ A MISSING KEY IS A VALID, DELIBERATE VALUE. Steps 3 and 5 have none; the file
 * header says why each is empty and why drawing one would be worse than the gap.
 *
 * The inventory behind the mapping is in `talent-shots.tsx`: step 2 REUSES
 * `PathProgressShot` unchanged; steps 1 and 4 are new provider-side shots because
 * nothing existing depicts a provider profile or a provider's own package list.
 */
const GRAPHICS: Record<number, ReactNode> = {
  1: <ProviderProfileShot />,
  2: <PathProgressShot />,
  /* 3 — none. No `Connection` model exists. */
  4: <ServiceProductsShot />,
  /* 5 — none. No buyer can browse or buy; the `(app)` browse routes are ComingSoon. */
};

export function TalentSpine() {
  return (
    <>
      {/* ⚠ `pb-[80px]` ARRIVES WITH THE HEADLINE (`P1-J0-E319`) — /optimize's
          MEASURED tagline-to-row-1 gap is 81px, and the section previously had no
          bottom padding because it had no tagline to space. Same value /learn and
          /find-work use, so the four spines do not diverge on this gap. */}
      <section className="border-t border-line bg-white pb-[80px] pt-14 min-[900px]:pt-[72px]">
        <div className="mx-auto max-w-[1200px] px-8">
          <p className="font-body text-[19px] font-bold uppercase leading-[28.5px] tracking-[2.66px] text-magenta-ink">
            {TALENT_SPINE_HEADING}
          </p>
          {/*
            ── ⚠⚠ THE DISPLAY HEADLINE (`P1-J1-E026`) — SCOTT'S STRING, VERBATIM ─

            This slot used to carry a comment saying the tagline was deliberately
            left out because he had not written one. ⚠ HE HAS NOW WRITTEN IT AND HE
            ASKED WHERE IT WAS. Not a draft; not CC's words.

            ⚠ `/optimize`'s TREATMENT, MIRRORED IN TAILWIND — 34px / 700 / #181E3C /
            ls -0.5px / lh 38.76px / max-w 1040px / Comfortaa (`.hiw-h2`). ⚠ THE
            `.pm-home` SCOPE AGAIN: this page is outside the wrapper, so `home.css`'s
            class is unreachable. Copied from `/learn`'s own `E304` implementation,
            which solved the identical problem on the identical rule.

            ⚠⚠ IT IS `text-wrap`, NOT THE ARBITRARY `[text-wrap:normal]` THE BRIEF
            PRESCRIBED, AND THE DIFFERENCE IS THAT ONE OF THEM DOES NOTHING.
            Tailwind emits a rule for the arbitrary form and the class lands on the
            element — and the browser then DISCARDS THE DECLARATION, because `normal`
            is not a valid `text-wrap` value. The property takes
            `wrap | nowrap | balance | pretty | stable` only. ⚠ MEASURED: with
            `[text-wrap:normal]` the computed value stayed `balance` at 1440/900/390
            and the wrap did not move an inch.
            ⚠ `text-wrap` IS TAILWIND'S OWN UTILITY AND EMITS `text-wrap:wrap` — the
            property's INITIAL value, i.e. exactly "wrap normally". That is the one
            that works. Computed values are in the report.
            ⚠ THIS IS WHY THE BRIEF SAID TO VERIFY RATHER THAN ASSUME. It asserted
            *"the utility wins and it was already proven"*; the utility it named was
            never valid CSS.

            ⚠⚠ THE UTILITY IS LOAD-BEARING, NOT TIDINESS. `/hire-talent`
            renders inside `.marketing-surface`, and `globals.css`'s `@layer base`
            balances every `h1`-`h4` under it. A new display headline without this
            utility ships with the exact defect `WS7`/`P1-J3-E032` exists to remove —
            Scott, 2026-08-17: *"we are wasting space by wrapping text that could go
            across the screen."*

            ── ⚠ `resume`, NOT `résumé` — HIS SPELLING ────────────────────────────

            It matches the `<h1>` above it (`Sell More than Just Your Resume`). ⚠ THE
            REST OF THE CODEBASE USES THE ACCENTED FORM, so this PAGE is now
            internally consistent and the SITE is not. Reported; nothing else changed.

            ── ⚠⚠ `AIP` IS NOT AN ASPIRATIONAL CLAIM AND THE OLD FRAMING IS WRONG ─

            Scott, 2026-08-25, on the record: *"the AIP is the AI we are deploying and
            are going to deploy on Panameer."* ⚠ IT NAMES DEPLOYED SOFTWARE: the
            résumé parser (`lib/resume/ai-extract.ts`, `ai-provider.ts`,
            `/api/onboarding/provider/resume-ai`), the JD paste door
            (`/api/work-requests/import`), and the assessment engine. ⚠ TWO DOCUMENTS
            CURRENTLY LIST THE AIP AMONG THE UNKEEPABLE PROMISES — that is being
            corrected. ⚠ DO NOT HEDGE THIS SENTENCE OR ADD A "COMING SOON".

            ⚠ HE WROTE `our AI Platform (AIP)`, NOT the locked `Panameer's AI
            Platform (AIP)` (`P1-J0-E275`). Same expansion, same shape, his voice on
            his page — SHIPPED AS HIS WORD, divergence reported.

            ── ⚠⚠ `in under one minute` WAS MEASURED BEFORE IT SHIPPED ───────────

            It is a stopwatch claim, so it was timed end to end on the real path —
            file read, text extract, live Anthropic parse, shape, per-job skill
            derivation against the real 566-entry catalog vocabulary. SIX RUNS, TWO
            REAL FIXTURE CVs, 2026-08-25:

                p2p-atul.docx    (56KB,  8,473 chars, 7 jobs)   12.3s · 9.0s · 11.3s
                marelise.docx  (1.65MB,  8,914 chars, 8-17 jobs) 18.5s · 31.8s · 23.5s

            ⚠ EVERY RUN UNDER 60s — worst 31.8s, 53% of the budget. SHIPPED.
            ⚠ THE VARIANCE IS ENTIRELY THE MODEL CALL (18.3s -> 31.7s on identical
            input) AND THE HEADROOM IS THINNER THAN IT LOOKS: the route declares
            `maxDuration = 60` and `ai-provider.ts` sets `MODEL_TIMEOUT_MS = 55_000`,
            so a slow call does not render a slow profile — it renders an error.
            ⚠ IF THE MODEL OR THE PROMPT CHANGES, RE-TIME THIS SENTENCE.
          */}
          <h2 className="mt-6 max-w-[1040px] text-wrap font-display text-[28px] font-bold leading-[1.14] tracking-[-0.5px] text-[#181E3C] min-[900px]:text-[34px] min-[900px]:leading-[38.76px]">
            Upload your resume to our AI Platform (AIP) and create your Panameer
            profile in under one minute.
          </h2>
        </div>
      </section>
      <StepDisclosures
        steps={TALENT_STEPS.map((step) => ({
          n: step.n,
          summary: step.summary,
          panel: (
            <>
              {/*
                ⚠ THE EYEBROW IS DERIVED, NEVER TYPED — `Step N - <label>` computed
                from `TALENT_STEPS`, the same source the closed row renders. A
                hand-typed eyebrow fails `check:ui`. Values transcribed from
                `/optimize`: 19px / 700 / #d72cd6 / ls 2.66px / uppercase / lh 28.5px.
              */}
              <p className="font-body text-[19px] font-bold uppercase leading-[28.5px] tracking-[2.66px] text-magenta-ink">
                {`Step ${step.n} - ${step.summary}`}
              </p>
              {/*
                ⚠ `.stepd-h2` — THE SHARED RULE, not a local size. `/optimize` and
                `/learn` draw their panel headlines from the same class in
                `step-disclosures.css`, so the three pages cannot drift apart on
                panel type.
              */}
              <h2 className="stepd-h2">{step.description}</h2>
              {GRAPHICS[step.n]}
            </>
          ),
        }))}
      />
    </>
  );
}
