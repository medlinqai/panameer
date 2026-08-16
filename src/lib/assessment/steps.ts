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
 * ── THIRTEEN STEPS, AND EIGHT OF THEM ARE GENERATED ──────────────────────────
 *
 * Scott walked the old five-step version and filed ten errors, nine with one
 * cause: all eight capability domains were asked on ONE screen. The deck
 * answers it with one screen per domain.
 *
 * ⚠ THE DOMAIN STEPS ARE DERIVED FROM `P2P_DOMAINS`, NOT LISTED. Adding a ninth
 * domain to the bank adds a ninth step, renumbers the wizard's counter AND the
 * marketing graphic, with no edit in either place. Listing them twice is how a
 * bank and a wizard come to disagree about how many questions there are.
 */
export const domainStepId = (key: string) => `cd_${key}` as const;

export const ALL_STEPS = [
  "basics",
  "money",
  "process",
  ...P2P_DOMAINS.map((d) => domainStepId(d.key)),
  "aimode",
  "contact",
] as const;

export type Step = (typeof ALL_STEPS)[number];

/**
 * ── PUBLIC IS NOT THE SAME AS ANONYMOUS ──────────────────────────────────────
 *
 * The email step asks "where do we send the link?". For someone already signed
 * in the app knows, so the step is DROPPED rather than prefilled-and-shown: a
 * form field holding an answer the visitor cannot usefully change is a question
 * pretending to be a confirmation.
 *
 * THIRTEEN signed out, TWELVE signed in. A visitor reading the marketing page
 * is by definition logged out, so `stepsFor(null).length` is the honest number
 * to put in front of them.
 */
export const stepsFor = (signedInEmail: string | null): readonly Step[] =>
  signedInEmail ? ALL_STEPS.filter((s) => s !== "contact") : ALL_STEPS;

/** The domain a `cd_*` step is asking about, or null for the other five. */
export const domainForStep = (step: Step) =>
  P2P_DOMAINS.find((d) => domainStepId(d.key) === step) ?? null;
