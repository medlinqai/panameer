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
      <section className="border-t border-line bg-white pt-14 min-[900px]:pt-[72px]">
        <div className="mx-auto max-w-[1200px] px-8">
          <p className="font-body text-[19px] font-bold uppercase leading-[28.5px] tracking-[2.66px] text-[#d72cd6]">
            {TALENT_SPINE_HEADING}
          </p>
          {/*
            ⚠ NO TAGLINE UNDER THE EYEBROW. `/optimize` and `/learn` both promote a
            sentence into a display headline here; Scott has not written one for
            Talent. ⚠ DRAFTING ONE WOULD PUT CHAT'S WORDS IN THE LARGEST TEXT ON
            THE PAGE. Reported and left out.
          */}
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
              <p className="font-body text-[19px] font-bold uppercase leading-[28.5px] tracking-[2.66px] text-[#d72cd6]">
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
