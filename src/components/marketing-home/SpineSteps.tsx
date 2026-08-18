import Image from "next/image";
import { SPINE_STEPS } from "@/lib/spine-steps";
import { SubmitToAI } from "@/components/marketing-home/SubmitToAI";
import { OptimizationDashboardShot } from "@/components/marketing-home/OptimizationDashboardShot";
import { AssessmentWizardShot } from "@/components/marketing-home/AssessmentWizardShot";
import { AiRoadmapShot } from "@/components/marketing-home/AiRoadmapShot";

/**
 * STEPS 2–5 OF THE SPINE — rendered from `lib/spine-steps.ts`.
 *
 * One section per entry, in order, between Step 1 (`ProcessPicker`) and
 * `GetTheTalent`. Nothing here knows how many steps there are; a sixth is a data
 * edit, which is the same rule the process cards follow.
 *
 * ── THE HEADING TREATMENT IS THE PAGE'S, NOT A NEW ONE ───────────────────────
 *
 * Same as `.hiw` and `.pp`, no exceptions: NO `text-wrap:balance` (the standing
 * rule in home.css), a 1040px cap, a 19px eyebrow scoped to this section, and the
 * shared `--sec-step` rhythm — 48px above the eyebrow, 24px to the title.
 *
 * ── ⚠ THE ALTERNATION IS INTENTIONALLY INERT (E158) ──────────────────────────
 *
 * Every band on `/` is now one colour, so `.spn.is-shade` resolves to exactly what
 * `.spn` does and the `s.n % 2 === 0` branch below changes nothing on screen.
 *
 * BOTH ARE KEPT ON PURPOSE — do not delete either. Scott is slimming these sections
 * and may want alternation back, and a live-but-inert branch with a comment is far
 * cheaper to revive than a deleted one is to rediscover. The derivation is also
 * still the correct shape if it does come back: computed from the step number, so
 * inserting a step cannot produce two shaded bands in a row, which is the E115
 * rhythm failure this page has had once already.
 *
 * ⚠ `graphic` IS A KEY, resolved by `GRAPHICS` below. All four steps now name a
 * built component; a `graphic` starting with `/` is still treated as an image path,
 * so a real screenshot drops in without touching this file. An EMPTY string still
 * renders nothing at all rather than an empty frame, which would read as a broken
 * image — that remains the behaviour for any future step added without art.
 */

/**
 * Key -> component. A step whose `graphic` matches a key here renders that
 * component; a `graphic` starting with `/` is treated as an image path instead,
 * so a screenshot drops in without touching this file's structure.
 */
const GRAPHICS: Record<string, () => React.JSX.Element> = {
  "assessment-wizard": AssessmentWizardShot,
  "submit-to-ai": SubmitToAI,
  "optimization-dashboard": OptimizationDashboardShot,
  "ai-roadmap": AiRoadmapShot,
};
export function SpineSteps() {
  return (
    <>
      {SPINE_STEPS.map((s) => (
        <section
          key={s.n}
          id={`spine-step-${s.n}`}
          /* Even-numbered steps take the shade. ⚠ Inert since E158 — the class
             resolves to the same colour as the base. Kept deliberately; see above. */
          className={"spn" + (s.n % 2 === 0 ? " is-shade" : "")}
        >
          <div className="wrap">
            <div className="eyebrow">{s.eyebrow}</div>
            <h2 className="spn-h2">{s.title}</h2>
            {/*
              The slot. Empty string = nothing rendered, not an empty box — a
              framed blank would read as a broken image.
            */}
            {(() => {
              if (!s.graphic) return null;
              const G = GRAPHICS[s.graphic];
              if (G) return <G />;
              /* Not a registered component, so it is an image path. */
              return (
                <div className="spn-art">
                  <Image
                    src={s.graphic}
                    alt=""
                    width={1200}
                    height={720}
                    sizes="(max-width: 1200px) 100vw, 1136px"
                  />
                </div>
              );
            })()}
          </div>
        </section>
      ))}
    </>
  );
}
