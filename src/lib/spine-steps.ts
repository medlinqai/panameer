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
 * ── ⚠ `graphic` SHIPS EMPTY ON ALL FOUR, ON PURPOSE ──────────────────────────
 *
 * Images are out of scope for this brief. Scott is capturing real product
 * screenshots — the wizard for steps 1–3, the report dashboard for step 4 — and
 * they land later. An empty string renders NO graphic and NO placeholder: a
 * drawn stand-in would be a picture of a product that does not look like that,
 * and it would have to be un-drawn later. The field is the seam that makes the
 * real capture a one-line data edit.
 */

export type SpineStep = {
  /** 1-based step number, used for the id and the eyebrow. */
  n: number;
  /** ⚠ VERBATIM. Rendered uppercase by CSS, so the casing here is title case. */
  eyebrow: string;
  title: string;
  /**
   * Path to a real screenshot. Empty = render nothing at all.
   * ⚠ Do NOT put a placeholder here. See the note above.
   */
  graphic: string;
};

export const SPINE_STEPS: SpineStep[] = [
  {
    n: 2,
    eyebrow: "Step 2 - Provide Capability Domain Details",
    title:
      "Provide the processing methods for each capability domain within your business process.",
    graphic: "",
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
    graphic: "",
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
    graphic: "",
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
    graphic: "",
  },
];
