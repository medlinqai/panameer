import { P2P_DOMAINS } from "@/lib/assessment/questions-p2p";

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
