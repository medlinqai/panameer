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

/** SECTIONS, BECAUSE "1 OF 15" READS AS A CHORE */
export const SECTIONS = [
  { id: "process", name: "Select Your Process", steps: ["process"] },
  {
    id: "domains",
    name: "Capability Domains",
    steps: P2P_DOMAINS.map((d) => domainStepId(d.key)),
  },
  { id: "company", name: "Company Information", steps: ["basics"] },
  { id: "financial", name: "Financial Information", steps: ["money"] },
  // THREE screens since E038, and the last one disappears for a signed-in visitor —
  {
    id: "wrapup",
    name: "Process & Contact",
    steps: ["process_detail", "aimode", "contact"],
  },
] as const satisfies readonly { id: string; name: string; steps: readonly string[] }[];

/** PUBLIC IS NOT THE SAME AS ANONYMOUS */
export const stepsFor = (signedInEmail: string | null): readonly Step[] =>
  signedInEmail ? ALL_STEPS.filter((s) => s !== "contact") : ALL_STEPS;

/** The domain a `cd_*` step is asking about, or null for the other five. */
export const domainForStep = (step: Step) =>
  P2P_DOMAINS.find((d) => domainStepId(d.key) === step) ?? null;

/** Where a step sits in the five-section model, for the wizard's progress line. */
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
