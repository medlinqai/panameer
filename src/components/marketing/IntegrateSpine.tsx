import type { ReactNode } from "react";
import { StepDisclosures } from "@/components/marketing/StepDisclosures";
import { IntegrationModelDiagram } from "@/components/marketing/diagrams/IntegrationModelDiagram";
import { EHubbingDiagram } from "@/components/marketing/diagrams/EHubbingDiagram";
import {
  INTEGRATE_STEPS,
  INTEGRATE_SPINE_HEADING,
} from "@/lib/integrate-steps";

/**
 * `/integrate`'s FIVE-STEP SPINE (`P1-J0-E328`) — the SIXTH caller of
 * `StepDisclosures`, after `/optimize`, `/learn`, `/hire-talent`, `/find-work` and
 * `/shop`.
 *
 * ⚠ NO SIXTH ACCORDION. Native `<details>`/`<summary>`, no client boundary, and
 * `E097` holds — no interactive descendant of a `<summary>`. A hand-rolled
 * accordion is what `E242`/`E264`/`E281` all exist to prevent: one behaviour, one
 * implementation, six callers. ⚠ `/integrate` STAYS `○`.
 *
 * ── ⚠⚠ TWO PANEL GRAPHICS, ON STEPS 2 AND 3 ONLY (`P1-J0-E335`) ────────────
 *
 * `GRAPHICS` below maps them: step 2 is `IntegrationModelDiagram`, step 3 is
 * `EHubbingDiagram`. ⚠ STEPS 1, 4 AND 5 RENDER NO GRAPHIC and an absent key is the
 * correct, deliberate value.
 *
 * ⚠⚠ STEP 1 HAS NONE BY DECISION, NOT BY OMISSION. Scott, 2026-08-27, choosing
 * OPTION 3 of three: `ErpIntegration` STAYS IN THE PAGE BODY
 * (`app/integrate/page.tsx`), where its two `.erpx-doors` LIGHTBOXES ARE REACHABLE
 * ON PAGE LOAD. Moving it into step 1's panel put them behind a closed `<details>`
 * and turned 17 `check:ui` assertions red — §2-§8 on both cards, plus §11, §12 (the
 * `E097` nested-interactive regression) and §13. That was a real product regression,
 * not a test problem: the page's only two lightboxes became unreachable without a
 * click, and the hero CTA landed on a collapsed accordion.
 * ⚠ THE MOVE WAS REVERTED BEFORE IT EVER MERGED. Do not re-attempt it.
 *
 * ⚠⚠ SUPERSEDED 2026-08-26 — the dead claim, QUOTED not deleted, because it was
 * right on its own facts and only ONE of them changed:
 *   *"NO PANEL GRAPHICS, ON ANY STEP. ZERO of five steps are built, so a drawn
 *    punchout flow would be a picture of software that does not exist — the
 *    honesty test from `P1-J4-E015`, applied to a page where it disqualifies
 *    everything.
 *    AND THIS PAGE ALREADY SHOWS THE TWO THINGS A PANEL GRAPHIC WOULD HAVE DRAWN:
 *    `ErpPunchout` renders the punchout flow diagram and `ErpIntegration` renders
 *    the connection-method cards. Both sit BELOW this spine. Drawing either again
 *    inside a panel would put the same picture on one page twice — `E162`/`E242`'s
 *    shape."*
 *
 * ⚠ WHAT CHANGED, AND WHAT DID NOT:
 *   · THE DUPLICATION ARGUMENT IS STILL CORRECT AND IT IS WHY STEP 1 IS EMPTY.
 *     `ErpIntegration` renders in the page body and NOWHERE ELSE on this page. One
 *     picture, one place — which is what the dead comment was protecting.
 *   · `ErpPunchout` IS NO LONGER ON THIS PAGE AT ALL — `P1-J0-E333` moved it to `/`
 *     on Scott's instruction, so the second half of that argument has no subject.
 *   · THE HONESTY POINT STANDS AND IS NOT DISMISSED. Steps 2 and 3 draw software
 *     that does not exist, and A DIAGRAM IS A STRONGER CLAIM THAN A STEP LABEL. It
 *     ships because `decisions-01.md` records `0 of 5 built, knowingly` and
 *     outstanding parts gate PROMOTION, not the build — 2 of 12 objects on the
 *     Integration Model exist and 0 of 11 on the eHubbing model. Every one is listed
 *     in that diagram's own header and on the pre-launch list.
 *
 * ⚠ THIS PAGE IS NOT INSIDE `.pm-home` AT THIS POINT — the wrapper is around
 * `LogoRibbon` and `ErpIntegration` ONLY — so the eyebrow and headline are Tailwind
 * mirroring `/optimize`'s computed values. Eighth instance of that scoping trap;
 * measured, not assumed.
 */
/**
 * ⚠ THE GRAPHIC PER STEP, AS A REGISTRY — `TalentSpine.tsx:74`'s pattern exactly,
 * which is `spine-steps.ts`'s shape, so adding or removing one is an edit here and
 * nothing else.
 *
 * ⚠⚠ A MISSING KEY IS A VALID, DELIBERATE VALUE. Steps 4 and 5 have none and
 * render nothing. ⚠ DO NOT INVENT ONE FOR THEM.
 * ⚠ THIS IS NOT `/optimize`'s `StepGraphic` REGISTRY — that is `SpineSteps`' string
 * -keyed mechanism and a different thing. One page, one pattern.
 */
const GRAPHICS: Record<number, ReactNode> = {
  /*
    ⚠⚠ 1 — NO GRAPHIC, AND THAT IS SCOTT'S DECISION, 2026-08-27: OPTION 3.

    `ErpIntegration` STAYS IN THE PAGE BODY at `app/integrate/page.tsx`. It was
    briefly moved into this panel and the move was reverted before it ever merged.
    ⚠ WHY: that component's two `.erpx-doors` lightbox doorways — `Fulfillment` and
    `Settlement` — are `CARDS` rows 5-6 in `e2e/marketing-home.spec.ts`, and §2-§8,
    §11, §12 (the E097 nested-interactive regression) and §13 all reach them by
    CLICKING THEM ON PAGE LOAD. Inside a `<details>` that is closed by default they
    are unreachable, and 17 assertions went red.
    ⚠⚠ IT WAS NOT A TEST PROBLEM. The lightboxes genuinely became unreachable
    without opening step 1, and the hero CTA landed on a collapsed accordion.
    ⚠ SO: DO NOT PUT A GRAPHIC HERE. If step 1 ever needs one it must be something
    other than `ErpIntegration`, or the lightboxes have to move out of it first.
  */
  2: <IntegrationModelDiagram />,
  3: <EHubbingDiagram />,
  /* 4 — none. "We Transmit to Any Supplier" has no diagram; Scott named three,
     and step 1's became a page-body section instead. */
  /* 5 — none. Same. */
};

export function IntegrateSpine() {
  return (
    <>
      <section className="border-t border-line bg-white pb-[80px] pt-14 min-[900px]:pt-[72px]">
        <div className="mx-auto max-w-[1200px] px-8">
          <p className="font-body text-[19px] font-bold uppercase leading-[28.5px] tracking-[2.66px] text-magenta-ink">
            {INTEGRATE_SPINE_HEADING}
          </p>
          {/*
            ── ⚠⚠ THE DISPLAY HEADLINE — ⚠ DRAFT, CC's WORDS, NOT SCOTT'S ────────

            Reported verbatim and flagged so he can overwrite it in one pass. It
            carries his own `<h1>` forward — *"Punchout for Talent & Services, Not
            Just Parts"* — and sets up steps 3-4, which are the half of this page a
            reader does not expect.

            ⚠ `/optimize`'s TREATMENT, MIRRORED IN TAILWIND: 34px / 700 / #181E3C /
            ls -0.5px / lh 38.76px / max-w 1040px / Comfortaa. The class is
            `.pm-home`-scoped and unreachable here.

            ⚠⚠ `text-wrap`, TAILWIND'S OWN UTILITY, NOT `[text-wrap:normal]`.
            `.marketing-surface` balances every `h1`-`h4` (`P1-J3-E032`), and
            `normal` is NOT a valid `text-wrap` value — the browser discards it and
            the computed value stays `balance`. This was measured, not assumed.

            ⚠ `pb-[80px]` IS `/optimize`'s MEASURED 81px tagline-to-row-1 gap
            (`P1-J0-E319`), so the sixth spine does not repeat `/learn`'s divergence.
          */}
          {/*
            ── ⚠⚠ SCOTT'S STRING, VERBATIM, 2026-08-26 (`P1-J0-E331`) ────────────

            He replaced the previous line because it RESTATED THE HERO rather than
            adding to it. This one names the four mechanics instead.

            ⚠ SUPERSEDED 2026-08-26, quoted not deleted:
              *"Punchout was built for parts. Panameer makes it work for people,
               services, and everything you buy."*

            ⚠ HIS STRAIGHT DOUBLE QUOTES AROUND `Punch` SHIP, rendered `&ldquo;`/
            `&rdquo;` to match every other quoted term on the public pages
            (`/work`, `/talent`, `/learn`).
            ⚠⚠ `cXML` APPEARS TWICE ON PURPOSE — both clauses name it and it is his
            sentence. DO NOT COLLAPSE THEM into one mention.
            ⚠ `cXML` AND `EFT` STAY UPPERCASE AS TYPED.
            ⚠ THE CLASSES ARE UNTOUCHED — `text-wrap` (Tailwind's utility, never
            `[text-wrap:normal]`, which is invalid CSS the browser discards) and the
            `pb-[80px]` measured gap on the wrapper (`P1-J0-E319`) both stay.

            ⚠⚠ FOUR MECHANICS NAMED, NONE BUILT — and that is KNOWINGLY so.
            `IntegrateHero.tsx:108` records it: no `Integration` model, no punchout
            endpoint, no cXML, no EFT path. `decisions-01.md` records `0 of 5 built,
            knowingly`. ⚠ OUTSTANDING PARTS GATE PROMOTION, NOT THE BUILD — this is
            on the pre-launch list, and HIS COPY IS NOT SOFTENED TO MATCH THE BUILD.
          */}
          <h2 className="mt-6 max-w-[1040px] text-wrap font-display text-[28px] font-bold leading-[1.14] tracking-[-0.5px] text-ink min-[900px]:text-[34px] min-[900px]:leading-[38.76px]">
            &ldquo;Punch&rdquo; into our commerce site, return your cart using
            cXML, send orders and receive invoices using cXML, and send payments
            using EFT.
          </h2>
        </div>
      </section>
      <StepDisclosures
        steps={INTEGRATE_STEPS.map((step) => ({
          n: step.n,
          summary: step.summary,
          panel: (
            <>
              {/* ⚠ DERIVED, NEVER TYPED — `Step N - <label>` from `INTEGRATE_STEPS`. */}
              <p className="font-body text-[19px] font-bold uppercase leading-[28.5px] tracking-[2.66px] text-magenta-ink">
                {`Step ${step.n} - ${step.summary}`}
              </p>
              {/* ⚠ `.stepd-h2` — the SHARED rule, so the six spines cannot drift
                  apart on panel type. */}
              <h2 className="stepd-h2">{step.description}</h2>
              {/* ⚠ STEPS 1-3 ONLY. An absent key renders nothing — see `GRAPHICS`. */}
              {GRAPHICS[step.n]}
            </>
          ),
        }))}
      />
    </>
  );
}
