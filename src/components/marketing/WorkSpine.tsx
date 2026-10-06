import type { ReactNode } from "react";
import { StepDisclosures } from "@/components/marketing/StepDisclosures";
import { WorkRequestDraftShot } from "@/components/marketing/work-shots";
import { WORK_STEPS, WORK_SPINE_HEADING } from "@/lib/work-steps";

const GRAPHICS: Record<number, ReactNode> = {
  1: <WorkRequestDraftShot />,
};

export function WorkSpine() {
  return (
    <>
      <section className="border-t border-line bg-white pb-[80px] pt-14 min-[900px]:pt-[72px]">
        <div className="mx-auto max-w-[1200px] px-8">
          <p className="font-body text-[19px] font-bold uppercase leading-[28.5px] tracking-[2.66px] text-magenta-ink">
            {WORK_SPINE_HEADING}
          </p>
          {}
          <h2 className="mt-6 max-w-[1040px] text-wrap font-display text-[28px] font-bold leading-[1.14] tracking-[-0.5px] text-ink min-[900px]:text-[34px] min-[900px]:leading-[38.76px]">
            From a job description to a signed work order &mdash; on one
            contract, with no employment risk.
          </h2>
        </div>
      </section>
      <StepDisclosures
        steps={WORK_STEPS.map((step) => ({
          n: step.n,
          summary: step.summary,
          panel: (
            <>
              {}
              <p className="font-body text-[19px] font-bold uppercase leading-[28.5px] tracking-[2.66px] text-magenta-ink">
                {`Step ${step.n} - ${step.summary}`}
              </p>
              {/* apart on panel type. */}
              <h2 className="stepd-h2">{step.description}</h2>
              {GRAPHICS[step.n]}
            </>
          ),
        }))}
      />
    </>
  );
}
