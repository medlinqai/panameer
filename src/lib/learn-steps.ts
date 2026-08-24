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
  /*
    ⚠⚠ THIS REVERSES `Meet Your Instructor`, WHICH SCOTT SETTLED THE SAME MORNING,
    AND IT SHIPS BECAUSE THEY ARE BOTH HIS WORDS (`P1-J0-E296`, 2026-08-24).

    ⚠ NOTHING IN THE BUILD CHANGED IN BETWEEN. There is still no `Conversation`,
    `Message` or `Thread` model in the schema, and `/messages` still ships a
    `disabled` composer reading "Messaging isn't available yet" (`P1-J3-E014`).
    `Meet` was chosen that morning FOR THAT REASON — it named what the product
    does today, which is put the recording instructor's name and photo on every
    lesson.

    ⚠ HE ALSO DECIDED ON 2026-08-24 THAT CONNECTION SHOULD BE FREE AND OPEN
    (`connection_model_decision.md`) — which makes this label eventually true and
    NOT true now. A decision to allow connection is not a connection feature.

    ⚠ AND THE PAGE NOW MAKES THE CLAIM TWICE: the hero sub-copy says `connect with
    instructors` (`P1-J0-E290`). Both flagged, neither harmonised. Scott decides.

    ⚠ THE WORD IS AUTHORISED; THE VERB IS NOT. Do not read this label as licence to
    build messaging, connections, referrals or invites.
  */
  { n: 2, summary: "Connect with the Instructor" },
  /* ⚠ ONE ROW CARRIES TWO SECTIONS. `E283`: merging course and lesson collapses a
     level this page was built to teach. Deliberate, and the two blocks stay
     visibly separate INSIDE the panel so the hierarchy is still shown. */
  { n: 3, summary: "Watch the Courses and Lessons" },
  /* ⚠ THE EXCLAMATION MARK IS SCOTT'S AND IT IS THE ONLY ONE ON THE PAGE. It was
     already recorded as deliberate on the old step 4 and it survives `E296`. */
  { n: 4, summary: "Get Certified!" },
  /*
    ⚠⚠ THE PANEL UNDER THIS NO LONGER MATCHES THE LABEL, AND IT IS NOT FIXED HERE.

    `Tell Your Peers` is ADVOCACY. The panel is the old `What Do You Do After the
    Training` — *"Your certificate publishes to your profile, with a link you can
    put anywhere"* — which is about a CREDENTIAL, not about telling anyone. The
    previous label (`Add Certification to LinkedIn and Resume`) described the panel
    exactly; this one does not.

    ⚠ REPORTED, NOT RE-AUTHORED. `P1-J0-E296` says Scott decides whether the panel
    follows the label or the label returns.

    ⚠ AND NOTHING HERE MAY IMPLY PANAMEER TELLS ANYONE. `deployment.md`: LinkedIn's
    partner programs are approval-gated. There is no referral, share or invite
    feature anywhere in the schema — do not build one to justify the label.
  */
  { n: 5, summary: "Tell Your Peers" },
];

/*
  ⚠ NO TERMINAL PERIODS ON 1, 2, 3 OR 5, AND THAT IS A READING OF WHAT SCOTT TYPED
  RATHER THAN A CORRECTION OF IT. He wrote periods after 1-3, `!` after 4 and
  nothing after 5 — inconsistent as punctuation, which is what tells you it was
  PROSE punctuation in a sentence he was typing, not LABEL punctuation. Every
  other label on the site is unpunctuated (`conventions.md`). ⚠ `Get Certified!`
  KEEPS ITS EXCLAMATION because it is not sentence punctuation — it is emphasis,
  it is already recorded as deliberate, and it is the only one on the page.
*/

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
export const LEARN_SPINE_TAGLINE_LEAD = "From Account Creation to ";

/**
 * ⚠ THE STRESSED HALF, RENDERED IN `#efa3ee` AT WEIGHT 600 (`P1-J0-E295`).
 *
 * Scott, 2026-08-24: *"we should stress free and you can be learning in under 3
 * minutes."* Both of those live in this half, which is why the split falls here.
 *
 * ⚠ A SPAN INSIDE THE LINE, NOT THE WHOLE LINE. The whole line in pink would be a
 * second bridge line, and the page would then have two competing ones — the hero
 * already owns that treatment.
 *
 * ⚠ `free` IS THE ONE CLAIM ON THIS PAGE THAT IS UNCONDITIONALLY TRUE TODAY.
 * Every path, every course and every lesson is free; `P1-J3-E030` (0 of 23 paths
 * with a published test) constrains the TEST, not the training. So it is stressed
 * without qualification.
 *
 * ⚠ TWICE IS STRESS, THREE TIMES IS A SALES PAGE. The pink appears exactly twice
 * on `/learn` — the hero bridge line and this span. Do not add a third.
 */
export const LEARN_SPINE_TAGLINE_STRESS = "Free Training in under 3 minutes.";

/**
 * ⚠ THE WHOLE SENTENCE, DERIVED FROM ITS TWO HALVES so there is one source and the
 * guard can assert the rendered line without knowing where the span falls.
 *
 * ⚠⚠ SCOTT WROTE TWO SENTENCES AND THE SECOND IS STILL HELD.
 *
 * His string was: *"From Account Creation to Free Training in under 3 minutes. Get
 * certified for most learning paths, for free."*
 *
 * ⚠ `most` DID NOT SURVIVE A LIVE DB READ. Measured 2026-08-21:
 *
 *     LearningPath total                                23
 *     could carry a test (>= 2 lessons)              17/23  (74%)
 *     hold a LearnAssessment row at all                8/23  (35%)
 *     PUBLISHABLE (>= 5 valid questions)               7/23  (30%)
 *     PUBLISHED (a learner can sit it today)           0/23  (0%)
 *
 * `most` is true only of "could EVENTUALLY carry a test". On the reading a visitor
 * takes — *can I get certified in most paths* — it is 0%.
 *
 * ⚠ HELD BACK, NOT DROPPED, AND NOT SOFTENED. Same precedent as `P1-J3-E011`. The
 * clause goes in unchanged the day the ratio is a majority.
 *
 * ⚠ ALSO GONE FROM SCOTT'S ORIGINAL: `within 24 hours`. `b5f3923` added a HUMAN
 * review gate, so a pass does not issue a credential until a person reviews it —
 * and there is no queue, no timer and no alert behind that number.
 *
 * ⚠ `in under 3 minutes`, AND THE HERO NOW SAYS THE SAME. Scott typed `within 3
 * minutes` in the hero (`P1-J0-E290`) and `in under 3 minutes` here — two
 * phrasings of one claim on one page, which is `E243` exactly. `P1-J0-E295` picks
 * one; this is it, in both places.
 */
export const LEARN_SPINE_TAGLINE =
  LEARN_SPINE_TAGLINE_LEAD + LEARN_SPINE_TAGLINE_STRESS;
