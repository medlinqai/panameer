import { SPINE_STEPS } from "@/lib/spine-steps";
import { StepDisclosures } from "@/components/marketing/StepDisclosures";
import { StepGraphic } from "@/components/marketing-home/SpineSteps";

export function OptimizeSteps() {
  return (
    <StepDisclosures
      steps={SPINE_STEPS.map((s) => ({
        n: s.n,
        summary: s.summary,
        panel: (
          <>
            {}
            <p className="mb-3 font-body text-[19px] font-bold uppercase leading-[28.5px] tracking-[2.66px] text-magenta-ink">
              {s.eyebrow}
            </p>
            {}
            {s.n > 1 && <h2 className="stepd-h2">{s.title}</h2>}
            <StepGraphic graphic={s.graphic} />
          </>
        ),
      }))}
    />
  );
}
