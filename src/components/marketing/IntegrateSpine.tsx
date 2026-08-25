import { StepDisclosures } from "@/components/marketing/StepDisclosures";
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
 * ── ⚠⚠ NO PANEL GRAPHICS, ON ANY STEP ─────────────────────────────────────
 *
 * ZERO of five steps are built, so a drawn punchout flow would be a picture of
 * software that does not exist — the honesty test from `P1-J4-E015`, applied to a
 * page where it disqualifies everything.
 *
 * ⚠ AND THIS PAGE ALREADY SHOWS THE TWO THINGS A PANEL GRAPHIC WOULD HAVE DRAWN:
 * `ErpPunchout` renders the punchout flow diagram and `ErpIntegration` renders the
 * connection-method cards. Both sit BELOW this spine. Drawing either again inside a
 * panel would put the same picture on one page twice — `E162`/`E242`'s shape.
 * ⚠ WHAT EACH ACTUALLY SHOWS IS IN THE BRIEF REPORT, with the overlap named.
 *
 * ⚠ THIS PAGE IS NOT INSIDE `.pm-home` AT THIS POINT — the wrapper is around
 * `LogoRibbon` and `ErpIntegration` ONLY — so the eyebrow and headline are Tailwind
 * mirroring `/optimize`'s computed values. Eighth instance of that scoping trap;
 * measured, not assumed.
 */
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
          <h2 className="mt-6 max-w-[1040px] text-wrap font-display text-[28px] font-bold leading-[1.14] tracking-[-0.5px] text-ink min-[900px]:text-[34px] min-[900px]:leading-[38.76px]">
            Punchout was built for parts. Panameer makes it work for people,
            services, and everything you buy.
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
              {/* ⚠ NO GRAPHIC, ON PURPOSE, ON ALL FIVE. See the header. */}
            </>
          ),
        }))}
      />
    </>
  );
}
