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
 * ── SIXTEEN STEPS, AND TEN OF THEM ARE GENERATED ─────────────────────────────
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
 *   slide 14      Input Process Information        -> `process_detail`
 *   slide 15      Input Your Contact Information   -> `contact`
 *   (no slide)    the AI Mode question             -> `aimode`
 *
 * It was `basics · money · process · …domains… · aimode · contact`. Process moves
 * from third to FIRST, and company/financial move from first/second to after the
 * domains. Nothing was added or removed to achieve that: `basics` and `money` were
 * already two separate steps, which already satisfied the deck's split of Company
 * Information from Financial Information.
 *
 * ⚠ SLIDE 14 IS `process_detail`, NOT `aimode` — SCOTT RULED (E038): "SLIDE 14 IS
 * NOT RELATED TO AI MODE." An earlier pass had AI Mode holding that slot because the
 * deck has no AI Mode screen at all; it turned out the slot belonged to three
 * questions that were sharing the `money` screen.
 *
 * THE SPLIT TEST IS "WOULD THIS ANSWER CHANGE FOR A DIFFERENT PROCESS?" `spendBand`,
 * `costLeverBand` and `headcountBand` are all about Procure-to-Pay — spend with
 * outside suppliers, share on negotiated contracts, people supporting purchasing.
 * `revenueBand` and `ebitdaBand` are about the COMPANY and would be identical on an
 * Order-to-Cash assessment. That is what "process-specific" means, and it is why the
 * split survives adding a second process rather than needing redoing.
 *
 * ⚠ `aimode` STAYS AND STILL HAS NO DECK SLIDE. It is a locked decision and a field
 * scoring stores; Scott has confirmed it is simply ABSENT from the deck rather than
 * replaced by it. So the walk is one screen longer than the deck is slides.
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
  "process_detail",
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
    THREE screens since E038, and the last one disappears for a signed-in visitor —
    see `stepsFor`. `sectionProgress` counts only the steps actually in the walk, so
    the sub-counter reads "1 of 3 … 3 of 3" signed out and "1 of 2 … 2 of 2" signed
    in, and never promises a screen that will not come.
  */
  {
    id: "wrapup",
    name: "Process & Contact",
    steps: ["process_detail", "aimode", "contact"],
  },
] as const satisfies readonly { id: string; name: string; steps: readonly string[] }[];

/**
 * ── PUBLIC IS NOT THE SAME AS ANONYMOUS ──────────────────────────────────────
 *
 * The email step asks "where do we send the link?". For someone already signed
 * in the app knows, so the step is DROPPED rather than prefilled-and-shown: a
 * form field holding an answer the visitor cannot usefully change is a question
 * pretending to be a confirmation.
 *
 * SIXTEEN signed out, FIFTEEN signed in. A visitor reading the marketing page is
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
