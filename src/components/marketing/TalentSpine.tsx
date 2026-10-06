import type { ReactNode } from "react";
import { StepDisclosures } from "@/components/marketing/StepDisclosures";
import { PathProgressShot } from "@/components/learn/public/PathProgressShot";
import {
  ProviderProfileShot,
  ServiceProductsShot,
} from "@/components/marketing/talent-shots";
import { talentSteps, TALENT_SPINE_HEADING } from "@/lib/talent-steps";

const GRAPHICS: Record<number, ReactNode> = {
  1: <ProviderProfileShot />,
  2: <PathProgressShot />,
  /* 3 — none. No `Connection` model exists. */
  4: <ServiceProductsShot />,
  /* 5 — none. No buyer can browse or buy; the `(app)` browse routes are ComingSoon. */
};

export async function TalentSpine() {
  const TALENT_STEPS = await talentSteps();
  return (
    <>
      {}
      <section className="border-t border-line bg-white pb-[80px] pt-14 min-[900px]:pt-[72px]">
        <div className="mx-auto max-w-[1200px] px-8">
          <p className="font-body text-[19px] font-bold uppercase leading-[28.5px] tracking-[2.66px] text-magenta-ink">
            {TALENT_SPINE_HEADING}
          </p>
          {}
          <h2 className="mt-6 max-w-[1040px] text-wrap font-display text-[28px] font-bold leading-[1.14] tracking-[-0.5px] text-[#272334] min-[900px]:text-[34px] min-[900px]:leading-[38.76px]">
            Upload your resume to our AI Platform (AIP) and let it build your
            Panameer profile for you.
          </h2>
        </div>
      </section>
      <StepDisclosures
        steps={TALENT_STEPS.map((step) => ({
          n: step.n,
          summary: step.summary,
          panel: (
            <>
              {}
              <p className="font-body text-[19px] font-bold uppercase leading-[28.5px] tracking-[2.66px] text-magenta-ink">
                {`Step ${step.n} - ${step.summary}`}
              </p>
              <h2 className="stepd-h2">{step.description}</h2>
              {GRAPHICS[step.n]}
            </>
          ),
        }))}
      />
    </>
  );
}
