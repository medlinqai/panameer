
import { getCatalogCounts } from "@/lib/learn-catalog-counts";

const countIn = (counts: { key: string; value: string }[], key: string): string => {
  const hit = counts.find((c) => c.key === key);
  if (!hit) throw new Error(`talent-steps: no catalog count keyed "${key}"`);
  return hit.value;
};

export const TALENT_CTA_LABEL = "Create My Profile";

export type TalentStepLabel = {
  /** The drawn numeral, 1-based. */
  n: number;
  summary: string;
  description: string;
};

export async function talentSteps(): Promise<TalentStepLabel[]> {
  const counts = await getCatalogCounts();
  const count = (label: string) => countIn(counts, label);
  return [
  {
    n: 1,
    summary: TALENT_CTA_LABEL,
    description:
      "Create a free account and your profile builds itself from your work history — the systems you ran, how deep, how recently.",
  },
  {
    n: 2,
    summary: "Learn New Skills",
    description: `Work through the catalog for free — ${count("paths")} paths you can start today, ${count("courses")} courses with video and ${count("lessons")} lessons you can watch, taught by the people who implement this software.`,
  },
  {
    n: 3,
    summary: "Connect with Experts",
    // DRAFT — CC's words, not Scott's — AND UNBACKED. THIS IS THE MOST
    description:
      "Follow the experts who teach the software you work in — connection here is free and open to everyone, with no credits and no approval queue.",
  },
  // the hero lockup's `Learn. Connect. Create. Settle.` — WRONG, that is the SAME
  {
    n: 4,
    summary: "Create Service Products",
    // DRAFT — CC's words, not Scott's.
    description:
      "Package what you do into something sellable — your hours, a fixed-scope deliverable, or an agent that runs on its own.",
  },
  // THE SHARPEST AUDIENCE DEFINITION ON THE SITE, and the first public surface
  {
    n: 5,
    summary: "Sell Direct to Oracle Licensees",
    // DRAFT — CC's words, not Scott's — AND HALF-UNBACKED. THE SHELF EXISTS
    description:
      "Put your products in front of the organizations running Oracle — searchable by the systems you actually know, with nobody in between.",
  },
  ];
}

/** WHAT IS ACTUALLY BUILT BEHIND EACH STEP. Verified 2026-08-24; do not soften. */
export const TALENT_SPINE_HEADING = "Here's How It Works";
