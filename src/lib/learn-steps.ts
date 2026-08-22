/**
 * `/learn`'s FIVE STEPS — THE LABELS, AND ONLY THE LABELS (`P1-J0-E281`).
 *
 * ── ⚠ WHY THE STRINGS LIVE HERE AND NOT IN THE COMPONENT ────────────────────
 *
 * Exactly the reason `spine-steps.ts` gives for `summaryFor`: `check:ui` can
 * assert the rendered summaries against their SOURCE without importing React. A
 * guard that compares the page to a literal it typed itself proves only that
 * somebody typed the same thing twice.
 *
 * ⚠ THE PANELS ARE NOT HERE. They are React and they stay in `LearnPublic.tsx`,
 * keyed by `n`. This file must remain importable from a Playwright spec.
 *
 * ── ⚠ THESE FIVE ARE SCOTT'S, 2026-08-22, WITH ONE CASING FIX ───────────────
 *
 * He typed `Watch Each course` and `Connect to the instructor`; Title Case is
 * `conventions.md` and his standing instruction, recorded here so it does not
 * read as a rewrite.
 *
 * ⚠ STEP 2 IS `Meet Your Instructor`, NOT `Connect to the Instructor`, AND THAT
 * IS A PRODUCT-TRUTH DECISION, NOT A PREFERENCE. There is still no
 * `Conversation`, `Message` or `Thread` model in the schema, and `/messages`
 * ships a `disabled` composer reading *"Messaging isn't available yet"*. `Meet`
 * is what the product does today: teaching is recorded PER LESSON, most lessons
 * carry an `expert_person_id`, and real photos ship.
 *
 * ⚠⚠ THE LABEL BECOMES `Connect with Your Instructor` THE DAY CONNECTIONS SHIP.
 * One string, this one. `2. Claude Sub-Files/instructor_connections_spec.md` is
 * the spec. Do not build any of it from here.
 *
 * ⚠ STEP 5 IS AN INSTRUCTION THE LEARNER PERFORMS, NOT AN INTEGRATION. Panameer
 * posts nothing to LinkedIn; `deployment.md` records that LinkedIn's partner
 * programs are approval-gated. The copy must never imply otherwise.
 */

export type LearnStepLabel = {
  /** The drawn numeral, 1-based. */
  n: number;
  /** The always-visible disclosure row label. */
  summary: string;
};

export const LEARN_STEPS: LearnStepLabel[] = [
  { n: 1, summary: "Enroll in a Learning Path" },
  { n: 2, summary: "Meet Your Instructor" },
  /* ⚠ ONE ROW CARRIES TWO SECTIONS. `E283`: merging course and lesson collapses a
     level this page was built to teach. Deliberate, and the two blocks stay
     visibly separate INSIDE the panel so the hierarchy is still shown. */
  { n: 3, summary: "Watch Each Course and Its Lessons" },
  { n: 4, summary: "Take Certification Test" },
  { n: 5, summary: "Add Certification to LinkedIn and Resume" },
];

/** ⚠ THE SECTION HEADING ABOVE THE ROWS, NOT A ROW — same as `/optimize` (`E281`). */
export const LEARN_SPINE_HEADING = "Here’s How It Works";

/**
 * ⚠⚠ THE TAGLINE SHIPS AS ONE SENTENCE. SCOTT WROTE TWO, AND THE SECOND IS HELD.
 *
 * His string was: *"From Account Creation to Free Training in under 3 minutes.
 * Get certified for most learning paths, for free."*
 *
 * ⚠ `most` DID NOT SURVIVE A LIVE DB READ, which the brief required before the
 * word shipped. Measured 2026-08-21 against the live database:
 *
 *     LearningPath total                                23
 *     could carry a test (>= 2 lessons)              17/23  (74%)
 *     hold a LearnAssessment row at all                8/23  (35%)
 *     PUBLISHABLE (>= 5 valid questions)               7/23  (30%)
 *     PUBLISHED (a learner can sit it today)           0/23  (0%)
 *
 * `most` is true only of "could EVENTUALLY carry a test". On the reading a
 * visitor actually takes — *can I get certified in most paths* — it is 0%.
 *
 * ⚠ HELD BACK, NOT DROPPED, AND NOT SOFTENED. The brief forbids weakening it to
 * something vaguer, and this file already has the precedent: `P1-J3-E011`'s
 * *"Message your instructor from within the course"* is absent from the hero for
 * the same reason. The clause goes in unchanged the day the ratio is a majority.
 *
 * ⚠ ALSO GONE FROM SCOTT'S ORIGINAL: `within 24 hours`. `b5f3923` added a HUMAN
 * review gate, so a pass does not issue a credential until a person reviews it —
 * and there is no queue, no timer and no alert behind that number. It returns the
 * day a queue exists.
 */
export const LEARN_SPINE_TAGLINE =
  "From Account Creation to Free Training in under 3 minutes.";
