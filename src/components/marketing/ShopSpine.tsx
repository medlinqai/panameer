import { StepDisclosures } from "@/components/marketing/StepDisclosures";
import { SHOP_STEPS, SHOP_SPINE_HEADING } from "@/lib/shop-steps";

/**
 * `/buy-services`'s FIVE-STEP SPINE (`P1-J2-E003`).
 *
 * ⚠ THE SAME `StepDisclosures` SHELL AS `/optimize`, `/learn`, `/hire-talent` AND
 * `/find-work` (`5d50135`). Native `<details>`, no client boundary, `E097` holds.
 * A fifth hand-rolled accordion is what `E242`/`E264`/`E281` exist to prevent —
 * one behaviour, one implementation, five callers.
 *
 * ── ⚠⚠ NO GRAPHIC ON ANY STEP, AND THAT IS THE ANSWER RATHER THAN A GAP ─────
 *
 * `P1-J2-E005`. ZERO of five steps are built, so every graphic here would be a
 * picture of software that does not exist — the honesty test from `P1-J4-E015`,
 * applied to a page where it disqualifies everything.
 *
 * ⚠ TWO EXISTING SHOTS COME CLOSE AND BOTH WERE REJECTED, ON RECORD:
 *
 *   · `GetTheTalentShot` draws a package card with a published price and an agent
 *     with a monthly price — a picture of exactly the catalog that does not exist
 *     publicly. `decisions-01.md` 2026-08-21 ALSO records its agent byline as
 *     WRONG (*"Panameer's own, no provider to accept"* — dissolved).
 *   · `ServiceProductsShot` is the SELLER's view of their own products and is
 *     already `/hire-talent`'s step graphic. Re-pointing it at a buyer would be
 *     the same claim in a borrowed shell.
 *
 * ⚠ AN EMPTY PANEL BODY IS ALLOWED AND PRECEDENTED — `/optimize` ships two, and
 * `/find-work` ships four. `check:ui` asserts this page ships FIVE so nobody fills
 * one because a row "looks empty".
 *
 * ⚠ THIS PAGE IS NOT INSIDE `.pm-home` AT THIS POINT — the wrapper is around
 * `ErpPackages` ONLY — so the eyebrow is Tailwind mirroring `/optimize`'s computed
 * values: 19px / 700 / #d72cd6 / ls 2.66px / uppercase / lh 28.5px. Seventh
 * instance of that scoping trap; measured, not assumed.
 */
export function ShopSpine() {
  return (
    <>
      <section className="border-t border-line bg-white pb-[80px] pt-14 min-[900px]:pt-[72px]">
        <div className="mx-auto max-w-[1200px] px-8">
          <p className="font-body text-[19px] font-bold uppercase leading-[28.5px] tracking-[2.66px] text-magenta-ink">
            {SHOP_SPINE_HEADING}
          </p>
          {/*
            ⚠ NO TAGLINE UNDER THE EYEBROW, SAME AS `/find-work`. `/optimize` and
            `/learn` both promote a sentence into a display headline here and both
            are Scott's; he has not written one for Shop. Drafting it would put
            CC's words in the largest text on the page. ⚠ OUT OF SCOPE BY
            INSTRUCTION and reported as a gap, not filled.

            ⚠ `pb-[80px]` MATCHES `/optimize`'s measured 81px tagline-to-row-1 gap
            (`P1-J0-E319`), so the fifth spine does not repeat the spacing
            divergence `/learn` had.
          */}
        </div>
      </section>
      <StepDisclosures
        steps={SHOP_STEPS.map((step) => ({
          n: step.n,
          summary: step.summary,
          panel: (
            <>
              {/* ⚠ DERIVED, NEVER TYPED — `Step N - <label>` from `SHOP_STEPS`. */}
              <p className="font-body text-[19px] font-bold uppercase leading-[28.5px] tracking-[2.66px] text-magenta-ink">
                {`Step ${step.n} - ${step.summary}`}
              </p>
              {/* ⚠ `.stepd-h2` — the SHARED rule, so the five spines cannot drift
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
