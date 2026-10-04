
export type LearnStepLabel = {
  /** The drawn numeral, 1-based. */
  n: number;
  /** The always-visible disclosure row label. */
  summary: string;
  handle?: string;
};

export const LEARN_STEPS: LearnStepLabel[] = [
  { n: 1, summary: "Enroll in a Learning Path", handle: "Paths" },
  { n: 2, summary: "Connect with the Instructor" },
  { n: 3, summary: "Watch the Courses and Lessons", handle: "Courses" },
  { n: 4, summary: "Get Certified!", handle: "My learning" },
  {
    n: 5,
    summary: "Get Expert Support",
  },
];

export const LEARN_SPINE_HEADING = "Here’s How It Works";

export const LEARN_CTA_LABEL = "Start Learning for Free";

export const LEARN_ENROLL_CTA = "Enroll Now";

export const LEARN_SPINE_TAGLINE =
  "From courses to certification in hours, with the support of the community forever.";
