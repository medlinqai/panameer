
export type IntegrateStepLabel = {
  /** The drawn numeral, 1-based. */
  n: number;
  summary: string;
  description: string;
};

export const INTEGRATE_STEPS: IntegrateStepLabel[] = [
  {
    n: 1,
    summary: "Connect Your ERP",
    description:
      "cXML, APIs or email — the technologies your procurement team already runs. Minutes, not months.",
  },
  {
    n: 2,
    summary: "Punch Out for Talent & Services",
    description:
      "Buy talent and services from inside a requisition, without leaving your system of record.",
  },
  {
    n: 3,
    summary: "Route Every PO Through Panameer",
    description:
      "Not just Panameer's. Every purchase order you raise, through one channel.",
  },
  {
    n: 4,
    summary: "We Transmit to Any Supplier",
    description:
      "Your suppliers receive them however they already work — no integration of their own required.",
  },
  {
    n: 5,
    summary: "Agents Run on Your Own Data",
    description:
      "Analytics, deployable assets and process agents, running on your own transaction history.",
  },
];

export const INTEGRATE_SPINE_HEADING = "Here's How It Works";

export const INTEGRATE_CTA_LABEL = "How We Integrate";
