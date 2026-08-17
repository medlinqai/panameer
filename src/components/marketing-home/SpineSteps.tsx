import Image from "next/image";
import { SPINE_STEPS } from "@/lib/spine-steps";
import { SubmitToAI } from "@/components/marketing-home/SubmitToAI";
import { OptimizationDashboardShot } from "@/components/marketing-home/OptimizationDashboardShot";

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
 * ⚠ NO PLACEHOLDERS. `graphic` is a KEY, resolved by `GRAPHICS` below. Steps 3
 * and 4 name built components; steps 2 and 5 are empty and render NOTHING — not
 * an empty frame, which would read as a broken image. Scott is sourcing those two
 * from his deck.
 */

/**
 * Key -> component. A step whose `graphic` matches a key here renders that
 * component; a `graphic` starting with `/` is treated as an image path instead,
 * so a screenshot drops in without touching this file's structure.
 */
const GRAPHICS: Record<string, () => React.JSX.Element> = {
  "submit-to-ai": SubmitToAI,
  "optimization-dashboard": OptimizationDashboardShot,
};
export function SpineSteps() {
  return (
    <>
      {SPINE_STEPS.map((s) => (
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
