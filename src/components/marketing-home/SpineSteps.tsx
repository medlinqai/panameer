import Image from "next/image";
import { SPINE_STEPS } from "@/lib/spine-steps";
import { SubmitToAI } from "@/components/marketing-home/SubmitToAI";
import { OptimizationDashboardShot } from "@/components/marketing-home/OptimizationDashboardShot";
import { ProcessPicker } from "@/components/marketing-home/ProcessPicker";
import { AssessmentWizardShot } from "@/components/marketing-home/AssessmentWizardShot";
import { AiRoadmapShot } from "@/components/marketing-home/AiRoadmapShot";

const GRAPHICS: Record<string, () => React.JSX.Element> = {
  "process-picker": ProcessPicker,
  "assessment-wizard": AssessmentWizardShot,
  "submit-to-ai": SubmitToAI,
  "optimization-dashboard": OptimizationDashboardShot,
  "ai-roadmap": AiRoadmapShot,
};

export function StepGraphic({ graphic }: { graphic: string }) {
  if (!graphic) return null;
  const G = GRAPHICS[graphic];
  if (G) return <G />;
  /* Not a registered component, so it is an image path. */
  return (
    <div className="spn-art">
      <Image
        src={graphic}
        alt=""
        width={1200}
        height={720}
        sizes="(max-width: 1200px) 100vw, 1136px"
      />
    </div>
  );
}
export function SpineSteps() {
  return (
    <>
      {SPINE_STEPS.filter((s) => s.n > 1).map((s) => (
        <section
          key={s.n}
          id={`spine-step-${s.n}`}
          /* Even-numbered steps take the shade; step 1 above is white. */
          className={"spn" + (s.n % 2 === 0 ? " is-shade" : "")}
        >
          <div className="wrap">
            <div className="eyebrow">{s.eyebrow}</div>
            <h2 className="spn-h2">{s.title}</h2>
            {/*
              The slot. Empty string = nothing rendered, not an empty box — a
              framed blank would read as a broken image.
            */}
            <StepGraphic graphic={s.graphic} />
          </div>
        </section>
      ))}
    </>
  );
}
