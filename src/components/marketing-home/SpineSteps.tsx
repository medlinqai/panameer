import Image from "next/image";
import { SPINE_STEPS } from "@/lib/spine-steps";
import { SubmitToAI } from "@/components/marketing-home/SubmitToAI";
import { OptimizationDashboardShot } from "@/components/marketing-home/OptimizationDashboardShot";
import { ProcessPicker } from "@/components/marketing-home/ProcessPicker";
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
 * ── BANDS ALTERNATE, AND THEY ARE DERIVED ────────────────────────────────────
 *
 * Step 1 (`.pp`) is white, so step 2 shades, step 3 is white, and so on. Derived
 * from the step number rather than hard-coded per section, so inserting a step
 * cannot produce two shaded bands in a row — the E115 rhythm failure this page
 * has already had once.
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
  /* ⚠ STEP 1's ART, REGISTERED (`P1-J0-E288`). It was the only step whose graphic
     was a component nobody had put in this registry — which is the whole reason
     step 1 was a special case in `OptimizeSteps`. Registering it is what let the
     special case go. */
  "process-picker": ProcessPicker,
  "assessment-wizard": AssessmentWizardShot,
  "submit-to-ai": SubmitToAI,
  "optimization-dashboard": OptimizationDashboardShot,
  "ai-roadmap": AiRoadmapShot,
};

/**
 * ── ⚠ THE ONE PLACE A `graphic` KEY BECOMES ART (P1-J0-E259) ─────────────────
 *
 * `/optimize` renders the same five steps as disclosure panels, and it resolves
 * its art through THIS function rather than keeping its own copy of the registry
 * above. That is the same rule that made `E155` correct: the art must not be able
 * to drift from the data. Two registries would drift the first time a screenshot
 * replaced a drawn component on one page and not the other.
 *
 * Empty string renders NOTHING — not an empty frame, which would read as a broken
 * image. A key the registry knows renders that component; anything starting with
 * `/` is an image path. All three behaviours live here, once.
 */
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
/**
 * ── ⚠⚠ THIS COMPONENT IS CURRENTLY RENDERED BY NOBODY ───────────────────────
 *
 * Verified 2026-08-24: nothing in `src/` imports `SpineSteps`. `brief_home_strip`
 * (`P1-J0-E298`) took it off `/` along with `HowItWorks` and `ProcessPicker`, and
 * `/optimize` uses `StepGraphic` from this file rather than this section. It stays
 * on disk under the `E164` rule — `brief_home_page` is queued to rebuild `/` and
 * this is the band it would rebuild from.
 *
 * ⚠ THE FILTER BELOW IS THEREFORE PRE-EMPTIVE, AND `P1-J0-E288`'s BRIEF ASKED FOR
 * IT AGAINST A PREMISE THAT HAS SINCE DISSOLVED. That brief said `/` renders
 * `<ProcessPicker />` standalone AND `<SpineSteps />`, so adding step 1 to
 * `SPINE_STEPS` would render the picker TWICE on `/`. ⚠ THAT CANNOT HAPPEN NOW:
 * `/` renders neither. Measured before the change — `.pp` count on `/` is ZERO.
 *
 * ⚠ IT SHIPPED ANYWAY BECAUSE THE HAZARD MOVED RATHER THAN VANISHED. Without it,
 * the day anybody re-renders this component they get step 1 as a full-width band
 * INSIDE another section's wrapper — and `#step-1` is an anchor target that
 * `HowItWorks`' cards point at. The filter makes that impossible instead of
 * conditional on whoever does the rebuild reading this file first.
 *
 * ⚠ IT IS TEMPORARY AND IT COLLAPSES IN `brief_home_page`, DELIBERATELY, not here
 * as a tidy-up: whoever rebuilds `/` decides where step 1 sits and removes this
 * line in the same commit.
 */
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
