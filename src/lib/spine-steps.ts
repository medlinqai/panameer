
export type SpineStep = {
  /** 1-based step number, used for the id and the eyebrow. */
  n: number;
  summary: string;
  eyebrow: string;
  title: string;
  graphic: string;
};

export const SPINE_STEPS: SpineStep[] = [
  {
    n: 1,
    summary: "Select a Process",
    eyebrow: "Step 1 - Select a Business Process",
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
    graphic: "assessment-wizard",
  },
  {
    n: 3,
    summary: "Submit to the AIP",
    eyebrow:
      "Step 3 - Submit Your Completed Assessment to Panameer's AI Platform (AIP)",
    title:
      "Provide your contact details and submit your completed assessment to the AIP.",
    /* Built as a component, not an image — see `SpineSteps`' registry. */
    graphic: "submit-to-ai",
  },
  {
    n: 4,
    summary: "Preview Your Savings",
    eyebrow:
      "Step 4 - Preview Your Solutions and Savings on the Optimization Dashboard",
    title:
      "Follow the link in your email to see where you rank versus your industry and the solutions that improve that ranking.",
    graphic: "optimization-dashboard",
  },
  {
    n: 5,
    summary: "Build Your Roadmap",
    eyebrow: "Step 5 - Collaborate with Our Experts to Build Your AI Roadmap",
    title:
      "This is where it comes together: an expert walks every solution with you, and you prioritize them into your 1-year AI Roadmap.",
    graphic: "ai-roadmap",
  },
];

export const OPTIMIZE_CTA_LABEL = "Start Your Free Optimization Assessment";

export const CAPABILITY_EXPLAINED_LABEL =
  "Capability Domain Assessment Explained";
