/**
 * ALL FIVE STEPS OF THE ASSESSMENT SPINE — one list, one component.
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
 * ── ⚠⚠ STEP 1 IS IN THIS LIST NOW (`P1-J0-E288`) ────────────────────────────
 *
 * Scott, 2026-08-24: *"all steps after the first are effectively 'grouped'. I
 * thought that should be corrected and consistent."* He was reading the code
 * correctly — this file used to open *"STEPS 2 THROUGH 5 ... Step 1 is NOT in this
 * list ... It is the exception, not the pattern"*, and `OptimizeSteps` hardcoded a
 * `STEP_ONE` const rendered as a separate `<li>` above the `.map`. One journey, two
 * mechanisms, which is the `E242` shape.
 *
 * ⚠ ITS GRAPHIC IS A REGISTRY KEY LIKE EVERY OTHER — `process-picker` resolves to
 * `<ProcessPicker />` through `StepGraphic`. That is what let the special case go:
 * the thing that made step 1 different was never its data, it was that its art was
 * a component nobody had put in the registry.
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
  /**
   * ── ⚠⚠ THE SHORT HANDLE — 3-4 WORDS, AND IT IS NOT DERIVED (`P1-J0-E286`) ──
   *
   * Scott, 2026-08-24: *"i am also thinking to create the steps (the top level
   * accordion that gets expanded) using 3-4 words only."* Closed, a reader should
   * get the whole sequence in one pass; `/optimize`'s rows ran to nine words.
   *
   * ── ⚠ WHY `summaryFor()` IS GONE, AND WHY THAT IS NOT ABANDONING ITS RULE ──
   *
   * This field replaced a function. The comment that stood on `summaryFor()` is
   * reproduced here rather than summarised, because a future reader finding a bare
   * string field WILL try to restore the derivation:
   *
   *   > `/optimize` renders these five steps as `<details>` rows whose summary is
   *   > the eyebrow WITHOUT its `Step N - ` prefix — the number is already drawn as
   *   > its own element beside the text, so leaving the prefix in would print it
   *   > twice: "1  Step 2 - Provide Capability Domain (Transaction-Level) Details".
   *   >
   *   > ⚠ IT LIVES BESIDE THE DATA, rather than in the component, so the guard can
   *   > assert the rendered summaries against their SOURCE without importing React.
   *   > A test that compares the page to a typed literal proves only that somebody
   *   > typed the same thing twice.
   *   >
   *   > ⚠ STRIPPED BY PATTERN, NOT BY SLICING A FIXED LENGTH — the eyebrows are
   *   > Scott's and their prefixes are not all the same width. Deliberately
   *   > forgiving: an eyebrow with no prefix passes through unchanged.
   *
   * ⚠⚠ THE RULE BEHIND IT — *"derive, don't retype"*, `E155` and `E242` — IS NOT
   * ABANDONED. THE REQUIREMENT CHANGED. A short HANDLE and a full EYEBROW are now
   * deliberately TWO DIFFERENT STRINGS with two different jobs, so derivation is no
   * longer the correct relationship between them: there is no rule that turns
   * "Submit Your Completed Assessment to Panameer's AI Platform (AIP)" into "Submit
   * to the AIP" without inventing the second one.
   *
   * ⚠ THE FIELD STILL LIVES BESIDE THE DATA for the other half of that reasoning —
   * `check:ui` asserts the rendered rows against THIS array without importing React.
   *
   * ⚠ NO `Step N - ` PREFIX HERE. The numeral is drawn as its own element beside the
   * text; a prefix would print it twice, which is what `summaryFor` existed to strip.
   */
  summary: string;
  /**
   * ⚠ VERBATIM. Rendered uppercase by CSS, so the casing here is title case.
   *
   * ⚠⚠ THIS IS NO LONGER WHAT THE ROW SHOWS, AND IT MUST STILL RENDER SOMEWHERE.
   * `summary` above is the row; this is the full string, and `/optimize` now prints
   * it as a lead line INSIDE the panel. That is not decoration — see `E275` in the
   * step-3 note below: shortening the row without moving the eyebrow into the panel
   * would introduce `AIP` in a label and expand it nowhere on the page, which is the
   * exact backwards state `E275` corrected.
   */
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
    /*
      ⚠⚠ STEP 1, WHICH USED TO BE A HARDCODED `STEP_ONE` CONST IN `OptimizeSteps`
      (`P1-J0-E288`). Its eyebrow and title are the strings that page already
      rendered; nothing here is new copy.

      ⚠ `graphic: "process-picker"` IS THE WHOLE FIX. `StepGraphic`'s registry now
      resolves that key to `<ProcessPicker />`, so step 1 carries its art the same
      way every other step does and `OptimizeSteps` is one `.map` over five.
    */
    n: 1,
    summary: "Select a Process",
    eyebrow: "Step 1 - Select a Business Process",
    /* ⚠ `ProcessPicker` CARRIES ITS OWN HEADING, so this title is the one string
       `/optimize` never rendered for step 1 and still does not — the panel prints
       the eyebrow and the picker. Kept because the field is required and because
       `SpineSteps` (if it is ever re-rendered) needs one. */
    title:
      "Pick the business process you want to assess — the questions follow from it.",
    graphic: "process-picker",
  },
  {
    n: 2,
    summary: "Answer by Domain",
    eyebrow: "Step 2 - Provide Capability Domain (Transaction-Level) Details",
    title:
      "Provide the processing methods for each capability domain within your business process.",
    /* Built as a component, not an image — see `SpineSteps`' registry. Its rung
       ladder is DERIVED from `lib/assessment/questions-p2p.ts`, so the art cannot
       drift from the ladder the assessment actually asks. */
    graphic: "assessment-wizard",
  },
  {
    n: 3,
    summary: "Submit to the AIP",
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
    /* ⚠ VERBATIM, Scott 2026-08-18 (E161). Was "Complete Assessment & Submit to
       AI" — the eyebrow now says AIP where it used to say AI, which makes the
       comment above MORE load-bearing, not less. The `title` below is unchanged. */
    eyebrow:
      "Step 3 - Submit Your Completed Assessment to Panameer's AI Platform (AIP)",
    title:
      /*
      ⚠ E275 — VERBATIM, Scott 2026-08-21, AND IT CLOSES THE BACKWARDS ACRONYM.

      E232 flipped this sentence to the conventional `AI Platform (AIP)` and left
      a real defect behind, flagged at the time: the eyebrow above read "…to our
      AIP", so the acronym was INTRODUCED in the label and EXPANDED in the
      sentence beneath it — backwards. The eyebrow now carries the expansion
      (`Panameer's AI Platform (AIP)`) and this sentence uses the short form. The
      order is right for the first time.

      ⚠ `your completed assessment`, NOT `your answers` — it names the thing being
      submitted rather than the act of answering, and it matches the eyebrow.

      ⚠ THE AIP CLAIM ITSELF IS UNCHANGED AND STAYS — a product named before it
      exists, deliberately, counsel-gate item 3. This re-word is not licence to
      revisit it.
    */
      "Provide your contact details and submit your completed assessment to the AIP.",
    /* Built as a component, not an image — see `SpineSteps`' registry. */
    graphic: "submit-to-ai",
  },
  {
    n: 4,
    summary: "Preview Your Savings",
    eyebrow:
      "Step 4 - Preview Your Solutions and Savings on the Optimization Dashboard",
    /**
     * ⚠ VERBATIM, Scott 2026-08-18 (E167). The previous wording — "See the AI
     * automation options possible and where your adoption stands in relation to your
     * industry." — survived only because chat approved this replacement and then
     * failed to write it into the brief that shipped the rest of the step.
     *
     * ⚠ "versus" matches the hero lede and the dashboard's own "Your Org Versus
     * Industry" — one word across all three.
     *
     * ⚠ "your industry", NEVER "peers" — STILL A CORRECTION TO WHAT SCOTT TYPED, and
     * it survives this rewrite. He wrote the "...peers" form. That word asserts a
     * surveyed comparison pool which does not exist (`HANDOFF_2026-08-16.md` §6 lists
     * it as an open claim), and he removed it once already before it crept back in.
     * "your industry" makes the same point without promising a benchmark we cannot
     * produce.
     */
    title:
      /*
      ⚠ E233 — VERBATIM, Scott 2026-08-20, and three details are deliberate:
        · `rank`, not `stand`;
        · the tail is `improve that ranking`, NOT `improve it` — *it* would attach
          to *your industry*;
        · `dramatically` was removed on Scott's own call and must not return.

      ⚠ "your industry", NEVER "peers" — still a correction to what Scott typed,
      and it survives this rewrite. That word asserts a surveyed comparison pool
      which does not exist.
    */
      "Follow the link in your email to see where you rank versus your industry and the solutions that improve that ranking.",
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
    summary: "Build Your Roadmap",
    eyebrow: "Step 5 - Collaborate with Our Experts to Build Your AI Roadmap",
    /**
     * ⚠ "1 year", NOT "3 year" — a correction, flagged.
     *
     * The dashboard sizes a YEAR-1 opportunity and the findings table quotes
     * 2–4 weeks per action, so a year of sequenced short deployments is
     * internally consistent. A 3-year roadmap printed beside a Year-1 number is
     * two different promises on one page.
     */
    title:
      /*
      ⚠ E234 — VERBATIM, Scott 2026-08-20.

      ⚠ `1-year`, HYPHENATED, AND NOT `3-year`. Unchanged reasoning: the dashboard
      sizes a YEAR-1 opportunity and the findings table quotes 2–4 weeks per
      action, so a 3-year roadmap printed beside a Year-1 number is two different
      promises on one page. ⚠ THE HERO SAYS "12-month roadmap" — three surfaces
      have to agree.

      ⚠ ALSO: `Roadmap` is CAPITALISED now, where this string had `roadmap`. That
      is the brief's own casing and it matches every other use on the page.
    */
      "This is where it comes together: an expert walks every solution with you, and you prioritize them into your 1-year AI Roadmap.",
    /* Built as a component, not an image — see `SpineSteps`' registry. It ships the
       TIMELINE view; the serpentine mockup is a second view that is not built. */
    graphic: "ai-roadmap",
  },
];

/*
  ── ⚠⚠ `summaryFor()` IS GONE (`P1-J0-E286`) ──────────────────────────────────

  It derived a row label from an eyebrow by stripping the `Step N - ` prefix. The
  rows are now 3-4 words that no rule can produce from the full eyebrow, so the
  derivation had nothing left to do and every caller was removed first.

  ⚠ ITS ENTIRE COMMENT BLOCK MOVED ONTO THE `summary` FIELD ABOVE — quoted, not
  summarised — precisely so nobody finds a bare string field and "restores" the
  derivation. Read that note before adding one back.
*/

/*
  ⚠⚠ `/optimize`'s CTA LABEL, DEFINED ONCE (`P1-ALL-E031`, 2026-08-26).

  ⚠ THE STRING DID NOT CHANGE — it is what `optimize/page.tsx` already passed as
  `ctaLabel`. It becomes a constant because Scott's APPROVED DESCRIPTION QUOTES IT,
  and a label quoted in prose beside the button it names is exactly how `/work`
  shipped two different strings on one screen (`P1-J4-E024`).
  ⚠ ONE CONVENTION with `TALENT_CTA_LABEL`, `WORK_CTA_LABEL`, `LEARN_CTA_LABEL`,
  `SHOP_CTA_LABEL` and `INTEGRATE_CTA_LABEL`. ⚠ IT LIVES HERE because this file
  already holds `/optimize`'s spine strings — no new `lib/` file per page.
  ⚠ `/` DOES NOT USE THIS. Its label is `HomeHero`'s default, `Take Our Free
  Assessment`, and Scott is handling HOME after this brief.
*/
export const OPTIMIZE_CTA_LABEL = "Start Your Free Optimization Assessment";

/*
  ⚠ SCOTT'S STRING AND HIS CASING, 2026-08-28 (`P1-J0-E352`): *"have it say
  'Capability Domain Assessment Explained'."* Shipped exactly — not sentence-cased,
  not shortened, no `›`.
  ⚠ ONE LIVE LITERAL. `P1-J4-E024` is the precedent and it is not theoretical:
  `/work` shipped two different strings for one button and they drifted apart.
  ⚠ IT LIVES BESIDE `OPTIMIZE_CTA_LABEL` because it labels the SECOND control in the
  same `/optimize` hero, and this file already holds that page's strings.
  ⚠ 38 CHARACTERS, one shy of `OPTIMIZE_CTA_LABEL`. MEASURED at 1440/1160/768/390 —
  the numbers are in the `E352` report. NO `whitespace-nowrap` was added anywhere.
*/
export const CAPABILITY_EXPLAINED_LABEL =
  "Capability Domain Assessment Explained";
