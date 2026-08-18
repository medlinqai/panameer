/**
 * STEPS 2 THROUGH 5 OF THE HOME SPINE — one list, one component.
 *
 * ── WHY THIS IS DATA AND NOT FOUR COMPONENTS ─────────────────────────────────
 *
 * These four sections are identical in shape: a numbered eyebrow, a title, and a
 * slot for a product screenshot. Four near-identical files is four places for
 * one of them to drift, and Scott has already named that cost once, about the
 * process cards: *"when I am creating the cards... I will have to come back and
 * redo this again."* Adding a sixth step, or dropping a screenshot into an
 * existing one, is an edit here and nothing else.
 *
 * Step 1 is NOT in this list — it is `ProcessPicker`, which carries the four
 * process cards and has a different shape. It is the exception, not the pattern.
 *
 * ── ⚠ AN EMPTY `graphic` RENDERS NOTHING, AND THAT IS THE POINT ───────────────
 *
 * Steps 2 and 5 still ship empty; Scott is capturing those from the wizard. An
 * empty string renders NO graphic and NO placeholder: a drawn stand-in would be a
 * picture of a product that does not look like that, and it would have to be
 * un-drawn later. The field is the seam that makes the real capture a one-line
 * data edit.
 *
 * Steps 3 and 4 name BUILT COMPONENTS instead of screenshots — approved drawings
 * of a funnel and of the report dashboard. That is not a placeholder: an approved
 * drawing is honestly a drawing, where a stale screenshot claims to be the thing.
 */

export type SpineStep = {
  /** 1-based step number, used for the id and the eyebrow. */
  n: number;
  /** ⚠ VERBATIM. Rendered uppercase by CSS, so the casing here is title case. */
  eyebrow: string;
  title: string;
  /**
   * WHICH GRAPHIC THIS STEP RENDERS, as a key. Empty = render nothing at all.
   *
   * `SpineSteps` resolves the key against a registry, so a built COMPONENT and a
   * future screenshot are referenced identically from here: a key that the
   * registry knows renders that component; a value starting with `/` renders the
   * image at that path.
   *
   * ⚠ Do NOT put a placeholder here. See the note at the top of the file.
   */
  graphic: string;
};

export const SPINE_STEPS: SpineStep[] = [
  {
    n: 2,
    eyebrow: "Step 2 - Provide Capability Domain Details",
    title:
      "Provide the processing methods for each capability domain within your business process.",
    /* Built as a component, not an image — see `SpineSteps`' registry. Its rung
       ladder is DERIVED from `lib/assessment/questions-p2p.ts`, so the art cannot
       drift from the ladder the assessment actually asks. */
    graphic: "assessment-wizard",
  },
  {
    n: 3,
    /**
     * ⚠ FIRST REFERENCE TO THE AIP ANYWHERE IN THE APP.
     *
     * Spelled AIP, all caps, expanded on first use exactly as written. It is the
     * platform behind customer data capture, the data models for Oracle clients,
     * and surfaces like services punch-out.
     *
     * ⚠ IT IS LARGELY UNBUILT — a product named before it exists, the same class
     * of claim as the rung-4 agent names, the tax-savings figure and the Oracle
     * mark. Scott is doing this deliberately; it belongs on the pre-launch review
     * list with the others. Do not soften it and do not remove it.
     */
    eyebrow: "Step 3 - Complete Assessment & Submit to AI",
    title:
      "Answer all of the questions on the assessment and submit it to the Panameer AIP (AI Platform).",
    /* Built as a component, not an image — see `SpineSteps`' registry. */
    graphic: "submit-to-ai",
  },
  {
    n: 4,
    eyebrow: "Step 4 - Check Out Your Optimization Dashboard",
    /**
     * ⚠ "your industry" — A CORRECTION TO WHAT SCOTT TYPED, FLAGGED.
     *
     * He wrote the "...peers" form. That word asserts a surveyed comparison pool
     * which does not exist (`HANDOFF_2026-08-16.md` §6 lists it as an open
     * claim), and he removed it once already before it crept back in. "your
     * industry" makes the same point without promising a benchmark we cannot
     * produce.
     */
    title:
      "See the AI automation options possible and where your adoption stands in relation to your industry.",
    /*
     * Built as a component, not an image — see `SpineSteps`' registry. It DRAWS
     * the report dashboard rather than importing it: every figure in it is
     * marketing art on the counsel-gate list, and the real surface is still
     * moving.
     */
    graphic: "optimization-dashboard",
  },
  {
    n: 5,
    eyebrow: "Step 5 - Build Your AI Roadmap with the Expert",
    /**
     * ⚠ "1 year", NOT "3 year" — a correction, flagged.
     *
     * The dashboard sizes a YEAR-1 opportunity and the findings table quotes
     * 2–4 weeks per action, so a year of sequenced short deployments is
     * internally consistent. A 3-year roadmap printed beside a Year-1 number is
     * two different promises on one page.
     */
    title:
      "Walk through each of the options available, define your organization's requirements and priorities, and build your 1 year AI roadmap together.",
    /* Built as a component, not an image — see `SpineSteps`' registry. It ships the
       TIMELINE view; the serpentine mockup is a second view that is not built. */
    graphic: "ai-roadmap",
  },
];
