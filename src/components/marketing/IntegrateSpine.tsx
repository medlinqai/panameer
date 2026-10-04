import type { ReactNode } from "react";
import { StepDisclosures } from "@/components/marketing/StepDisclosures";
import { IntegrationModelDiagram } from "@/components/marketing/diagrams/IntegrationModelDiagram";
import { EHubbingDiagram } from "@/components/marketing/diagrams/EHubbingDiagram";
import {
  INTEGRATE_STEPS,
  INTEGRATE_SPINE_HEADING,
} from "@/lib/integrate-steps";

const GRAPHICS: Record<number, ReactNode> = {
  2: <IntegrationModelDiagram />,
  3: <EHubbingDiagram />,
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
          {}
          {}
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
              {}
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
