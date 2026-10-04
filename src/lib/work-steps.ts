
export const WORK_CTA_LABEL = "Create a Work Request";

export type WorkStepLabel = {
  /** The drawn numeral, 1-based. */
  n: number;
  summary: string;
  description: string;
};

export const WORK_STEPS: WorkStepLabel[] = [
  {
    n: 1,
    summary: "Create Work Request",
    description:
      "Paste a job description and the AIP drafts the request for you — title, dates, budget and location — or answer seven short questions instead.",
  },
  {
    n: 2,
    summary: "Accept Proposal",
    description:
      "Experts respond with a price, either bid against your request or offered from a published rate, and you accept one.",
  },
  {
    n: 3,
    summary: "Release Work Order",
    description:
      "The accepted price becomes the work order — the single agreement every timesheet, deliverable and payment is measured against.",
  },
  {
    n: 4,
    summary: "Approve Settlement Request",
    description:
      "Work is claimed against that order on one of three bases — hours on a timesheet, a delivered milestone, or a recurring SOW — and you approve it.",
  },
  {
    n: 5,
    summary: "Pay Panameer",
    description:
      "An approved request becomes one invoice from Panameer, whoever did the work and however many of them there were.",
  },
];

export const WORK_SPINE_HEADING = "Here's How It Works";
