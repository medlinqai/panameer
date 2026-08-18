import { P2P_DOMAINS } from "@/lib/assessment/questions-p2p";

/**
 * THE ASSESSMENT'S STEP LIST — the one definition of how long the thing is.
 *
 * ── WHY THIS IS ITS OWN MODULE AND NOT A CONST IN THE WIZARD ─────────────────
 *
 * It used to live inside `components/assessment/AssessmentWizard.tsx`, which is
 * a `"use client"` file. That was fine while the wizard was the only reader.
 * The marketing home now needs the same number — step 1's graphic on `/` shows
 * a progress counter, and a hand-typed "12" there is a claim about the product
 * that drifts the moment a ninth capability domain is added.
 *
 * ⚠ AND IT COULD NOT SIMPLY BE EXPORTED FROM THE WIZARD. Every export of a
 * `"use client"` module becomes a client REFERENCE when a Server Component
 * imports it — `stepsFor` would arrive as an opaque proxy and calling it during
 * a server render would throw. So the shared fact moves to a plain module that
 * both sides import, and neither owns.
 *
 * ── FIFTEEN STEPS, AND TEN OF THEM ARE GENERATED ─────────────────────────────
 *
 * Scott walked the old five-step version and filed ten errors, nine with one
 * cause: all the capability domains were asked on ONE screen. The deck answers it
 * with one screen per domain.
 *
 * ⚠ THE DOMAIN STEPS ARE DERIVED FROM `P2P_DOMAINS`, NOT LISTED. Adding an
 * eleventh domain to the bank adds an eleventh step, renumbers the wizard's
 * counter AND the marketing graphic, with no edit in either place. Listing them
 * twice is how a bank and a wizard come to disagree about how many questions
 * there are.
 *
 * ── ⚠ THE ORDER IS THE DECK'S, AND IT CHANGED (E036) ─────────────────────────
 *
 * `AI Maturity Assessment DESIGN 2026-08-18.pptx`, 15 slides:
 *
 *   slide 1       Select Your Process              -> `process`
 *   slides 2-11   ten capability domains           -> `cd_*`
 *   slide 12      Input Company Information        -> `basics`
 *   slide 13      Input Financial Information      -> `money`
 *   slide 14      Input Process-Specific Information -> `aimode`
 *   slide 15      Input Your Contact Information   -> `contact`
 *
 * It was `basics · money · process · …domains… · aimode · contact`. Process moves
 * from third to FIRST, and company/financial move from first/second to after the
 * domains. Nothing was added or removed to achieve that: `basics` and `money` were
 * already two separate steps, which already satisfied the deck's split of Company
 * Information from Financial Information.
 *
 * ⚠ `aimode` IS THE SLIDE-14 SLOT, AND THIS IS THE ONE PLACE THE CODE DOES NOT
 * FOLLOW THE DECK LITERALLY. The AI Mode question (Do It / Notify / Approve /
 * Delegate) appears NOWHERE in the deck — grepped all 15 slides. Slide 14 asks for
 * "a few process-specific details" and specifies no fields; its only unique content
 * is that heading. Deleting `aimode` to match the deck exactly would remove a LOCKED
 * decision (the maturity ladder x AI Mode axis) and the field the scoring model
 * stores, to replace it with a screen that has no specified content. So AI Mode
 * holds the slot, and the conflict is reported rather than resolved by guess.
 *
 * ⚠ FOUR SCREENS SIT BETWEEN THE LAST DOMAIN AND THE RESULT, which is where
 * drop-off concentrates. Chat flagged it and Scott kept it: a known trade, not a
 * defect.
 */
export const domainStepId = (key: string) => `cd_${key}` as const;

export const ALL_STEPS = [
  "process",
  ...P2P_DOMAINS.map((d) => domainStepId(d.key)),
  "basics",
  "money",
  "aimode",
  "contact",
] as const;

export type Step = (typeof ALL_STEPS)[number];

/**
 * ── SECTIONS, BECAUSE "1 OF 15" READS AS A CHORE ─────────────────────────────
 *
 * Scott: "I would use sections then, not domains as we are using that with the
 * CDs." Fifteen screens shown as a fifteenth of a bar is discouraging; five named
 * sections are not.
 *
 * ⚠ "SECTION", AND INSIDE SECTION 2 THE SUB-COUNTER IS BARE — `4 of 10`, NOT
 * "Domain 4 of 10". The word *domain* is reserved for capability domains and Scott
 * explicitly asked not to overload it.
 *
 * ⚠ THE MEMBERSHIP IS DERIVED FROM `ALL_STEPS`, not re-listed. Section 2 is
 * "every `cd_*` step", so an eleventh domain lands in it automatically and the
 * sub-counter becomes `x of 11` with no edit here.
 *
 * ⚠ THE DECK'S `1/15` … `15/15` MARKERS ARE SLIDE NUMBERS, NOT THE SPEC. They are
 * not rendered anywhere.
 */
export const SECTIONS = [
  { id: "process", name: "Select Your Process", steps: ["process"] },
  {
    id: "domains",
    name: "Capability Domains",
    steps: P2P_DOMAINS.map((d) => domainStepId(d.key)),
  },
  { id: "company", name: "Company Information", steps: ["basics"] },
  { id: "financial", name: "Financial Information", steps: ["money"] },
  /*
    Two screens, and the second one disappears for a signed-in visitor — see
    `stepsFor`. `sectionProgress` counts only the steps actually in the walk, so
    the sub-counter never promises a screen that will not come.
  */
  { id: "wrapup", name: "Process & Contact", steps: ["aimode", "contact"] },
] as const satisfies readonly { id: string; name: string; steps: readonly string[] }[];

/**
 * ── PUBLIC IS NOT THE SAME AS ANONYMOUS ──────────────────────────────────────
 *
 * The email step asks "where do we send the link?". For someone already signed
 * in the app knows, so the step is DROPPED rather than prefilled-and-shown: a
 * form field holding an answer the visitor cannot usefully change is a question
 * pretending to be a confirmation.
 *
 * FIFTEEN signed out, FOURTEEN signed in. A visitor reading the marketing page is
 * by definition logged out, so `stepsFor(null).length` is the honest number to put
 * in front of them.
 */
export const stepsFor = (signedInEmail: string | null): readonly Step[] =>
  signedInEmail ? ALL_STEPS.filter((s) => s !== "contact") : ALL_STEPS;

/** The domain a `cd_*` step is asking about, or null for the other five. */
export const domainForStep = (step: Step) =>
  P2P_DOMAINS.find((d) => domainStepId(d.key) === step) ?? null;

/**
 * Where a step sits in the five-section model, for the wizard's progress line.
 *
 * `sub` is non-null only where a section has more than one screen IN THIS WALK, so
 * the single-screen sections show no sub-counter and section 5 shows one only when
 * the contact step is actually coming.
 */
export const sectionProgress = (step: Step, steps: readonly Step[]) => {
  const i = SECTIONS.findIndex((sec) => (sec.steps as readonly string[]).includes(step));
  const sec = SECTIONS[i];
  /* only the screens that are really in this walk — see the note on `wrapup` */
  const inWalk = (sec.steps as readonly string[]).filter((s) => steps.includes(s as Step));
  const at = inWalk.indexOf(step) + 1;
  return {
    index: i + 1,
    total: SECTIONS.length,
    name: sec.name,
    label: `Section ${i + 1} of ${SECTIONS.length} · ${sec.name}`,
    sub: inWalk.length > 1 ? `${at} of ${inWalk.length}` : null,
  };
};
